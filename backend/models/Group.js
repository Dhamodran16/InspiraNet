const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowStudentJoin: {
    type: Boolean,
    default: true
  },
  maxMembers: {
    type: Number,
    default: 1000
  },
  avatar: {
    type: String,
    default: null
  },
  coverImage: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  rules: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
groupSchema.index({ name: 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ isActive: 1, isPrivate: 1 });
groupSchema.index({ tags: 1 });

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for post count
groupSchema.virtual('postCount').get(function() {
  return this.posts.length;
});

// Ensure virtuals are serialized
groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

// Pre-save middleware to ensure creator is added as admin
groupSchema.pre('save', function(next) {
  if (this.isNew) {
    // Add creator as admin if not already present
    const creatorExists = this.members.some(member => 
      member.userId.toString() === this.createdBy.toString()
    );
    
    if (!creatorExists) {
      this.members.push({
        userId: this.createdBy,
        role: 'admin',
        joinedAt: new Date()
      });
    }
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);

