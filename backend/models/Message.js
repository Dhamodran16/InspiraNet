const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true // Add index for better query performance
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Add index for better query performance
  },
  senderName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  // Encrypted content for private messages
  encryptedContent: {
    encrypted: String,
    iv: String,
    authTag: String
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  mediaUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Message metadata for better organization
  metadata: {
    isPrivate: {
      type: Boolean,
      default: true // All messages between mutually followed users are private
    },
    conversationType: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct'
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  // Soft delete support
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ 'metadata.isPrivate': 1 });
messageSchema.index({ isDeleted: 1 });

// Virtual for timeAgo
messageSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.createdAt) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 2592000)} months ago`;
});

// Method to mark message as read
messageSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.some(read => read.userId.toString() === userId.toString())) {
    this.readBy.push({
      userId: userId,
      readAt: new Date()
    });
    this.isRead = true;
  }
  return this.save();
};

// Method to soft delete message for a user
messageSchema.methods.softDeleteForUser = function(userId) {
  if (!this.deletedBy.some(deleted => deleted.userId.toString() === userId.toString())) {
    this.deletedBy.push({
      userId: userId,
      deletedAt: new Date()
    });
  }
  return this.save();
};

// Static method to get messages for a conversation (excluding deleted messages for user)
messageSchema.statics.getMessagesForConversation = function(conversationId, userId, page = 1, limit = 50) {
  return this.find({
    conversationId,
    isDeleted: false,
    $or: [
      { 'deletedBy.userId': { $ne: userId } },
      { deletedBy: { $exists: false } }
    ]
  })
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .populate('senderId', 'name avatar type')
  .populate('readBy.userId', 'name avatar')
  .populate('deletedBy.userId', 'name');
};

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);
