const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
    .populate('groupAdmin', 'name avatar')
    .populate('groupAdmins', 'name avatar email')
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

    console.log('🔍 Follow status check:', {
      currentUserId: userId,
      participantId,
      currentUserFollowing: currentUser.following,
      currentUserFollowers: currentUser.followers,
      isFollowing,
      isFollowedBy,
      isMutual
    });

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

// IMPORTANT: More specific routes must come before the general /:id route
// Add members to group conversation (admin only)
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Member IDs are required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.isGroupChat) {
      return res.status(400).json({ error: 'This is not a group conversation' });
    }

    // Check if user is admin
    const isAdmin = conversation.groupAdmin.toString() === userId.toString();
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only group admin can add members' });
    }

    // Verify all new members exist
    const newMembers = await User.find({ _id: { $in: memberIds } });
    if (newMembers.length !== memberIds.length) {
      return res.status(400).json({ error: 'One or more users not found' });
    }

    // Filter out users who are already participants
    const existingParticipantIds = conversation.participants.map(p => p.toString());
    const newMemberIds = memberIds.filter(id => !existingParticipantIds.includes(id.toString()));

    if (newMemberIds.length === 0) {
      return res.status(400).json({ error: 'All users are already members' });
    }

    // Add new members
    conversation.participants.push(...newMemberIds);
    await conversation.save();
    await conversation.populate('participants', 'name avatar email type department');

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      newMemberIds.forEach(memberId => {
        io.to(`user_${memberId}`).emit('added_to_group', {
          conversationId,
          addedBy: userId
        });
      });
      conversation.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('group_updated', {
          conversationId,
          updatedBy: userId
        });
      });
    }

    res.json({ 
      success: true,
      conversation,
      message: 'Members added successfully'
    });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// Remove member from group conversation (admin only, or self)
