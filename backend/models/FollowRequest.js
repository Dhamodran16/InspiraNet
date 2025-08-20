const mongoose = require('mongoose');

const followRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  decidedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields for frontend compatibility
followRequestSchema.virtual('requester', {
  ref: 'User',
  localField: 'requesterId',
  foreignField: '_id',
  justOne: true
});

followRequestSchema.virtual('target', {
  ref: 'User',
  localField: 'targetId',
  foreignField: '_id',
  justOne: true
});

followRequestSchema.virtual('requestedAt').get(function() {
  return this.createdAt;
});

// Unique compound index for pending requests only
followRequestSchema.index(
  { requesterId: 1, targetId: 1, status: 1 },
  { 
    unique: true, 
    partialFilterExpression: { status: 'pending' }
  }
);

// Index for efficient queries
followRequestSchema.index({ targetId: 1, status: 1, createdAt: -1 });
followRequestSchema.index({ requesterId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('FollowRequest', followRequestSchema);
