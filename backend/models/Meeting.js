const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hostId: {
    type: String,
    required: true
  },
  hostName: {
    type: String,
    required: true
  },
  participants: [{
    userId: String,
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  messages: [{
    userId: String,
    username: String,
    text: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // 5 minutes in seconds
    index: true
  },
  completedAt: Date,
  scheduledFor: {
    type: Date,
    required: true
  },
  title: {
    type: String,
    default: 'Untitled Meeting'
  },
  description: String,
  maxParticipants: {
    type: Number,
    default: 10
  }
}, {
  timestamps: true
});

// Index for faster queries
meetingSchema.index({ status: 1 });

// Method to add participant
meetingSchema.methods.addParticipant = function(userId, username) {
  const existingParticipant = this.participants.find(p => p.userId === userId);
  if (!existingParticipant) {
    this.participants.push({
      userId,
      username,
      joinedAt: new Date()
    });
  }
  return this.save();
};

// Method to remove participant
meetingSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.leftAt = new Date();
  }
  return this.save();
};

// Method to add message
meetingSchema.methods.addMessage = function(userId, username, text) {
  this.messages.push({
    userId,
    username,
    text,
    timestamp: new Date()
  });
  return this.save();
};

// Method to complete meeting
meetingSchema.methods.completeMeeting = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Static method to find active meetings
meetingSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Static method to find meeting by room ID
meetingSchema.statics.findByRoomId = function(roomId) {
  return this.findOne({ roomId, status: 'active' });
};

module.exports = mongoose.model('Meeting', meetingSchema);