router.delete('/:id/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.isGroupChat) {
      return res.status(400).json({ error: 'This is not a group conversation' });
    }

    const isAdmin = conversation.groupAdmin.toString() === userId.toString();
    const isRemovingSelf = memberId === userId.toString();

    // Only admin can remove others, anyone can remove themselves
    if (!isAdmin && !isRemovingSelf) {
      return res.status(403).json({ error: 'Only group admin can remove members' });
    }

    // Cannot remove admin
    if (conversation.groupAdmin.toString() === memberId && isRemovingSelf) {
      return res.status(400).json({ error: 'Admin cannot remove themselves. Transfer admin or delete group.' });
    }

    // Remove member
    conversation.participants = conversation.participants.filter(
      p => p.toString() !== memberId
    );

    // If no participants left, mark as inactive
    if (conversation.participants.length === 0) {
      conversation.isActive = false;
    }

    await conversation.save();
    await conversation.populate('participants', 'name avatar email type department');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${memberId}`).emit('removed_from_group', {
        conversationId,
        removedBy: userId
      });
      conversation.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('group_updated', {
          conversationId,
          updatedBy: userId
        });
      });
    }

    res.json({ 
      success: true,
      conversation,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Add admin to group (main admin only)
router.post('/:id/admins', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.isGroupChat) {
      return res.status(400).json({ error: 'This is not a group conversation' });
    }

    // Check if user is main admin
    if (conversation.groupAdmin.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only main admin can add other admins' });
    }

    // Verify admin exists and is a participant
    const targetAdminId = adminId?.toString ? adminId.toString() : String(adminId);

    const adminExists = conversation.participants.some(participant => {
      const participantId = participant?.toString ? participant.toString() : participant;
      return participantId === targetAdminId;
    });

    if (!adminExists) {
      return res.status(400).json({ error: 'User must be a member to become an admin' });
    }

    // Initialize groupAdmins array if it doesn't exist
    if (!conversation.groupAdmins) {
      conversation.groupAdmins = [];
    }

    // Add admin if not already an admin
    const alreadyAdmin = conversation.groupAdmins.some(existingAdmin => {
      const existingId = existingAdmin?.toString ? existingAdmin.toString() : existingAdmin;
      return existingId === targetAdminId;
    });

    if (!alreadyAdmin) {
      conversation.groupAdmins.push(adminId);
      await conversation.save();
    }

    await conversation.populate('groupAdmins', 'name avatar email');
    await conversation.populate('participants', 'name avatar email type department');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      conversation.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('group_updated', {
          conversationId,
          updatedBy: userId
        });
      });
    }

    res.json({ 
      success: true,
      conversation,
      message: 'Admin added successfully'
    });
  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ error: 'Failed to add admin' });
  }
});

// Remove admin from group (main admin only)
router.delete('/:id/admins/:adminId', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const adminId = req.params.adminId;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.isGroupChat) {
      return res.status(400).json({ error: 'This is not a group conversation' });
    }

    // Check if user is main admin
    if (conversation.groupAdmin.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only main admin can remove other admins' });
    }

    // Cannot remove main admin
    if (conversation.groupAdmin.toString() === adminId) {
      return res.status(400).json({ error: 'Cannot remove main admin' });
    }

    // Initialize groupAdmins array if it doesn't exist
    if (!conversation.groupAdmins) {
      conversation.groupAdmins = [];
    }

    // Remove admin
    conversation.groupAdmins = conversation.groupAdmins.filter(
      a => a.toString() !== adminId
    );
    await conversation.save();

    await conversation.populate('groupAdmins', 'name avatar email');
    await conversation.populate('participants', 'name avatar email type department');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      conversation.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('group_updated', {
          conversationId,
          updatedBy: userId
        });
      });
    }

    res.json({ 
      success: true,
      conversation,
      message: 'Admin removed successfully'
    });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ error: 'Failed to remove admin' });
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

    // Ensure userId is ObjectId for proper comparison
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;

    // Get messages with pagination - EXCLUDE messages deleted for this user
    // This is critical: User B should see all messages even if User A cleared the chat
    // The query excludes messages where deletedBy contains THIS user's ID with deleteMode 'forMe'
    // So if User A cleared, User B's query excludes messages deleted for User B (not User A)
    
    // CRITICAL FIX: Ensure userIdObj is properly formatted as ObjectId for comparison
    // Don't create a new ObjectId if it's already one - use it directly
    const userIdForQuery = userIdObj instanceof mongoose.Types.ObjectId 
      ? userIdObj 
      : (mongoose.Types.ObjectId.isValid(userIdObj) ? new mongoose.Types.ObjectId(userIdObj) : userIdObj);
    
    const query = {
      conversationId: conversationId,
      // Exclude messages hard deleted
      'deletionMetadata.hardDeleted': { $ne: true },
      // Exclude messages deleted for everyone (unless user is sender)
      $or: [
        { 'deletionMetadata.deletedForEveryone': { $ne: true } },
        { 'deletionMetadata.deletedForEveryone': { $exists: false } },
        { senderId: userIdForQuery }
      ],
      // CRITICAL: Exclude messages already deleted for THIS user (forMe mode)
      // This ensures User B sees all messages even if User A cleared the chat
      // We use $nor to exclude messages where deletedBy array contains an entry
      // with THIS user's ID and deleteMode 'forMe'
      // FIX: Use the properly formatted userIdForQuery directly
      $nor: [
        {
          deletedBy: {
            $elemMatch: {
              userId: userIdForQuery,
              deleteMode: 'forMe'
            }
          }
        }
      ]
    };
    
    console.log('🔍 Loading messages for user:', userIdForQuery.toString(), 'in conversation:', conversationId);
    console.log('🔍 Query userId type:', userIdForQuery.constructor.name);
    
    // First, get total count of ALL messages in conversation (for debugging)
    const totalMessagesInConversation = await Message.countDocuments({ conversationId: conversationId });
    console.log('📊 Total messages in conversation (before filtering):', totalMessagesInConversation);
    
    // Get messages with the query
    const messages = await Message.find(query)
      .populate('senderId', 'name avatar type department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log('✅ Found', messages.length, 'messages for user:', userIdForQuery.toString(), 'after filtering');
    
    // Enhanced debug: Check a sample message's deletedBy array
    if (messages.length === 0 && totalMessagesInConversation > 0) {
      console.log('⚠️ WARNING: No messages found but conversation has', totalMessagesInConversation, 'messages');
      const sampleMessages = await Message.find({ conversationId: conversationId }).limit(3).lean();
      sampleMessages.forEach((msg, idx) => {
        console.log(`📝 Sample message ${idx + 1} (${msg._id}):`, {
          deletedByCount: msg.deletedBy?.length || 0,
          deletedBy: msg.deletedBy?.map(d => ({
            userId: d.userId?.toString(),
            deleteMode: d.deleteMode,
            matchesCurrentUser: d.userId?.toString() === userIdForQuery.toString()
          })) || [],
          currentUserId: userIdForQuery.toString(),
          wouldBeExcluded: msg.deletedBy?.some(d => 
            d.userId?.toString() === userIdForQuery.toString() && d.deleteMode === 'forMe'
          ) || false
        });
      });
    }

    // Count total messages with same filtering
    const total = await Message.countDocuments({
      conversationId: conversationId,
      'deletionMetadata.hardDeleted': { $ne: true },
      $or: [
        { 'deletionMetadata.deletedForEveryone': { $ne: true } },
        { 'deletionMetadata.deletedForEveryone': { $exists: false } },
        { senderId: userIdForQuery }
      ],
      $nor: [
        {
          deletedBy: {
            $elemMatch: {
              userId: userIdForQuery,
              deleteMode: 'forMe'
            }
          }
        }
      ]
    });

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
    console.log('📨 Message creation request received');
    console.log('📋 RAW Request body (full):', JSON.stringify(req.body, null, 2));
    console.log('📋 Request body keys:', Object.keys(req.body || {}));
    
    const conversationId = req.params.id;
    const userId = req.user._id;
    const { content, mediaUrl, fileName, fileSize, messageType = 'text' } = req.body;

    console.log('📋 Extracted values:', {
      content: content,
      contentType: typeof content,
      contentLength: content ? content.length : 0,
      contentIsEmpty: content === '' || content === null || content === undefined,
      mediaUrl: mediaUrl ? mediaUrl.substring(0, 50) + '...' : null,
      fileName,
      fileSize,
      messageType
    });

    console.log('Request params:', { conversationId, userId: userId.toString() });

    // Validate conversationId format
    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      console.error('❌ Invalid conversationId format:', conversationId);
      return res.status(400).json({ error: 'Invalid conversation ID format' });
    }

    if (!content && !mediaUrl) {
      return res.status(400).json({ error: 'Message content or media is required' });
    }

    // Verify user is part of the conversation
    console.log('🔍 Looking for conversation:', conversationId);
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true
    });

    if (!conversation) {
      console.error('❌ Conversation not found or user not a participant');
      return res.status(404).json({ error: 'Conversation not found' });
    }

    console.log('✅ Conversation found, creating message...');

    // Normalize messageType to match enum values
    let normalizedMessageType = messageType;
    // Message model now supports: 'text', 'image', 'video', 'pdf', 'file', 'system'
    if (!['text', 'image', 'video', 'pdf', 'file', 'system'].includes(messageType)) {
      // If invalid messageType, default based on content
      normalizedMessageType = mediaUrl ? 'image' : 'text';
    }

    console.log('Normalized messageType:', normalizedMessageType);

    // Prepare message content - ensure it's not empty (required field)
    // Message model has trim: true, so we must ensure content is never empty or whitespace-only
    let messageContent;
    
    // Check if content exists and is not just whitespace
    const hasValidContent = content && typeof content === 'string' && content.trim().length > 0;
    
    if (hasValidContent) {
      // Use the trimmed content
      messageContent = content.trim();
      console.log('✅ Using provided content:', messageContent.substring(0, 50));
    } else if (mediaUrl) {
      // If there's media but no text content, use a placeholder
      messageContent = `[${normalizedMessageType}]`;
      console.log('✅ Using media placeholder:', messageContent);
    } else {
      // Fallback to a default message if neither content nor media
      messageContent = '[message]';
      console.log('✅ Using default placeholder:', messageContent);
    }
    
    // CRITICAL: Ensure messageContent is never empty or whitespace
    // This is because Message model has trim: true which will fail validation if empty
    if (!messageContent || typeof messageContent !== 'string' || messageContent.trim().length === 0) {
      console.error('❌ Content validation failed - content would be empty after trim!');
      messageContent = mediaUrl ? `[${normalizedMessageType}]` : '[message]';
      console.log('🔧 Applied emergency fallback:', messageContent);
    }
    
    console.log('Content processing:', {
      originalContent: content,
      originalContentType: typeof content,
      originalContentLength: content ? content.length : 0,
      hasValidContent: hasValidContent,
      finalContent: messageContent,
      finalContentLength: messageContent.length,
      finalContentType: typeof messageContent,
      hasMediaUrl: !!mediaUrl
    });
    
    // Final validation - ensure messageContent is never empty
    if (!messageContent || messageContent.trim().length === 0) {
      console.error('❌ CRITICAL: messageContent is empty after processing!');
      console.error('Debug info:', {
        content,
        mediaUrl,
        normalizedMessageType,
        messageContent
      });
      // Force a non-empty value
      messageContent = mediaUrl ? `[${normalizedMessageType}]` : '[message]';
      console.log('⚠️ Using fallback content:', messageContent);
    }
    
    // Ensure messageContent is a string and not empty
    const finalContent = String(messageContent).trim();
    if (finalContent.length === 0) {
      // Last resort fallback
      const fallbackContent = mediaUrl ? `[${normalizedMessageType}]` : '[message]';
      console.error('❌ Final content validation failed, using fallback:', fallbackContent);
      messageContent = fallbackContent;
    } else {
      messageContent = finalContent;
    }
    
    console.log('Creating message with data:', {
      conversationId,
      senderId: userId.toString(),
      senderName: req.user.name,
      content: messageContent.substring(0, 50),
      contentLength: messageContent.length,
      messageType: normalizedMessageType,
      hasMediaUrl: !!mediaUrl,
      fileName,
      fileSize
    });

    // CRITICAL: Final check before creating message object
    // Ensure messageContent is a non-empty string
    if (!messageContent || typeof messageContent !== 'string' || messageContent.trim().length === 0) {
      console.error('❌ FATAL: messageContent is still empty after all processing!');
      console.error('Raw values:', {
        content,
        mediaUrl,
        normalizedMessageType,
        messageContent,
        messageContentType: typeof messageContent
      });
      // Force a valid value - this should never happen but prevents crashes
      messageContent = mediaUrl ? `[${normalizedMessageType || 'file'}]` : '[message]';
      console.log('🔧 Forced fallback content:', messageContent);
    }

    // Create new message with validated content
    // Use String() to ensure it's definitely a string
    const finalMessageContent = String(messageContent).trim();
    if (finalMessageContent.length === 0) {
      // Absolute last resort
      const emergencyContent = mediaUrl ? '[media]' : '[message]';
      console.error('❌ EMERGENCY: Even String conversion failed, using:', emergencyContent);
      messageContent = emergencyContent;
    } else {
      messageContent = finalMessageContent;
    }

    console.log('🔒 Final messageContent before Message creation:', {
      content: messageContent,
      length: messageContent.length,
      type: typeof messageContent,
      isEmpty: messageContent.length === 0
    });

    const message = new Message({
      conversationId: conversationId,
      senderId: userId,
      senderName: req.user.name,
      content: messageContent, // This is guaranteed to be non-empty string
      messageType: normalizedMessageType,
      mediaUrl: mediaUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      status: 'sent'
    });

    // Verify the message object has content before proceeding
    if (!message.content || message.content.trim().length === 0) {
      console.error('❌ CRITICAL: Message object created with empty content!');
      console.error('Message object:', {
        content: message.content,
        contentType: typeof message.content,
        contentLength: message.content ? message.content.length : 0
      });
      // Force set it
      message.content = mediaUrl ? `[${normalizedMessageType}]` : '[message]';
      console.log('🔧 Forced message.content to:', message.content);
    }

    // Validate message object before saving
    const validationError = message.validateSync();
    if (validationError) {
      console.error('❌ Message validation failed before save:', validationError);
      console.error('Validation errors:', validationError.errors);
      console.error('Message data:', {
        content: message.content,
        contentLength: message.content ? message.content.length : 0,
        messageType: message.messageType,
        hasMediaUrl: !!message.mediaUrl
      });
      return res.status(400).json({ 
        error: 'Message validation failed',
        details: validationError.message,
        validationErrors: validationError.errors
      });
    }

    console.log('💾 Saving message to database...');
    try {
    await message.save();
      console.log('✅ Message saved successfully:', message._id);
    } catch (saveError) {
      console.error('❌ Error saving message:', saveError);
      console.error('Error name:', saveError.name);
      console.error('Error message:', saveError.message);
      if (saveError.errors) {
        console.error('Validation errors:', saveError.errors);
        console.error('Content field error:', saveError.errors.content);
      }
      console.error('Message that failed:', {
        content: message.content,
        contentType: typeof message.content,
        contentLength: message.content ? message.content.length : 0,
        messageType: message.messageType,
        hasMediaUrl: !!message.mediaUrl
      });
      throw saveError; // Re-throw to be caught by outer catch
    }

    // Update conversation's last message and timestamp
    conversation.lastMessage = message._id;
    conversation.lastMessageContent = messageContent; // Use the processed messageContent
    conversation.lastMessageTime = new Date();
    conversation.updatedAt = new Date();

    // Update unread count for other participants (manually to avoid multiple saves)
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== userId.toString()) {
        // Ensure unreadCount is initialized as a Map
        if (!conversation.unreadCount || !(conversation.unreadCount instanceof Map)) {
          conversation.unreadCount = new Map();
        }
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    console.log('💾 Saving conversation updates...');
    await conversation.save();
    console.log('✅ Conversation updated');

    // Populate sender details
    await message.populate('senderId', 'name avatar type department');

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      console.log('📡 Emitting socket event to conversation:', conversationId);
      // Emit to all participants in the conversation room
      io.to(conversationId).emit('new_message', {
        message: message.toObject(),
        conversationId
      });
      
      // Also emit to individual user rooms for real-time updates
      conversation.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('new_message', {
        message: message.toObject(),
        conversationId
      });
      });
    } else {
      console.warn('⚠️ Socket.io not available');
    }

    console.log('✅ Message created successfully, sending response');
    res.status(201).json({
      success: true,
      message: message.toObject()
    });
  } catch (error) {
    console.error('❌ Error posting message:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError' && error.errors) {
      console.error('Validation error details:', error.errors);
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = {
          message: error.errors[key].message,
          kind: error.errors[key].kind,
          path: error.errors[key].path,
          value: error.errors[key].value
        };
      });
      
      return res.status(400).json({ 
        error: 'Message validation failed',
        details: error.message,
        validationErrors: validationErrors
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      error: 'Failed to post message',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while posting the message'
    });
  }
});

// NOTE: Member and admin management routes are already defined above (before /:id route)
// to ensure proper route matching. Duplicate routes removed.

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
    if (conversation.groupAdmin.toString() !== userId.toString()) {
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

