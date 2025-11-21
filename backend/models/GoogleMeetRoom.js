const mongoose = require('mongoose');

const googleMeetRoomSchema = new mongoose.Schema({
  room_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  room_name: {
    type: String,
    required: true,
    trim: true
  },
  meet_link: {
    type: String,
    required: true,
    trim: true
  },
  host_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  host_name: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active',
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  scheduled_for: {
    type: Date
  },
  max_participants: {
    type: Number,
    default: 100
  },
  current_participants: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  is_public: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
googleMeetRoomSchema.index({ status: 1, created_at: -1 });
googleMeetRoomSchema.index({ host_id: 1, status: 1 });
googleMeetRoomSchema.index({ room_name: 'text', description: 'text' });

// Virtual for room URL
googleMeetRoomSchema.virtual('room_url').get(function() {
  return `/meetings/google-meet/${this.room_id}`;
});

// Method to check if user is host
googleMeetRoomSchema.methods.isHost = function(userId) {
  return this.host_id.toString() === userId.toString();
};

// Method to soft delete room
googleMeetRoomSchema.methods.deleteRoom = function() {
  this.status = 'deleted';
  return this.save();
};

// Method to update participant count
googleMeetRoomSchema.methods.updateParticipantCount = function(count) {
  this.current_participants = Math.max(0, count);
  return this.save();
};

// Static method to find active rooms
googleMeetRoomSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ created_at: -1 });
};

// Static method to find rooms by host
googleMeetRoomSchema.statics.findByHost = function(hostId) {
  return this.find({ host_id: hostId, status: 'active' }).sort({ created_at: -1 });
};

// Static method to search rooms
googleMeetRoomSchema.statics.searchRooms = function(query) {
  return this.find({
    status: 'active',
    $or: [
      { room_name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  }).sort({ created_at: -1 });
};

module.exports = mongoose.model('GoogleMeetRoom', googleMeetRoomSchema);

