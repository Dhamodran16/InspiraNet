const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  establishedAt: {
    type: Date,
    default: Date.now
  },
  // Track who initiated the connection
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Connection type (follow, mutual, etc.)
  type: {
    type: String,
    enum: ['follow', 'mutual', 'alumni_student'],
    default: 'mutual'
  },
  // Status of the connection
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Ensure unique connections between users
connectionSchema.index(
  { user1: 1, user2: 1 },
  { unique: true }
);

// Index for efficient queries
connectionSchema.index({ user1: 1, status: 1, establishedAt: -1 });
connectionSchema.index({ user2: 1, status: 1, establishedAt: -1 });
connectionSchema.index({ type: 1, status: 1 });

// Virtual for getting the other user in the connection
connectionSchema.virtual('otherUser').get(function() {
  return this.user1 === this.user1 ? this.user2 : this.user1;
});

// Method to check if a user is part of this connection
connectionSchema.methods.includesUser = function(userId) {
  return this.user1.toString() === userId.toString() || 
         this.user2.toString() === userId.toString();
};

// Method to get the other user in the connection
connectionSchema.methods.getOtherUser = function(userId) {
  if (this.user1.toString() === userId.toString()) {
    return this.user2;
  }
  if (this.user2.toString() === userId.toString()) {
    return this.user1;
  }
  return null;
};

module.exports = mongoose.model('Connection', connectionSchema); 