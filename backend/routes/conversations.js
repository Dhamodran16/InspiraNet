const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Get all conversations for the authenticated user (only with mutually followed users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Conversations route accessed by user:', req.user._id);
    
    const userId = req.user._id;
    
    // Get current user's follow relationships
    console.log('🔍 Fetching user follow relationships...');
    const currentUser = await User.findById(userId).select('following followers');
    console.log('🔍 User follow data:', {
      following: currentUser?.following?.length || 0,
      followers: currentUser?.followers?.length || 0
    });
    
    if (!currentUser) {
      console.error('❌ Current user not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('🔍 Fetching conversations...');
    const conversations = await Conversation.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'name email avatar type department')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    console.log('🔍 Found conversations:', conversations.length);
    
    // Filter conversations to only include mutually followed users
    const filteredConversations = conversations.filter(conv => {
      if (conv.isGroupChat) {
        return true; // Keep group chats
      }
      
      // For 1-on-1 conversations, check mutual follow
      const otherParticipant = conv.participants.find(p => p._id.toString() !== userId.toString());
      if (!otherParticipant) return false;
      
      const isFollowing = currentUser.following.includes(otherParticipant._id);
      const isFollowedBy = currentUser.followers.includes(otherParticipant._id);
      
      return isFollowing && isFollowedBy;
    });

    console.log('🔍 Filtered conversations:', filteredConversations.length);

    // Calculate unread counts for each conversation
    const conversationsWithUnread = filteredConversations.map(conv => {
      let unreadCount = 0;
      try {
        // Safely access unreadCount Map
        if (conv.unreadCount && typeof conv.unreadCount.get === 'function') {
          unreadCount = conv.unreadCount.get(userId.toString()) || 0;
        } else if (conv.unreadCount && typeof conv.unreadCount === 'object') {
          // Handle case where unreadCount might be a plain object
          unreadCount = conv.unreadCount[userId.toString()] || 0;
        }
      } catch (error) {
        console.warn('Error accessing unreadCount for conversation:', conv._id, error);
        unreadCount = 0;
      }
      
      return {
        ...conv.toObject(),
        unreadCount: unreadCount
      };
    });

    console.log('✅ Successfully processed conversations');
    res.json({ conversations: conversationsWithUnread });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create a new conversation between two users (only if mutually followed)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user._id;

    // Validate participant
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Check if users are mutually followed
    const currentUser = await User.findById(userId);
    const isFollowing = currentUser.following.includes(participantId);
    const isFollowedBy = currentUser.followers.includes(participantId);
    const isMutual = isFollowing && isFollowedBy;

    // Check messaging permissions
    let canMessage = false;
    if (isMutual) {
      canMessage = true; // Mutual followers can always message
    } else if (participant.messagePolicy === 'everyone') {
      canMessage = true;
    } else if (participant.messagePolicy === 'followers' && isFollowing) {
      canMessage = true;
    }

    if (!canMessage) {
      return res.status(403).json({ 
        error: 'Cannot start conversation. Users must be mutually followed or have appropriate messaging permissions.' 
      });
    }

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] },
      isGroupChat: false,
      isActive: true
    });

    if (existingConversation) {
      return res.json({ conversation: existingConversation });
    }

    // Create new conversation
    const conversation = new Conversation({
      participants: [userId, participantId],
      isGroupChat: false,
      isActive: true,
      unreadCount: new Map()
    });

    await conversation.save();
    
    // Populate participant details
    await conversation.populate('participants', 'name email avatar type department');
    
    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get users who can be messaged (mutually followed)
router.get('/messageable-users', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get current user's follow relationships
    const currentUser = await User.findById(userId).select('following followers');
    
    // Find users who are mutually following each other
    const mutuallyFollowedUsers = await User.find({
      _id: { 
        $in: currentUser.following.filter(id => 
          currentUser.followers.includes(id)
        )
      }
    }).select('name email avatar type department');

    res.json({ 
      users: mutuallyFollowedUsers,
      count: mutuallyFollowedUsers.length
    });
  } catch (error) {
    console.error('Error fetching messageable users:', error);
    res.status(500).json({ error: 'Failed to fetch messageable users' });
  }
});

