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
    
    // Meeting-specific properties
    this.meetingRooms = new Map(); // roomId -> meeting data
    this.userMeetings = new Map(); // userId -> roomId
    
    // 🚨 IMPLEMENTED LIMITS
    this.ROOM_LIMITS = {
      maxParticipantsPerRoom: 50,        // Maximum users per room
      maxConcurrentRooms: 100,          // Maximum active rooms
      maxTotalUsers: 5000,              // Maximum total users
      maxVideoStreams: 25,              // Maximum HD video streams
      maxAudioStreams: 50               // Maximum audio streams
    };
    
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

      // Handle meeting join/leave
      socket.on('join_meeting', (data) => {
        this.handleJoinMeeting(socket, data.roomId, data.username);
      });

      socket.on('leave_meeting', () => {
        this.handleLeaveMeeting(socket);
      });

      // Handle WebRTC signaling
      socket.on('webrtc-signal', (data) => {
        this.handleWebRTCSignaling(socket, data);
      });

      // Handle meeting chat messages
      socket.on('meeting_message', (data) => {
        this.handleMeetingMessage(socket, data);
      });

      // Handle participant media state updates
      socket.on('participant_media_update', (data) => {
        this.handleMediaStateUpdate(socket, data);
      });

      // Handle hand raise
      socket.on('hand_raise', (data) => {
        this.handleHandRaise(socket, data.raised);
      });

      // Handle host mute all
      socket.on('host_mute_all', () => {
        this.handleHostMuteAll(socket);
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

  // ===== MEETING FUNCTIONALITY =====

  // 🚨 LIMIT ENFORCEMENT METHODS
  checkRoomLimits(roomId, userId) {
    try {
      // Check total system capacity
      const totalUsers = this.getTotalConnectedUsers();
      if (totalUsers >= this.ROOM_LIMITS.maxTotalUsers) {
        return { allowed: false, reason: 'System at maximum capacity' };
      }

      // Check concurrent rooms limit
      if (this.meetingRooms.size >= this.ROOM_LIMITS.maxConcurrentRooms) {
        return { allowed: false, reason: 'Maximum rooms limit reached' };
      }

      // Check room-specific limits
      const room = this.meetingRooms.get(roomId);
      if (room) {
        const participantCount = room.participants.size;
        
        // Check participant limit
        if (participantCount >= this.ROOM_LIMITS.maxParticipantsPerRoom) {
          return { allowed: false, reason: 'Room at maximum capacity' };
        }

        // Check video stream limits (estimate based on participants)
        const videoStreams = Array.from(room.participants.values())
          .filter(p => !p.isVideoOff).length;
        
        if (videoStreams >= this.ROOM_LIMITS.maxVideoStreams) {
          return { allowed: false, reason: 'Video stream limit reached' };
        }

        // Check audio stream limits
        const audioStreams = Array.from(room.participants.values())
          .filter(p => !p.isMuted).length;
        
        if (audioStreams >= this.ROOM_LIMITS.maxAudioStreams) {
          return { allowed: false, reason: 'Audio stream limit reached' };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking room limits:', error);
      return { allowed: false, reason: 'System error checking limits' };
    }
  }

  getTotalConnectedUsers() {
    return this.connectedUsers.size;
  }

  getSystemStats() {
    return {
      totalUsers: this.getTotalConnectedUsers(),
      totalRooms: this.meetingRooms.size,
      maxUsers: this.ROOM_LIMITS.maxTotalUsers,
      maxRooms: this.ROOM_LIMITS.maxConcurrentRooms,
      maxParticipantsPerRoom: this.ROOM_LIMITS.maxParticipantsPerRoom,
      systemLoad: (this.getTotalConnectedUsers() / this.ROOM_LIMITS.maxTotalUsers * 100).toFixed(2) + '%'
    };
  }

  // Create or join meeting room
  handleJoinMeeting(socket, roomId, username) {
    try {
      console.log(`User ${username} (${socket.userId}) attempting to join room ${roomId}`);
      
      // 🚨 CHECK ROOM LIMITS BEFORE JOINING
      const limitCheck = this.checkRoomLimits(roomId, socket.userId);
      if (!limitCheck.allowed) {
        console.log(`❌ User ${username} blocked from joining room ${roomId}: ${limitCheck.reason}`);
        socket.emit('meeting-error', { 
          message: `Cannot join room: ${limitCheck.reason}`,
          code: 'ROOM_LIMIT_EXCEEDED'
        });
        return;
      }
      
      // Create room if it doesn't exist
      if (!this.meetingRooms.has(roomId)) {
        this.meetingRooms.set(roomId, {
          id: roomId,
          hostId: socket.userId,
          participants: new Map(),
          messages: [],
          createdAt: new Date(),
          isActive: true
        });
        console.log(`✅ Created new meeting room: ${roomId}`);
      }

      const room = this.meetingRooms.get(roomId);
      
      // Add user to room
      room.participants.set(socket.userId, {
        id: socket.userId,
        username: username || socket.user.name,
        isHost: room.hostId === socket.userId,
        isMuted: false,
        isVideoOff: false,
        hasRaisedHand: false,
        joinedAt: new Date()
      });

      // Update user's current meeting
      this.userMeetings.set(socket.userId, roomId);
      
      // Join socket to room
      socket.join(roomId);
      
      // Notify room about new participant
      socket.to(roomId).emit('user-joined', {
        userId: socket.userId,
        username: username || socket.user.name,
        isHost: room.hostId === socket.userId
      });

      // Send room info to the joining user
      socket.emit('room-info', {
        roomId,
        hostId: room.hostId,
        participants: Array.from(room.participants.values()),
        messages: room.messages
      });

      // Send existing participants to the new user
      const existingParticipants = Array.from(room.participants.values())
        .filter(p => p.id !== socket.userId);
      
      if (existingParticipants.length > 0) {
        socket.emit('room-users', existingParticipants);
      }

      console.log(`✅ User ${username} joined room ${roomId}. Total participants: ${room.participants.size}`);
      
      // 🚨 LOG SYSTEM STATS FOR MONITORING
      const stats = this.getSystemStats();
      console.log(`📊 System Stats: ${stats.totalUsers}/${stats.maxUsers} users, ${stats.totalRooms}/${stats.maxRooms} rooms, Load: ${stats.systemLoad}`);
      
    } catch (error) {
      console.error('Error joining meeting:', error);
      socket.emit('meeting-error', { message: 'Failed to join meeting' });
    }
  }

  // Leave meeting room
  handleLeaveMeeting(socket) {
    try {
      const roomId = this.userMeetings.get(socket.userId);
      if (!roomId) return;

      const room = this.meetingRooms.get(roomId);
      if (!room) return;

      // Remove user from room
      room.participants.delete(socket.userId);
      this.userMeetings.delete(socket.userId);
      
      // Leave socket room
      socket.leave(roomId);

      // Notify other participants
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        username: socket.user.name
      });

      // If room is empty, clean it up after 5 minutes
      if (room.participants.size === 0) {
        setTimeout(() => {
          if (this.meetingRooms.has(roomId)) {
            const currentRoom = this.meetingRooms.get(roomId);
            if (currentRoom && currentRoom.participants.size === 0) {
              this.meetingRooms.delete(roomId);
              console.log(`🗑️ Cleaned up empty meeting room: ${roomId}`);
            }
          }
        }, 300000); // 5 minutes
      } else if (room.hostId === socket.userId) {
        // If host left, assign new host
        const newHost = Array.from(room.participants.values())[0];
        room.hostId = newHost.id;
        newHost.isHost = true;
        
        socket.to(roomId).emit('host-changed', {
          newHostId: newHost.id,
          newHostName: newHost.username
        });
      }

      console.log(`👋 User ${socket.user.name} left room ${roomId}`);
      
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  }

  // Handle WebRTC signaling
  handleWebRTCSignaling(socket, data) {
    try {
      const { type, targetUserId, ...signalData } = data;
      
      switch (type) {
        case 'offer':
          this.handleOffer(socket, targetUserId, signalData);
          break;
        case 'answer':
          this.handleAnswer(socket, targetUserId, signalData);
          break;
        case 'ice-candidate':
          this.handleIceCandidate(socket, targetUserId, signalData);
          break;
        default:
          console.warn(`Unknown WebRTC signal type: ${type}`);
      }
    } catch (error) {
      console.error('Error handling WebRTC signaling:', error);
    }
  }

  // Handle WebRTC offer
  handleOffer(socket, targetUserId, offerData) {
    const targetSocketId = this.connectedUsers.get(targetUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit('webrtc-signal', {
        type: 'offer',
        fromUserId: socket.userId,
        ...offerData
      });
    }
  }

  // Handle WebRTC answer
  handleAnswer(socket, targetUserId, answerData) {
    const targetSocketId = this.connectedUsers.get(targetUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit('webrtc-signal', {
        type: 'answer',
        fromUserId: socket.userId,
        ...answerData
      });
    }
  }

  // Handle ICE candidate
  handleIceCandidate(socket, targetUserId, candidateData) {
    const targetSocketId = this.connectedUsers.get(targetUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit('webrtc-signal', {
        type: 'ice-candidate',
        fromUserId: socket.userId,
        ...candidateData
      });
    }
  }

  // Handle meeting chat messages
  handleMeetingMessage(socket, messageData) {
    try {
      const { roomId, content, messageType = 'text' } = messageData;
      const room = this.meetingRooms.get(roomId);
      
      if (!room) {
        socket.emit('meeting-error', { message: 'Room not found' });
        return;
      }

      const message = {
        id: Date.now().toString(),
        userId: socket.userId,
        username: socket.user.name,
        content,
        messageType,
        timestamp: new Date()
      };

      // Store message in room
      room.messages.push(message);

      // Broadcast to all participants in the room
      this.io.to(roomId).emit('meeting-message', message);

      console.log(`💬 Meeting message in ${roomId}: ${socket.user.name}: ${content}`);
      
    } catch (error) {
      console.error('Error handling meeting message:', error);
      socket.emit('meeting-error', { message: 'Failed to send message' });
    }
  }

  // Handle participant media state updates
  handleMediaStateUpdate(socket, stateData) {
    try {
      const { roomId, isMuted, isVideoOff } = stateData;
      const room = this.meetingRooms.get(roomId);
      
      if (!room || !room.participants.has(socket.userId)) return;

      const participant = room.participants.get(socket.userId);
      participant.isMuted = isMuted;
      participant.isVideoOff = isVideoOff;

      // Broadcast state update to other participants
      socket.to(roomId).emit('participant-media-update', {
        userId: socket.userId,
        username: socket.user.name,
        isMuted,
        isVideoOff
      });

      console.log(`🎥 Media state update in ${roomId}: ${socket.user.name} - Muted: ${isMuted}, Video: ${!isVideoOff}`);
      
    } catch (error) {
      console.error('Error handling media state update:', error);
    }
  }

  // Handle hand raise
  handleHandRaise(socket, raised) {
    try {
      const roomId = this.userMeetings.get(socket.userId);
      if (!roomId) return;

      const room = this.meetingRooms.get(roomId);
      if (!room || !room.participants.has(socket.userId)) return;

      const participant = room.participants.get(socket.userId);
      participant.hasRaisedHand = raised;

      // Broadcast hand raise to other participants
      socket.to(roomId).emit('hand-raise', {
        userId: socket.userId,
        username: socket.user.name,
        raised
      });

      console.log(`✋ Hand ${raised ? 'raised' : 'lowered'} in ${roomId}: ${socket.user.name}`);
      
    } catch (error) {
      console.error('Error handling hand raise:', error);
    }
  }

  // Handle host mute all
  handleHostMuteAll(socket) {
    try {
      const roomId = this.userMeetings.get(socket.userId);
      if (!roomId || room.hostId !== socket.userId) {
        socket.emit('meeting-error', { message: 'Only host can mute all participants' });
        return;
      }

      const room = this.meetingRooms.get(roomId);
      if (!room) return;

      // Mute all participants except host
      room.participants.forEach((participant, userId) => {
        if (userId !== socket.userId) {
          participant.isMuted = true;
        }
      });

      // Broadcast mute all to participants
      socket.to(roomId).emit('host-mute-all');

      console.log(`🔇 Host ${socket.user.name} muted all participants in ${roomId}`);
      
    } catch (error) {
      console.error('Error handling host mute all:', error);
    }
  }

  // Get meeting room info
  getMeetingRoomInfo(roomId) {
    const room = this.meetingRooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      hostId: room.hostId,
      participants: Array.from(room.participants.values()),
      messages: room.messages,
      createdAt: room.createdAt,
      isActive: room.isActive
    };
  }

  // Get user's current meeting
  getUserMeeting(userId) {
    const roomId = this.userMeetings.get(userId);
    if (!roomId) return null;

    return this.getMeetingRoomInfo(roomId);
  }

  // Get all active meetings
  getAllActiveMeetings() {
    const activeMeetings = [];
    this.meetingRooms.forEach((room, roomId) => {
      if (room.isActive) {
        activeMeetings.push(this.getMeetingRoomInfo(roomId));
      }
    });
    return activeMeetings;
  }
}

module.exports = SocketService;