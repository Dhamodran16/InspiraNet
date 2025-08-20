const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  followeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Unique compound index to prevent duplicate follows
followSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });

// Index for efficient queries
followSchema.index({ followeeId: 1, createdAt: -1 });
followSchema.index({ followerId: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', followSchema);
