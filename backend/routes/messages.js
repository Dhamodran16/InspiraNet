const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const FollowService = require('../services/followService');
const MessageDeletionService = require('../services/messageDeletionService');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const router = express.Router();

// Configure multer for message file uploads - supports all common file formats
const messageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    try {
      // Comprehensive list of allowed MIME types for all supported formats
      const allowedMimeTypes = [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml',
        // Videos
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv',
        // Audio
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/ogg', 'audio/webm',
        // Documents
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'text/csv', 'application/csv',
        'text/plain', // .txt
        'text/html', // .html
        'application/xml', 'text/xml', // .xml
        'application/json', // .json
        'text/x-log', // .log
        // Archives
        'application/zip', 'application/x-zip-compressed', // .zip
        // Generic/fallback
        'application/octet-stream'
      ];

      // Check by MIME type (case-insensitive)
      const normalizedMimeType = (file.mimetype || '').toLowerCase().trim();
      if (normalizedMimeType && allowedMimeTypes.some(allowed => allowed.toLowerCase() === normalizedMimeType)) {
        console.log(`✅ File accepted by MIME type: ${file.originalname} (${normalizedMimeType})`);
        return cb(null, true);
      }

      // Also check by file extension as fallback
      const allowedExtensions = [
        // Images
        '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg',
        // Videos
        '.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv',
        // Audio
        '.mp3', '.wav', '.ogg', '.webm',
        // Documents
        '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.txt', '.html', '.xml', '.json', '.log',
        // Archives
        '.zip'
      ];

      const fileExtension = file.originalname ? file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.')) : '';
      if (fileExtension && allowedExtensions.includes(fileExtension)) {
        console.log(`✅ File accepted by extension: ${file.originalname} (${fileExtension})`);
        return cb(null, true);
      }

      // Reject if neither MIME type nor extension matches
      console.error(`❌ File rejected: ${file.originalname || 'unknown'}, MIME: ${file.mimetype || 'unknown'}, Extension: ${fileExtension || 'none'}`);
      cb(new Error(`File type not supported: ${file.originalname || 'unknown file'}. Allowed formats: Images (JPG, PNG, WEBP, GIF, BMP, SVG), Videos (MP4, WEBM, OGG, MOV, AVI, WMV), Audio (MP3, WAV, OGG, WEBM), Documents (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, TXT, HTML, XML, JSON, LOG), Archives (ZIP)`), false);
    } catch (error) {
      console.error('Error in fileFilter:', error);
      cb(new Error(`Error validating file: ${error.message}`), false);
    }
  }
});

// Helper function to encrypt message content with proper GCM mode
const encryptMessage = (content, encryptionKey) => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
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

// Helper function to decrypt message content with proper GCM mode
const decryptMessage = (encryptedData, encryptionKey) => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
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