// Create a group conversation
router.post('/group', authenticateToken, async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    const userId = req.user._id;

    if (!name || !participantIds || participantIds.length < 2) {
      return res.status(400).json({ error: 'Group name and at least 2 participants are required' });
    }

    // Add creator to participants if not included
    if (!participantIds.includes(userId)) {
      participantIds.push(userId);
    }

    // Verify all participants exist
    const participants = await User.find({ _id: { $in: participantIds } }).select('name email avatar type department');
    if (participants.length !== participantIds.length) {
      return res.status(400).json({ error: 'One or more participants not found' });
    }

    // Create group conversation
    const conversation = new Conversation({
      participants: participantIds,
      isGroupChat: true,
      groupName: name,
      groupAdmin: userId,
      isActive: true,
      unreadCount: new Map()
    });

    await conversation.save();
    
    // Populate participant details
    await conversation.populate('participants', 'name email avatar type department');
    
    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Error creating group conversation:', error);
    res.status(500).json({ error: 'Failed to create group conversation' });
  }
});

// Get a specific conversation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true
    })
    .populate('participants', 'name email avatar type department')
    .populate('lastMessage');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Get messages for a specific conversation
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages with pagination
    const messages = await Message.find({ conversationId: conversationId })
      .populate('senderId', 'name avatar type department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Message.countDocuments({ conversationId: conversationId });

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to get chronological order
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Post a message to a conversation
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;
    const { content, mediaUrl, fileName, fileSize } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({ error: 'Message content or media is required' });
    }

    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Create new message
    const message = new Message({
      conversationId: conversationId,
      senderId: userId,
      senderName: req.user.name,
      content: content || '',
      mediaUrl,
      fileName,
      fileSize,
      status: 'sent'
    });

    await message.save();

    // Update conversation's last message and timestamp
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();

    // Update unread count for other participants
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== userId.toString()) {
        // Ensure unreadCount is a Map
        if (!conversation.unreadCount || !(conversation.unreadCount instanceof Map)) {
          conversation.unreadCount = new Map();
        }
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    await conversation.save();

    // Populate sender details
    await message.populate('senderId', 'name avatar type department');

    // Emit socket event for real-time updates
    if (req.app.locals.io) {
      req.app.locals.io.to(conversationId).emit('new_message', {
        message: message.toObject(),
        conversationId
      });
    }

    res.status(201).json({
      success: true,
      message: message.toObject()
    });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// Update conversation (for group chats)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;
    const { groupName } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isGroupChat: true,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Group conversation not found' });
    }

    // Only group admin can update group name
    if (conversation.groupAdmin.toString() !== userId) {
      return res.status(403).json({ error: 'Only group admin can update group settings' });
    }

    if (groupName) {
      conversation.groupName = groupName;
    }

    await conversation.save();
    
    await conversation.populate('participants', 'name email avatar type department');
    
    res.json({ conversation });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Soft delete conversation (leave conversation)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.isGroupChat) {
      // For group chats, remove user from participants
      conversation.participants = conversation.participants.filter(
        p => p.toString() !== userId
      );
      
      // If no participants left, mark as inactive
      if (conversation.participants.length === 0) {
        conversation.isActive = false;
      }
      
      // If admin is leaving, assign admin to first remaining participant
      if (conversation.groupAdmin.toString() === userId && conversation.participants.length > 0) {
        conversation.groupAdmin = conversation.participants[0];
      }
    } else {
      // For 1-on-1 chats, mark as inactive
      conversation.isActive = false;
    }

    await conversation.save();
    res.json({ message: 'Left conversation successfully' });
  } catch (error) {
    console.error('Error leaving conversation:', error);
    res.status(500).json({ error: 'Failed to leave conversation' });
  }
});

// Mark messages as read in a conversation
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'Message IDs array is required' });
    }

    // Update messages to mark as read
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        conversationId,
        senderId: { $ne: userId }
      },
      {
        $addToSet: { readBy: { userId, readAt: new Date() } },
        isRead: true
      }
    );

    // Update conversation unread count
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      const currentUnread = conversation.unreadCount.get(userId) || 0;
      const newUnread = Math.max(0, currentUnread - messageIds.length);
      conversation.unreadCount.set(userId, newUnread);
      await conversation.save();
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Search users for starting conversations
router.get('/users/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name email avatar type department batch')
    .limit(10);

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Mark conversation as read for current user
router.patch('/:conversationId/read', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Mark conversation as read for the user
    await conversation.markAsReadForUser(userId);

    // Mark all messages in the conversation as read for this user
    await Message.updateMany(
      { 
        conversationId,
        senderId: { $ne: userId },
        'readBy.userId': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            userId: userId,
            readAt: new Date()
          }
        },
        $set: { isRead: true }
      }
    );

    res.json({ message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

module.exports = router;
