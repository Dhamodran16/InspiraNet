const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // userId -> socket object
    this.userRooms = new Map(); // userId -> array of room names
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
          return next(new Error('Authentication error: Invalid token'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.user.name} (${socket.userId}) - Type: ${socket.user.type}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      this.userSockets.set(socket.userId, socket);
      this.userRooms.set(socket.userId, []);

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);
      this.userRooms.get(socket.userId).push(`user_${socket.userId}`);

      // Join user to type-specific rooms
      socket.join(`type_${socket.user.type}`);
      this.userRooms.get(socket.userId).push(`type_${socket.user.type}`);

      // Join user to department-specific room if applicable
      if (socket.user.department) {
        socket.join(`dept_${socket.user.department}`);
        this.userRooms.get(socket.userId).push(`dept_${socket.user.department}`);
      }

      // Join user to batch-specific room if applicable
      if (socket.user.batch) {
        socket.join(`batch_${socket.user.batch}`);
        this.userRooms.get(socket.userId).push(`batch_${socket.user.batch}`);
      }

      // Handle user online status
      this.broadcastUserStatus(socket.userId, 'online');

      // Handle joining conversations
      socket.on('join_conversations', async (conversationIds) => {
        try {
          for (const conversationId of conversationIds) {
            socket.join(`conversation_${conversationId}`);
            this.userRooms.get(socket.userId).push(`conversation_${conversationId}`);
          }
          console.log(`User ${socket.user.name} joined conversations:`, conversationIds);
        } catch (error) {
          console.error('Error joining conversations:', error);
        }
      });

      // Handle sending messages
      socket.on('send_message', async (data) => {
        try {
          const { conversationId, content, messageType = 'text', mediaUrl = null } = data;
          
          // Create new message
          const message = new Message({
            conversationId,
            senderId: socket.userId,
            senderName: socket.user.name,
            content,
            messageType,
            mediaUrl
          });

          await message.save();

          // Update conversation
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            conversation.lastMessage = message._id;
            conversation.lastMessageContent = content;
            conversation.lastMessageTime = new Date();
            
            // Increment unread count for other participants
            for (const participantId of conversation.participants) {
              if (participantId.toString() !== socket.userId) {
                await conversation.incrementUnreadForUser(participantId);
              }
            }
            
            await conversation.save();
          }

          // Broadcast message to conversation room
          const messageData = {
            _id: message._id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            senderName: message.senderName,
            content: message.content,
            messageType: message.messageType,
            mediaUrl: message.mediaUrl,
            isRead: message.isRead,
            createdAt: message.createdAt,
            timeAgo: message.timeAgo
          };

          this.io.to(`conversation_${conversationId}`).emit('new_message', messageData);

          // Send notification to offline users
          this.sendMessageNotification(conversationId, messageData);

        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (conversationId) => {
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          userName: socket.user.name,
          conversationId
        });
      });

      socket.on('typing_stop', (conversationId) => {
        socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
          userId: socket.userId,
          conversationId
        });
      });

      // Handle message read status
      socket.on('mark_as_read', async (data) => {
        try {
          const { conversationId, messageIds } = data;
          
          // Mark messages as read
          await Message.updateMany(
            { _id: { $in: messageIds }, senderId: { $ne: socket.userId } },
            { 
              $addToSet: { 
                readBy: { 
                  userId: socket.userId, 
                  readAt: new Date() 
                } 
              },
              isRead: true
            }
          );

          // Update conversation unread count
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            await conversation.markAsReadForUser(socket.userId);
          }

          // Notify other participants
          socket.to(`conversation_${conversationId}`).emit('messages_read', {
            userId: socket.userId,
            conversationId,
            messageIds
          });

        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      // Handle follow/unfollow events
      socket.on('follow_user', async (data) => {
        try {
          const { targetUserId } = data;
          
          // Broadcast follow event to relevant users
          this.io.to(`user_${targetUserId}`).emit('new_follower', {
            followerId: socket.userId,
            followerName: socket.user.name,
            followerType: socket.user.type,
            timestamp: new Date()
          });

          // Update user stats in real-time
          this.broadcastUserStatsUpdate(socket.userId);
          this.broadcastUserStatsUpdate(targetUserId);

        } catch (error) {
          console.error('Error handling follow event:', error);
        }
      });

      // Handle post creation
      socket.on('post_created', async (data) => {
        try {
          const { postId } = data;
          
          // Broadcast new post to relevant users based on user type and department
          const post = await Post.findById(postId).populate('author', 'name type department batch');
          
          if (post) {
            // Broadcast to all users (general posts) and typed channels for filtering on client
            this.io.emit('new_post', {
              post: post,
              author: post.author,
              timestamp: new Date()
            });
            if (post.postType === 'event') {
              this.io.emit('event_post_created', { post });
            }

            // Update post count for author
            this.broadcastUserStatsUpdate(post.author._id.toString());
          }

        } catch (error) {
          console.error('Error handling post creation:', error);
        }
      });

      // Handle event creation/update
      socket.on('event_updated', async (data) => {
        try {
          const { eventId } = data;
          
          // Broadcast event update to relevant users
          const event = await Event.findById(eventId).populate('creator', 'name type department');
          
          if (event) {
            // Broadcast to all users
            this.io.emit('event_update', {
              event: event,
              creator: event.creator,
              timestamp: new Date()
            });

            // Update event count for creator
            this.broadcastUserStatsUpdate(event.creator._id.toString());
          }

        } catch (error) {
          console.error('Error handling event update:', error);
        }
      });

      // Handle achievement updates
      socket.on('achievement_added', async (data) => {
        try {
          const { userId, achievement } = data;
          
          // Broadcast achievement to relevant users
          this.io.to(`type_${socket.user.type}`).emit('new_achievement', {
            userId: socket.userId,
            userName: socket.user.name,
            userType: socket.user.type,
            achievement: achievement,
            timestamp: new Date()
          });

          // Update achievement count
          this.broadcastUserStatsUpdate(socket.userId);

        } catch (error) {
          console.error('Error handling achievement update:', error);
        }
      });

      // Handle notification preference updates
      socket.on('update_notification_preferences', async (data) => {
        try {
          const { preferences } = data;
          
          // Update user's notification preferences in database
          await User.findByIdAndUpdate(socket.userId, {
            notificationPreferences: preferences
          });

          // Broadcast preference update to the specific user
          socket.emit('preference_update', {
            preferences: preferences,
            timestamp: new Date()
          });

          console.log(`Notification preferences updated for user: ${socket.user.name}`);

        } catch (error) {
          console.error('Error handling notification preference update:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.name} (${socket.userId})`);
        
        this.connectedUsers.delete(socket.userId);
        this.userSockets.delete(socket.userId);
        this.userRooms.delete(socket.userId);
        
        // Broadcast user offline status
        this.broadcastUserStatus(socket.userId, 'offline');
      });
    });
  }

  // Broadcast user status to all connected users
  broadcastUserStatus(userId, status) {
    this.io.emit('user_status_change', {
      userId,
      status,
      timestamp: new Date()
    });
  }

  // Broadcast user stats update
  async broadcastUserStatsUpdate(userId) {
    try {
      // Get updated stats
      const postCount = await Post.countDocuments({ author: userId });
      const eventCount = await Event.countDocuments({
        $or: [{ creator: userId }, { attendees: userId }]
      });
      
      const user = await User.findById(userId).select('achievements followers following');
      const achievementCount = user?.achievements?.length || 0;
      const connectionCount = (user?.followers?.length || 0) + (user?.following?.length || 0);

      const stats = {
        posts: postCount,
        events: eventCount,
        achievements: achievementCount,
        connections: connectionCount
      };

      // Send to the specific user
      this.sendToUser(userId, 'stats_updated', stats);

    } catch (error) {
      console.error('Error broadcasting user stats update:', error);
    }
  }

  // Send message notification to offline users
  async sendMessageNotification(conversationId, messageData) {
    try {
      const conversation = await Conversation.findById(conversationId)
        .populate('participants', 'name email');

      for (const participant of conversation.participants) {
        const participantId = participant._id.toString();
        
        // Skip sender
        if (participantId === messageData.senderId) continue;

        // Check if user is online
        const isOnline = this.connectedUsers.has(participantId);
        
        if (!isOnline) {
          // Send notification to user's personal room (for future push notifications)
          this.io.to(`user_${participantId}`).emit('message_notification', {
            conversationId,
            message: messageData,
            senderName: messageData.senderName
          });
        }
      }
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  }

  // Broadcast new notification to user
  async broadcastNotification(userId, notification) {
    try {
      this.sendToUser(userId, 'new_notification', {
        notification: notification,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
    }
  }

  // Broadcast to specific user type
  broadcastToUserType(userType, event, data) {
    this.io.to(`type_${userType}`).emit(event, data);
  }

  // Broadcast to specific department
  broadcastToDepartment(department, event, data) {
    this.io.to(`dept_${department}`).emit(event, data);
  }

  // Broadcast to specific batch
  broadcastToBatch(batch, event, data) {
    this.io.to(`batch_${batch}`).emit(event, data);
  }

  // Get online users
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Get online users by type
  async getOnlineUsersByType(userType) {
    const onlineUserIds = Array.from(this.connectedUsers.keys());
    const users = await User.find({ 
      _id: { $in: onlineUserIds }, 
      type: userType 
    }).select('name type department batch');
    return users;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Send message to all users
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Get user's current rooms
  getUserRooms(userId) {
    return this.userRooms.get(userId) || [];
  }

  // Get connected users count by type
  async getConnectedUsersCountByType() {
    const onlineUserIds = Array.from(this.connectedUsers.keys());
    const users = await User.find({ _id: { $in: onlineUserIds } }).select('type');
    
    const countByType = {
      alumni: 0,
      student: 0,
      faculty: 0
    };

    users.forEach(user => {
      countByType[user.type] = (countByType[user.type] || 0) + 1;
    });

    return countByType;
  }
}

module.exports = SocketService;