// PDF Download Proxy Endpoint - Serves PDFs with correct headers
// IMPORTANT: Place this route early to avoid conflicts with other routes
router.get('/download/:messageId', authenticateToken, async (req, res) => {
  console.log('📥 PDF Download endpoint hit:', req.params.messageId);
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user has access to the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if message has a media URL
    if (!message.mediaUrl) {
      return res.status(404).json({ error: 'No file attached to this message' });
    }

    // Check if it's a PDF
    const isPdf = message.messageType === 'pdf' || 
                  (message.fileName && message.fileName.toLowerCase().endsWith('.pdf'));

    if (!isPdf) {
      return res.status(400).json({ error: 'This endpoint only serves PDF files' });
    }

    // Fetch the PDF from Cloudinary
    const cloudinaryUrl = message.mediaUrl;
    
    // Convert /image/upload/ to /raw/upload/ if needed
    let downloadUrl = cloudinaryUrl;
    if (cloudinaryUrl.includes('/image/upload/')) {
      downloadUrl = cloudinaryUrl.replace(/\/image\/upload\//, '/raw/upload/');
    }

    // Add fl_attachment parameter for proper download
    const separator = downloadUrl.includes('?') ? '&' : '?';
    downloadUrl = `${downloadUrl}${separator}fl_attachment=${encodeURIComponent(message.fileName || 'document.pdf')}`;

    console.log('📥 Fetching PDF from Cloudinary:', downloadUrl);

    // Fetch the PDF with proper headers
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'arraybuffer', // Get binary data
      headers: {
        'Accept': 'application/pdf, */*'
      },
      timeout: 30000
    });

    // Verify we got PDF data (check first bytes for PDF signature)
    const buffer = Buffer.from(response.data);
    const pdfSignature = buffer.slice(0, 4).toString();
    
    if (pdfSignature !== '%PDF') {
      console.error('❌ Invalid PDF signature:', pdfSignature);
      return res.status(500).json({ error: 'Invalid PDF file received from Cloudinary' });
    }

    // Set correct headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(message.fileName || 'document.pdf')}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, max-age=0');

    // Send the PDF binary data
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error downloading PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to download PDF',
        details: error.message 
      });
    }
  }
});

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
    if (!conversation) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Ensure userId is ObjectId for proper comparison
    const userIdObj = mongoose.Types.ObjectId.isValid(req.user._id) 
      ? new mongoose.Types.ObjectId(req.user._id) 
      : req.user._id;
    
    // Check if user is participant (convert to ObjectId for comparison)
    const isParticipant = conversation.participants.some(
      p => p.toString() === userIdObj.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get messages excluding those deleted for this user
    // CRITICAL: This query excludes messages where deletedBy contains THIS user's ID
    // So if User B cleared chat, User A's query excludes messages deleted for User A (not User B)
    
    // CRITICAL FIX: Ensure userIdObj is properly formatted as ObjectId for comparison
    // Don't create a new ObjectId if it's already one - use it directly
    const userIdForQuery = userIdObj instanceof mongoose.Types.ObjectId 
      ? userIdObj 
      : (mongoose.Types.ObjectId.isValid(userIdObj) ? new mongoose.Types.ObjectId(userIdObj) : userIdObj);
    
    const query = {
      conversationId,
      // Exclude messages hard deleted
      'deletionMetadata.hardDeleted': { $ne: true },
      // Exclude messages deleted for everyone (unless user is sender)
      $or: [
        { 'deletionMetadata.deletedForEveryone': { $ne: true } },
        { 'deletionMetadata.deletedForEveryone': { $exists: false } },
        { senderId: userIdForQuery }
      ],
      // Exclude messages already deleted for this user (forMe mode)
      // Use $nor to exclude messages where deletedBy contains this userId with deleteMode 'forMe'
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
    const totalMessagesInConversation = await Message.countDocuments({ conversationId });
    console.log('📊 Total messages in conversation (before filtering):', totalMessagesInConversation);
    
    // Get messages with the query
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('senderId', 'name avatar');
    
    console.log('✅ Found', messages.length, 'messages for user:', userIdForQuery.toString(), 'after filtering');
    
    // Enhanced debug: Check a sample message's deletedBy array if no messages found
    if (messages.length === 0 && totalMessagesInConversation > 0) {
      console.log('⚠️ WARNING: No messages found but conversation has', totalMessagesInConversation, 'messages');
      const sampleMessages = await Message.find({ conversationId }).limit(3).lean();
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

    // Format messages for frontend
    const formattedMessages = messages.reverse().map(msg => {
      const isOwn = msg.senderId._id.toString() === req.user._id.toString();
      
      return {
      _id: msg._id,
      senderId: msg.senderId._id,
      senderName: msg.senderName,
      content: msg.content,
      messageType: msg.messageType,
      mediaUrl: msg.mediaUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      isRead: msg.isRead,
      readBy: msg.readBy,
      createdAt: msg.createdAt,
      timeAgo: msg.timeAgo,
        isOwn: isOwn
      };
    });

    // Count total messages with same filtering
    const totalCount = await Message.countDocuments({
      conversationId,
      // Exclude messages hard deleted
      'deletionMetadata.hardDeleted': { $ne: true },
      // Exclude messages deleted for everyone (unless user is sender)
      $or: [
        { 'deletionMetadata.deletedForEveryone': { $ne: true } },
        { 'deletionMetadata.deletedForEveryone': { $exists: false } },
        { senderId: userIdForQuery }
      ],
      // Exclude messages already deleted for this user (forMe mode)
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
    });

    res.json({
      messages: formattedMessages,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message to conversation (POST /conversations/:id/messages)
router.post('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, mediaUrl, fileName, fileSize, messageType = 'text' } = req.body;
    const senderId = req.user._id;

    if (!content && !mediaUrl) {
      return res.status(400).json({ error: 'Content or media is required' });
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

    // Create message
    const message = new Message({
      conversationId,
      senderId,
      senderName: req.user.name,
      content: content || '',
      messageType,
      mediaUrl,
      fileName,
      fileSize,
      isEncrypted: false
    });

    await message.save();

    // Update conversation last message
    conversation.lastMessage = content || `[${messageType}]`;
    conversation.lastMessageTime = new Date();
    conversation.lastMessageSender = senderId;
    await conversation.save();

    // Populate sender info
    await message.populate('senderId', 'name avatar type');

    // Create notification for other participants
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
          messagePreview: (content || `[${messageType}]`).substring(0, 100) + '...'
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
              content: content,
              messageType: message.messageType,
              mediaUrl: message.mediaUrl,
              fileName: message.fileName,
              fileSize: message.fileSize,
              isEncrypted: false,
              createdAt: message.createdAt,
              isOwn: false // This is correct - other participants receive isOwn: false
            }
          });
        } else {
          // Send to sender with isOwn: true
          io.to(`user_${participantId}`).emit('new_message', {
            conversationId: conversation._id,
            message: {
              _id: message._id,
              senderId: message.senderId._id,
              senderName: message.senderName,
              content: content,
              messageType: message.messageType,
              mediaUrl: message.mediaUrl,
              fileName: message.fileName,
              fileSize: message.fileSize,
              isEncrypted: false,
              createdAt: message.createdAt,
              isOwn: true // Sender receives isOwn: true
            }
          });
        }
      });
    }

    res.status(201).json({
      success: true,
      message: {
        _id: message._id,
        conversationId: conversation._id,
        senderId: message.senderId._id,
        senderName: message.senderName,
        content: content,
        messageType: message.messageType,
        mediaUrl: message.mediaUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        isEncrypted: false,
        createdAt: message.createdAt,
        isOwn: true
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark individual message as read
router.put('/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find message and verify user has access
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user is part of the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this message' });
    }

    // Mark message as read
    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { 
        readBy: { 
          userId: userId, 
          readAt: new Date() 
        } 
      },
      isRead: true
    });

    // Update conversation unread count
    await conversation.markAsReadForUser(userId);

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// File upload endpoint
router.post('/upload', authenticateToken, (req, res, next) => {
  messageUpload.single('file')(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
            }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      // This catches fileFilter errors
      console.error('❌ File upload error:', err.message);
      return res.status(400).json({ error: err.message || 'File upload failed' });
        }
    next();
  });
}, async (req, res) => {
  console.log('📤 Upload request received');
  console.log('Request headers:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length']
  });
  
  try {
    // Check if file was uploaded
        if (!req.file) {
      console.error('❌ No file in request');
      console.error('Request body keys:', Object.keys(req.body));
      console.error('Request files:', req.files);
      return res.status(400).json({ 
        error: 'No file uploaded',
        hint: 'Make sure to send file with field name "file" in FormData'
      });
        }

    console.log('✅ File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer,
      bufferLength: req.file.buffer ? req.file.buffer.length : 0
    });

    // Get conversationId from request body
      const { conversationId } = req.body;
    console.log('Conversation ID from request:', conversationId);

    // Verify conversation access if conversationId is provided
      if (conversationId) {
      try {
        console.log('🔍 Verifying conversation access:', conversationId);
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          console.error('❌ Conversation not found:', conversationId);
          return res.status(404).json({ error: 'Conversation not found' });
        }
        
        // Check if user is a participant
        const isParticipant = conversation.participants.some(
          p => p.toString() === req.user._id.toString()
        );
        
        if (!isParticipant) {
          console.error('❌ Access denied - user not a participant');
          console.error('User ID:', req.user._id);
          console.error('Participants:', conversation.participants);
          return res.status(403).json({ error: 'Access denied to this conversation' });
        }
        
        console.log('✅ Conversation access verified');
      } catch (conversationError) {
        console.error('❌ Error verifying conversation:', conversationError);
        return res.status(500).json({ 
          error: 'Failed to verify conversation access',
          details: conversationError.message 
        });
      }
    }

    // Determine file type
    const isImage = req.file.mimetype.startsWith('image/');
    const isVideo = req.file.mimetype.startsWith('video/');
    const isAudio = req.file.mimetype.startsWith('audio/') || 
                    req.file.mimetype === 'audio/mpeg' || 
                    req.file.mimetype === 'audio/mp3' ||
                    req.file.mimetype === 'audio/wav' ||
                    req.file.mimetype === 'audio/wave' ||
                    req.file.mimetype === 'audio/x-wav';
    const isPdf = req.file.mimetype === 'application/pdf';
    const isDocument = req.file.mimetype.includes('wordprocessingml') ||
                      req.file.mimetype.includes('presentationml') ||
                      req.file.mimetype.includes('spreadsheetml') ||
                      req.file.mimetype.includes('msword') ||
                      req.file.mimetype.includes('ms-powerpoint') ||
                      req.file.mimetype.includes('ms-excel') ||
                      req.file.mimetype === 'text/csv' ||
                      req.file.mimetype === 'application/csv';
    const isText = req.file.mimetype.startsWith('text/') || 
                  req.file.mimetype === 'application/json' ||
                  req.file.mimetype === 'application/xml' ||
                  req.file.mimetype === 'text/xml';
    const isArchive = req.file.mimetype === 'application/zip' || 
                     req.file.mimetype === 'application/x-zip-compressed';
    
    console.log('File type detection:', { 
      isImage, 
      isVideo, 
      isAudio,
      isPdf, 
      isDocument,
      isText,
      isArchive,
      mimetype: req.file.mimetype 
    });

    // Upload to Cloudinary using buffer from memory storage
    let mediaUrl;
    
    try {
      console.log('☁️ Starting Cloudinary upload...');
      console.log('Cloudinary config check:', {
        hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
      });
      
      // Validate buffer
      if (!req.file.buffer || !Buffer.isBuffer(req.file.buffer)) {
        throw new Error('Invalid buffer - buffer is missing or not a Buffer instance');
      }

      // Prepare upload options based on file type
      let uploadOptions = {
        folder: 'infranet/messages',
        public_id: `${Date.now()}_${req.file.originalname.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}`,
        overwrite: false
      };

      // Set resource_type based on file type
      if (isImage) {
        uploadOptions.resource_type = 'image';
        uploadOptions.transformation = [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto' }
        ];
      } else if (isVideo) {
        uploadOptions.resource_type = 'video';
      } else if (isAudio) {
        // Audio files should be uploaded as 'raw' in Cloudinary
        uploadOptions.resource_type = 'raw';
      } else {
        // All other files (documents, archives, text files) as raw
        uploadOptions.resource_type = 'raw';
      }

      console.log('Upload options:', uploadOptions);

      // Upload to Cloudinary using upload_stream (matches posts route pattern)
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload_stream error:', error);
              console.error('Error details:', error.message);
              console.error('Error code:', error.http_code);
              console.error('Error stack:', error.stack);
              reject(error);
            } else {
              console.log('✅ File uploaded successfully to Cloudinary:', result.secure_url);
              resolve(result);
            }
          }
        );
        
        // Handle stream errors
        uploadStream.on('error', (streamError) => {
          console.error('❌ Upload stream error event:', streamError);
          reject(streamError);
        });
        
        // Write buffer to stream
        try {
          uploadStream.end(req.file.buffer);
        } catch (writeError) {
          console.error('❌ Error writing to stream:', writeError);
          reject(writeError);
        }
      });
      
      mediaUrl = result.secure_url;
      console.log('✅ Cloudinary upload successful:', mediaUrl);
      
    } catch (cloudinaryError) {
      console.error('❌ Cloudinary upload error:', cloudinaryError);
      console.error('Error type:', cloudinaryError.constructor.name);
      console.error('Error message:', cloudinaryError.message);
      console.error('Error stack:', cloudinaryError.stack);
      
      // If Cloudinary is not configured or fails, use data URL as fallback for small files
      if (req.file.size < 100000) { // Less than 100KB
        console.log('⚠️ Using data URL fallback for small file');
        try {
          mediaUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          console.log('✅ Data URL fallback created (length:', mediaUrl.length, ')');
        } catch (base64Error) {
          console.error('❌ Error creating data URL:', base64Error);
          return res.status(500).json({ 
            error: 'Failed to process file',
            details: 'Both Cloudinary upload and data URL fallback failed',
            cloudinaryError: cloudinaryError.message,
            fallbackError: base64Error.message
          });
        }
      } else {
        console.error('❌ Cloudinary upload failed and file is too large for data URL fallback');
        return res.status(500).json({ 
          error: 'Failed to upload file to storage',
          details: cloudinaryError.message || 'Cloudinary upload failed. Please check configuration.',
          hint: 'File size is too large for fallback. Ensure Cloudinary is properly configured.'
        });
      }
    }

    // Determine message type
    let messageType = 'file';
    if (isImage) {
      messageType = 'image';
    } else if (isVideo) {
      messageType = 'video';
    } else if (isAudio) {
      messageType = 'file'; // Audio files are treated as regular files for display
    } else if (isPdf) {
      messageType = 'pdf';
    } else {
      messageType = 'file'; // All other files (documents, archives, text files)
    }

    // Send success response
    const response = {
        success: true,
      mediaUrl: mediaUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      messageType: messageType
    };

    console.log('✅ Upload successful, sending response:', {
      ...response,
      mediaUrl: mediaUrl.substring(0, 50) + '...'
      });

    res.json(response);

    } catch (error) {
    console.error('❌ Unexpected error in upload endpoint:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request file info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer
    } : 'No file');
    
    // Ensure we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to upload file',
        details: error.message,
        errorType: error.name
      });
    } else {
      console.error('⚠️ Response already sent, cannot send error response');
    }
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

