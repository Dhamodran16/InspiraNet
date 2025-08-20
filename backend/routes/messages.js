const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const FollowService = require('../services/followService');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Helper function to encrypt message content
const encryptMessage = (content, encryptionKey) => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

// Helper function to decrypt message content
const decryptMessage = (encryptedData, encryptionKey) => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Helper function to check if users can message each other
const canUsersMessage = async (user1Id, user2Id) => {
  try {
    const user1 = await User.findById(user1Id).select('following followers messagePolicy');
    const user2 = await User.findById(user2Id).select('following followers messagePolicy');
    
    if (!user1 || !user2) return false;
    
    const user1FollowingUser2 = user1.following.includes(user2Id);
    const user2FollowingUser1 = user2.following.includes(user1Id);
    const isMutual = user1FollowingUser2 && user2FollowingUser1;
    
    // Mutual followers can always message each other
    if (isMutual) return true;
    
    // Check individual message policies
    if (user2.messagePolicy === 'everyone') return true;
    if (user2.messagePolicy === 'followers' && user1FollowingUser2) return true;
    
    return false;
  } catch (error) {
    console.error('Error checking messaging permissions:', error);
    return false;
  }
};

// Helper function to generate conversation encryption key
const generateConversationKey = (conversationId, participantIds) => {
  const sortedIds = participantIds.sort().join('-');
  return crypto.createHash('sha256').update(`${conversationId}-${sortedIds}`).digest('hex');
};

// Conversations are now handled in /routes/conversations.js

