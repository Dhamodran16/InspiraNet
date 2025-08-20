const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageContent: {
    type: String,
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: null
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for conversation name (for 1-on-1 chats)
conversationSchema.virtual('conversationName').get(function() {
  if (this.isGroupChat) {
    return this.groupName;
  }
  // For 1-on-1 chats, this will be populated by the application
  return null;
});

// Method to get conversation name for a specific user
conversationSchema.methods.getConversationNameForUser = function(userId) {
  if (this.isGroupChat) {
    return this.groupName;
  }
  
  // For 1-on-1 chats, return the other participant's name
  const otherParticipant = this.participants.find(p => p.toString() !== userId.toString());
  return otherParticipant ? otherParticipant.name : 'Unknown User';
};

// Method to mark messages as read for a user
conversationSchema.methods.markAsReadForUser = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

// Method to increment unread count for a user
conversationSchema.methods.incrementUnreadForUser = function(userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
  return this.save();
};

// Ensure virtual fields are serialized
conversationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Conversation', conversationSchema);