// Get all users for group member selection
router.get('/users/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { search = '', limit = 50 } = req.query;
    
    // Build search query
    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Exclude current user
    const users = await User.find({
      _id: { $ne: userId },
      ...searchQuery
    })
    .select('name avatar email type department')
    .limit(parseInt(limit))
    .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create group conversation
router.post('/conversation/group', authenticateToken, async (req, res) => {
  try {
    const { participants, groupName, groupDescription } = req.body;
    const userId = req.user.id;
    
    console.log('Group creation request:', { participants, groupName, groupDescription, userId });

    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'Participants array is required' });
    }

    if (participants.length < 2) {
      return res.status(400).json({ error: 'At least 2 members are required to create a group' });
    }

    if (!groupName || groupName.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Add creator to participants
    const allParticipants = [...new Set([userId, ...participants])];

    // Verify all participants exist
    const users = await User.find({ _id: { $in: allParticipants } });
    if (users.length !== allParticipants.length) {
      return res.status(400).json({ error: 'Some participants do not exist' });
    }

    // Create group conversation
    const conversation = new Conversation({
      participants: allParticipants,
      isGroupChat: true,
      groupName: groupName.trim(),
      groupDescription: groupDescription?.trim() || '',
      groupAdmin: userId,
      lastMessageContent: '',
      lastMessageTime: new Date(),
      unreadCount: new Map()
    });

    await conversation.save();

    // Populate participants
    await conversation.populate('participants', 'name avatar email');

    // Emit socket event to all participants
    const io = req.app.get('io');
    if (io) {
      allParticipants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('group_created', {
          conversation: conversation,
          createdBy: userId
        });
      });
    }

    res.status(201).json({
      success: true,
      conversation,
      message: 'Group created successfully'
    });

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Clear chat (delete all messages in a conversation - only for the user who clears it)
router.delete('/conversation/:conversationId/clear', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id || req.user.id;
    
    // Ensure userId is ObjectId for proper comparison
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;

    // Verify user is participant in conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is participant (convert to ObjectId for comparison)
    const isParticipant = conversation.participants.some(
      p => p.toString() === userIdObj.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    // Get all messages in the conversation that are NOT deleted for this user
    // We need to find messages where deletedBy array doesn't contain this userId with deleteMode 'forMe'
    const allMessages = await Message.find({ 
      conversationId,
      // Exclude messages hard deleted
      'deletionMetadata.hardDeleted': { $ne: true },
      // Exclude messages deleted for everyone (unless user is sender)
      $or: [
        { 'deletionMetadata.deletedForEveryone': { $ne: true } },
        { 'deletionMetadata.deletedForEveryone': { $exists: false } },
        { senderId: userIdObj }
      ],
      // Exclude messages already deleted for this user (forMe mode)
      // Use $nor to exclude messages where deletedBy contains this userId with deleteMode 'forMe'
      // CRITICAL: Ensure userIdObj is properly converted to ObjectId for matching
      $nor: [
        {
          deletedBy: {
            $elemMatch: {
              userId: mongoose.Types.ObjectId.isValid(userIdObj) ? new mongoose.Types.ObjectId(userIdObj) : userIdObj,
              deleteMode: 'forMe'
            }
          }
        }
      ]
    });

    if (allMessages.length === 0) {
      return res.json({ 
        success: true, 
        deletedCount: 0,
        message: 'Chat is already cleared for you'
      });
    }
    
    console.log('Clear chat - Found', allMessages.length, 'messages to mark as deleted for user:', userIdObj.toString());

    const messageIds = allMessages.map(msg => msg._id.toString());

    console.log('Clear chat - User:', userIdObj.toString(), 'Messages to clear:', messageIds.length);

    // Use DeleteForMe to clear messages only for this user
    const result = await MessageDeletionService.deleteForMe(messageIds, userIdObj, conversationId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    console.log('Clear chat - Successfully marked', result.deletedCount, 'messages as deleted for user:', userIdObj.toString());

    // Update conversation lastMessage if needed (only if all participants have deleted it)
    // For now, we'll keep the lastMessage as is since other participants can still see it
    // The conversation preview will be updated when they load messages

    // Emit socket event ONLY to the user who cleared the chat
    // This is critical - we must NOT broadcast to all participants
    const io = req.app.get('io');
    if (io) {
      // CRITICAL: Only emit to the specific user who cleared, NOT to conversation room
      // Using user_${userId} ensures only that user receives the event
      // DO NOT use conversation_${conversationId} as that would notify all participants
      const userRoom = `user_${userIdObj.toString()}`;
      console.log('Clear chat - Emitting socket event ONLY to user:', userRoom, 'NOT to conversation room');
      
      io.to(userRoom).emit('chat_cleared_for_me', {
        conversationId,
        clearedBy: userIdObj.toString(),
        deletedCount: result.deletedCount
      });
      
      // Verify we're NOT emitting to conversation room
      // This ensures User B does NOT receive the clear event
    }

    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: 'Chat cleared successfully (only for you)'
    });

  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
});