// Get message requests (follow requests that can lead to messaging)
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get pending follow requests sent by the current user
    const followRequests = await FollowService.getPendingFollowRequests(userId);
    
    // Get users who sent follow requests to the current user
    const receivedRequests = await FollowService.getReceivedFollowRequests(userId);
    
    res.json({
      sentRequests: followRequests || [],
      receivedRequests: receivedRequests || []
    });
  } catch (error) {
    console.error('Error fetching message requests:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return empty arrays instead of crashing
    res.json({
      sentRequests: [],
      receivedRequests: [],
      error: 'Some data could not be loaded'
    });
  }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('senderId', 'name avatar');

    // Format messages for frontend
    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      senderId: msg.senderId._id,
      senderName: msg.senderName,
      content: msg.content,
      messageType: msg.messageType,
      mediaUrl: msg.mediaUrl,
      isRead: msg.isRead,
      readBy: msg.readBy,
      createdAt: msg.createdAt,
      timeAgo: msg.timeAgo,
      isOwn: msg.senderId._id.toString() === req.user._id.toString()
    }));

    res.json({
      messages: formattedMessages,
      currentPage: page,
      totalPages: Math.ceil(await Message.countDocuments({ conversationId }) / limit)
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create a new conversation (1-on-1)
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Check messaging permissions
    const canMessage = await FollowService.canMessage(req.user._id, participantId);
    
    if (!canMessage.ok) {
      return res.status(403).json({ 
        error: 'Cannot create conversation', 
        reason: canMessage.reason 
      });
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
      isGroupChat: false,
      isActive: true
    });

    if (existingConversation) {
      return res.json(existingConversation);
    }

    // Create new conversation
    const conversation = new Conversation({
      participants: [req.user._id, participantId],
      isGroupChat: false
    });

    await conversation.save();

    // Populate participants for response
    await conversation.populate('participants', 'name email avatar type department');

    const otherParticipant = conversation.participants.find(p => p._id.toString() !== req.user._id.toString());

    const formattedConversation = {
      _id: conversation._id,
      name: otherParticipant?.name || 'Unknown User',
      avatar: otherParticipant?.avatar || '/placeholder.svg',
      lastMessage: 'No messages yet',
      timestamp: conversation.createdAt,
      unread: 0,
      online: false,
      userType: otherParticipant?.type || 'Unknown',
      isGroupChat: false,
      participants: conversation.participants.map(p => ({
        _id: p._id,
        name: p.name,
        email: p.email,
        avatar: p.avatar,
        type: p.type,
        department: p.department
      }))
    };

    res.status(201).json(formattedConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Create a group conversation
router.post('/conversations/group', authenticateToken, async (req, res) => {
  try {
    const { name, participantIds } = req.body;

    if (!name || !participantIds || participantIds.length < 2) {
      return res.status(400).json({ error: 'Group name and at least 2 participants are required' });
    }

    // Add current user to participants
    const allParticipants = [...new Set([req.user._id.toString(), ...participantIds])];

    // Check if all participants exist
    const participants = await User.find({ _id: { $in: allParticipants } });
    if (participants.length !== allParticipants.length) {
      return res.status(404).json({ error: 'One or more participants not found' });
    }

    // Create group conversation
    const conversation = new Conversation({
      participants: allParticipants,
      isGroupChat: true,
      groupName: name,
      groupAdmin: req.user._id
    });

    await conversation.save();
    await conversation.populate('participants', 'name email avatar type department');

    const formattedConversation = {
      _id: conversation._id,
      name: conversation.groupName,
      avatar: null,
      lastMessage: 'No messages yet',
      timestamp: conversation.createdAt,
      unread: 0,
      online: false,
      userType: 'Group',
      isGroupChat: true,
      participants: conversation.participants.map(p => ({
        _id: p._id,
        name: p.name,
        email: p.email,
        avatar: p.avatar,
        type: p.type,
        department: p.department
      }))
    };

    res.status(201).json(formattedConversation);
  } catch (error) {
    console.error('Error creating group conversation:', error);
    res.status(500).json({ error: 'Failed to create group conversation' });
  }
});

// Mark messages as read
router.put('/conversations/:conversationId/read', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageIds } = req.body;

    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Mark messages as read
    if (messageIds && messageIds.length > 0) {
      await Message.updateMany(
        { 
          _id: { $in: messageIds }, 
          senderId: { $ne: req.user._id } 
        },
        { 
          $addToSet: { 
            readBy: { 
              userId: req.user._id, 
              readAt: new Date() 
            } 
          },
          isRead: true
        }
      );
    }

    // Update conversation unread count
    await conversation.markAsReadForUser(req.user._id);

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Send a message (with encryption and follow status check)
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { conversationId, content, messageType = 'text', encryptionKey } = req.body;
    const senderId = req.user._id;

    if (!conversationId || !content) {
      return res.status(400).json({ error: 'Conversation ID and content are required' });
    }

    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(senderId)) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Check messaging permissions (for 1-on-1 conversations)
    if (!conversation.isGroupChat) {
      const otherParticipantId = conversation.participants.find(
        p => p.toString() !== senderId.toString()
      );
      
      const canMessage = await FollowService.canMessage(senderId, otherParticipantId);
      
      if (!canMessage.ok) {
        return res.status(403).json({
          error: 'Cannot send message',
          reason: canMessage.reason
        });
      }
    }

    // Encrypt message content if encryption key is provided
    let encryptedContent = null;
    let originalContent = content;
    
    if (encryptionKey) {
      encryptedContent = encryptMessage(content, encryptionKey);
      if (!encryptedContent) {
        return res.status(500).json({ error: 'Failed to encrypt message' });
      }
      // Store encrypted content instead of plain text
      originalContent = JSON.stringify(encryptedContent);
    }

    // Create message
    const message = new Message({
      conversationId,
      senderId,
      senderName: req.user.name,
      content: originalContent,
      messageType,
      isEncrypted: !!encryptionKey,
      encryptionData: encryptedContent ? {
        iv: encryptedContent.iv,
        authTag: encryptedContent.authTag
      } : null
    });

    await message.save();

    // Update conversation last message
    conversation.lastMessage = content;
    conversation.lastMessageTime = new Date();
    conversation.lastMessageSender = senderId;
    await conversation.save();

    // Populate sender info
    await message.populate('senderId', 'name avatar type');

    // Create notification for other participants
    const Notification = require('../models/Notification');
    const otherParticipants = conversation.participants.filter(p => p.toString() !== senderId.toString());
    
    for (const participantId of otherParticipants) {
      const createdNotification = await Notification.create({
        recipient: participantId,
        sender: senderId,
        type: 'message_received',
        title: 'New Message',
        message: `${req.user.name} sent you a message`,
        category: 'message',
        actionUrl: `/dashboard?section=messages`,
        actionData: {
          conversationId: conversation._id,
          userId: senderId
        },
        metadata: {
          senderName: req.user.name,
          senderAvatar: req.user.avatar,
          messagePreview: content.substring(0, 100) + '...'
        },
        isRead: false
      });
    }

    // Emit socket event for real-time messaging
    const io = req.app.get('io');
    if (io) {
      // Emit to all participants in the conversation
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== senderId.toString()) {
          io.to(`user_${participantId}`).emit('new_message', {
            conversationId: conversation._id,
            message: {
              _id: message._id,
              senderId: message.senderId._id,
              senderName: message.senderName,
              content: content, // Send original content for real-time display
              messageType: message.messageType,
              isEncrypted: !!encryptionKey,
              createdAt: message.createdAt,
              isOwn: false
            }
          });

          // Find and emit the specific notification for this participant
          Notification.findOne({
            recipient: participantId,
            sender: senderId,
            type: 'message_received',
            'actionData.conversationId': conversation._id
          }).sort({ createdAt: -1 }).then(participantNotification => {
            if (participantNotification) {
              io.to(`user_${participantId}`).emit('new_notification', {
                notification: participantNotification,
                timestamp: new Date()
              });
            }
          }).catch(err => {
            console.error('Error finding participant notification:', err);
          });
        }
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      messageId: message._id,
      conversationId: conversation._id
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get online users
router.get('/users/online', authenticateToken, async (req, res) => {
  try {
    // This will be populated by the socket service
    // For now, return empty array
    res.json([]);
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
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

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;