// Delete entire conversation
router.delete('/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id || req.user.id;

    // Verify user is participant in conversation
    const conversation = await Conversation.findById(conversationId)
      .populate('groupAdmin', '_id');
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    // For group chats, only admin can delete
    if (conversation.isGroupChat) {
      const groupAdminId = typeof conversation.groupAdmin === 'object' && conversation.groupAdmin !== null
        ? conversation.groupAdmin._id?.toString()
        : conversation.groupAdmin?.toString();
      
      if (groupAdminId !== userId.toString()) {
        return res.status(403).json({ 
          error: 'Only group admin can delete the group' 
        });
      }
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId });

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversationId);

    // Emit socket event to all participants
    const io = req.app.get('io');
    if (io) {
      conversation.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('conversation_deleted', {
        conversationId,
        deletedBy: userId
        });
      });
    }

    res.json({ 
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// ==================== COMPREHENSIVE DELETION SYSTEM ====================

// 1. Delete For Me
router.post('/delete-for-me', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    const result = await MessageDeletionService.deleteForMe(messageIds, userId, conversationId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('messages_deleted_for_me', {
        messageIds: result.messageIds,
        conversationId
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in delete-for-me:', error);
    res.status(500).json({ error: 'Failed to delete messages' });
  }
});

// 2. Delete For Everyone
router.post('/delete-for-everyone', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId, timeWindow } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    const result = await MessageDeletionService.deleteForEveryone(
      messageIds, 
      userId, 
      conversationId,
      { timeWindow }
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Emit socket event to all participants
    const io = req.app.get('io');
    if (io) {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.participants.forEach(participantId => {
          io.to(`user_${participantId}`).emit('messages_deleted_for_everyone', {
            messageIds: result.messageIds,
            conversationId,
            deletedBy: userId
          });
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error in delete-for-everyone:', error);
    res.status(500).json({ error: 'Failed to delete messages' });
  }
});

// 3. Grace Delete (Queue deletion for offline devices)
router.post('/grace-delete', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId, participantIds } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    const result = await MessageDeletionService.graceDelete(
      messageIds, 
      userId, 
      conversationId,
      participantIds
    );

    res.json(result);
  } catch (error) {
    console.error('Error in grace-delete:', error);
    res.status(500).json({ error: 'Failed to queue grace delete' });
  }
});

// 4. Soft Delete
router.post('/soft-delete', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    const result = await MessageDeletionService.softDelete(
      messageIds, 
      userId, 
      conversationId
    );

    res.json(result);
  } catch (error) {
    console.error('Error in soft-delete:', error);
    res.status(500).json({ error: 'Failed to soft delete messages' });
  }
});

// 5. Hard Delete
router.post('/hard-delete', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId, deleteMedia = true } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    // Check if user has permission (only sender or admin)
    const messages = await Message.find({
      _id: { $in: messageIds },
      conversationId
    });

    const allOwnMessages = messages.every(
      msg => msg.senderId.toString() === userId.toString()
    );

    if (!allOwnMessages) {
      // Check if user is group admin
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.isGroupChat) {
        return res.status(403).json({ error: 'You can only hard delete your own messages' });
      }

      const groupAdminId = typeof conversation.groupAdmin === 'object' && conversation.groupAdmin !== null
        ? conversation.groupAdmin._id?.toString()
        : conversation.groupAdmin?.toString();
      
      if (groupAdminId !== userId.toString()) {
        return res.status(403).json({ error: 'Only group admin can hard delete messages' });
      }
    }

    const result = await MessageDeletionService.hardDelete(
      messageIds, 
      userId, 
      conversationId,
      { deleteMedia }
    );

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.participants.forEach(participantId => {
          io.to(`user_${participantId}`).emit('messages_hard_deleted', {
            messageIds: result.messageIds,
            conversationId
          });
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error in hard-delete:', error);
    res.status(500).json({ error: 'Failed to hard delete messages' });
  }
});

// 6. Set Auto Delete (Disappearing Messages)
router.post('/set-auto-delete', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId, duration } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    if (!duration) {
      return res.status(400).json({ error: 'Duration is required' });
    }

    const result = await MessageDeletionService.setAutoDelete(
      messageIds, 
      userId, 
      conversationId,
      duration
    );

    res.json(result);
  } catch (error) {
    console.error('Error in set-auto-delete:', error);
    res.status(500).json({ error: 'Failed to set auto-delete' });
  }
});

// 7. Admin Delete (Group chats)
router.post('/admin-delete', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    // Check if user is group admin
    const conversation = await Conversation.findById(conversationId)
      .populate('groupAdmin', '_id');

    if (!conversation || !conversation.isGroupChat) {
      return res.status(400).json({ error: 'Admin delete only available for group chats' });
    }

    const groupAdminId = typeof conversation.groupAdmin === 'object' && conversation.groupAdmin !== null
      ? conversation.groupAdmin._id?.toString()
      : conversation.groupAdmin?.toString();
    
    let isGroupAdmin = groupAdminId === userId.toString();

    // Check additional admins
    if (!isGroupAdmin && conversation.groupAdmins && conversation.groupAdmins.length > 0) {
      const isAdditionalAdmin = conversation.groupAdmins.some(admin => {
        const adminId = typeof admin === 'object' && admin !== null
          ? admin._id?.toString()
          : admin.toString();
        return adminId === userId.toString();
      });
      if (isAdditionalAdmin) {
        isGroupAdmin = true;
      }
    }

    if (!isGroupAdmin) {
      return res.status(403).json({ error: 'Only group admin can use admin delete' });
    }

    // Admin delete uses deleteForEveryone with skipTimeWindow
    const result = await MessageDeletionService.deleteForEveryone(
      messageIds, 
      userId, 
      conversationId,
      { skipTimeWindow: true }
    );

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      conversation.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('messages_admin_deleted', {
          messageIds: result.messageIds,
          conversationId,
          deletedBy: userId
        });
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in admin-delete:', error);
    res.status(500).json({ error: 'Failed to admin delete messages' });
    }
});

// 8. Bulk Delete (Enhanced)
router.post('/bulk-delete-enhanced', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId, deleteMode, options = {} } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    if (!deleteMode || !['forMe', 'forEveryone', 'hard', 'soft'].includes(deleteMode)) {
      return res.status(400).json({ error: 'Valid delete mode is required' });
    }

    const result = await MessageDeletionService.bulkDelete(
      messageIds, 
      userId, 
      conversationId,
      deleteMode,
      options
    );

    // Emit socket event based on delete mode
    const io = req.app.get('io');
    if (io) {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        if (deleteMode === 'forEveryone' || deleteMode === 'hard') {
          conversation.participants.forEach(participantId => {
            io.to(`user_${participantId}`).emit('messages_bulk_deleted', {
              messageIds: result.messageIds,
              conversationId,
              deleteMode
            });
          });
        } else {
          io.to(`user_${userId}`).emit('messages_bulk_deleted', {
            messageIds: result.messageIds,
            conversationId,
            deleteMode
          });
        }
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error in bulk-delete-enhanced:', error);
    res.status(500).json({ error: 'Failed to bulk delete messages' });
  }
});

// 9. Media Delete
router.post('/media-delete', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId, deleteMessage = false, deleteLocalOnly = false } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    const result = await MessageDeletionService.mediaDelete(
      messageIds, 
      userId, 
      conversationId,
      { deleteMessage, deleteLocalOnly }
    );

    res.json(result);
  } catch (error) {
    console.error('Error in media-delete:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// 11. Unsent Message Delete
router.post('/unsent-delete', authenticateToken, async (req, res) => {
  try {
    const { messageIds, conversationId } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    const result = await MessageDeletionService.unsentMessageDelete(
      messageIds, 
      userId, 
      conversationId
    );

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('unsent_messages_deleted', {
        messageIds: result.messageIds,
        conversationId
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in unsent-delete:', error);
    res.status(500).json({ error: 'Failed to delete unsent messages' });
  }
});

// 12. Server Cleanup (Admin only)
router.post('/server-cleanup', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin (you may want to add admin check middleware)
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (user.type !== 'admin') {
      return res.status(403).json({ error: 'Only admins can run server cleanup' });
    }

    const { options = {} } = req.body;

    const result = await MessageDeletionService.serverCleanup(options);

    res.json(result);
  } catch (error) {
    console.error('Error in server-cleanup:', error);
    res.status(500).json({ error: 'Failed to run server cleanup' });
  }
});

// Process grace delete queue (called when user comes online)
router.post('/process-grace-delete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await MessageDeletionService.processGraceDeleteQueue(userId);

    res.json(result);
  } catch (error) {
    console.error('Error processing grace delete queue:', error);
    res.status(500).json({ error: 'Failed to process grace delete queue' });
  }
});

const handleBulkDelete = async (req, res) => {
  try {
    const { messageIds, conversationId, isGroupChat, isGroupAdmin } = req.body;
    const userId = req.user._id || req.user.id;
    
    console.log('Bulk delete request:', { 
      method: req.method,
      messageIds, 
      userId, 
      conversationId, 
      isGroupChat, 
      isGroupAdmin 
    });

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }

    // Get all messages to check permissions
    const allMessages = await Message.find({
      _id: { $in: messageIds }
    }).populate('conversationId');

    if (allMessages.length === 0) {
      return res.status(200).json({ 
        success: true,
        deletedCount: 0,
        message: 'No messages found to delete. They may have already been removed.'
      });
    }

    const existingMessageIds = allMessages.map(msg => msg._id.toString());
    const missingMessageIds = messageIds.filter(id => !existingMessageIds.includes(id.toString()));

    // Helper to resolve IDs when populate returns documents
    const resolveId = (value) => {
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (value instanceof mongoose.Types.ObjectId) return value.toString();
      if (typeof value === 'object') {
        if (value._id) {
          if (value._id instanceof mongoose.Types.ObjectId) {
            return value._id.toString();
          }
          if (typeof value._id === 'string') {
            return value._id;
          }
        }
        if (typeof value.toString === 'function') {
          const asString = value.toString();
          if (asString && !asString.startsWith('[object')) {
            return asString;
          }
        }
      }
      return null;
    };

    // Check if this is a group chat
    const firstMessage = allMessages[0];
    const resolvedConversationId = resolveId(firstMessage.conversationId) || resolveId(conversationId);

    if (!resolvedConversationId) {
      return res.status(400).json({ error: 'Conversation not found for the provided messages' });
    }

    const conversation = await Conversation.findById(resolvedConversationId)
      .populate('groupAdmin', '_id')
      .populate('groupAdmins', '_id');
    
    const isGroup = conversation?.isGroupChat || isGroupChat;
    
    // Check if user is group admin (main admin or additional admin)
    let userIsGroupAdmin = false;
    if (isGroup && conversation) {
      // Check main admin
      if (conversation.groupAdmin) {
        const groupAdminId = typeof conversation.groupAdmin === 'object' && conversation.groupAdmin !== null
          ? conversation.groupAdmin._id?.toString()
          : conversation.groupAdmin.toString();
        userIsGroupAdmin = groupAdminId === userId.toString();
    }

      // Check additional admins
      if (!userIsGroupAdmin && conversation.groupAdmins && conversation.groupAdmins.length > 0) {
        userIsGroupAdmin = conversation.groupAdmins.some(admin => {
          const adminId = typeof admin === 'object' && admin !== null
            ? admin._id?.toString()
            : admin.toString();
          return adminId === userId.toString();
        });
      }
    }

    console.log('Permission check:', {
      isGroup,
      userIsGroupAdmin,
      groupAdmin: conversation?.groupAdmin,
      userId
    });

    // Build delete query based on permissions
    let deleteQuery;
    
    if (isGroup && userIsGroupAdmin) {
      // Group admin can delete any message in the group
      deleteQuery = { _id: { $in: existingMessageIds } };
      console.log('Group admin deleting messages - can delete all');
    } else {
      // Regular users can only delete their own messages
      deleteQuery = {
        _id: { $in: existingMessageIds },
      senderId: userId
      };
      
      // Check if user is trying to delete messages they don't own
      const ownMessages = allMessages.filter(msg => 
        msg.senderId.toString() === userId.toString()
      );
      
      if (ownMessages.length < allMessages.length) {
        console.log('Some messages cannot be deleted - user can only delete their own messages');
        if (isGroup) {
          return res.status(403).json({ 
            error: 'You can only delete your own messages. Group admin can delete any message.' 
          });
        }
        return res.status(403).json({ 
          error: 'You can only delete your own messages.' 
        });
      }
    }

    // Delete messages
    const result = await Message.deleteMany(deleteQuery);

    // Update conversation lastMessage if needed
    const conversationIds = [
      ...new Set(
        allMessages
          .map(msg => resolveId(msg.conversationId))
          .filter(Boolean)
      )
    ];
    
    for (const conversationId of conversationIds) {
      const lastMessage = await Message.findOne({ conversationId })
        .sort({ createdAt: -1 });
      
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessageContent: lastMessage ? lastMessage.content : '',
        lastMessageTime: lastMessage ? lastMessage.createdAt : new Date()
      });
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      conversationIds.forEach(conversationId => {
        io.to(`conversation_${conversationId}`).emit('messages_deleted', {
          messageIds: existingMessageIds,
          conversationId,
          deletedBy: userId
        });
      });
    }

    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} messages deleted successfully`,
      missingMessageIds
    });

  } catch (error) {
    console.error('Error deleting messages:', error);
    res.status(500).json({ error: 'Failed to delete messages' });
  }
};

// Bulk delete messages (supports DELETE for legacy clients)
router.delete('/bulk', authenticateToken, handleBulkDelete);

// Fallback POST endpoint (used by frontend to avoid DELETE bodies issues)
router.post('/bulk-delete', authenticateToken, handleBulkDelete);

module.exports = router;
