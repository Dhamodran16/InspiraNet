const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userType: {
    type: String,
    required: true,
    trim: true
  },
  batch: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  // Post type and basic fields
  postType: {
    type: String,
    enum: ['general', 'job', 'poll', 'event'],
    default: 'general',
    required: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100,
    validate: {
      validator: function(value) {
        // Title is required for job, event, and poll posts
        if (this.postType === 'job' || this.postType === 'event' || this.postType === 'poll') {
          return value && value.trim().length > 0;
        }
        // Title is optional for general posts
        return true;
      },
      message: 'Title is required for job, event, and poll posts'
    }
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'pdf']
    },
    url: {
      type: String
    },
    filename: String,
    size: Number,
    mimeType: String
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  shares: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  isShared: {
    type: Boolean,
    default: false
  },
  originalPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  
  // Job Post Specific Fields
  jobDetails: {
    // Company Information
    company: { 
      type: String, 
      trim: true,
      required: function() {
        return this.postType === 'job';
      }
    }, // legacy support
    industry: { type: String, trim: true },
    location: { 
      type: String, 
      trim: true,
      required: function() {
        return this.postType === 'job';
      }
    },
    companyDescription: { type: String, trim: true },
    companyLogo: { type: String, trim: true },

    // Job Position Details
    title: { 
      type: String, 
      trim: true,
      required: function() {
        return this.postType === 'job';
      }
    },
    jobType: { type: String, enum: ['full-time', 'part-time', 'internship', 'contract', 'freelance'], default: 'full-time' },

    // Compensation & Benefits
    salaryRange: { type: String, trim: true },
    salary: { 
      type: String, 
      trim: true,
      required: function() {
        return this.postType === 'job';
      }
    }, // legacy support
    benefits: { type: [String], default: [] },
    referralBonus: { type: String, trim: true },

    // Requirements & Eligibility
    skillsRequired: { type: [String], default: [] },
    cgpaCutoff: { type: String, trim: true },
    eligibleBranches: { type: [String], default: [] },
    experienceLevel: { type: String, trim: true },
    eligibilityCriteria: { type: String, trim: true },
    eligibility: { type: String, trim: true }, // legacy support

    // Application Process
    deadline: { type: String, trim: true },
    applicationLink: { type: String, trim: true },
    hiringTimeline: { type: String, trim: true },
    contactEmail: { type: String, trim: true },

    // Interview Process
    interviewRounds: { type: Number, default: 0 },
    interviewDetails: [{
      roundName: String,
      duration: String,
      tips: String,
      mode: { type: String, enum: ['online', 'offline', 'hybrid'] }
    }]
  },
  
  // Poll Post Specific Fields
  pollDetails: {
    question: {
      type: String,
      trim: true,
      maxlength: 200,
      required: function() {
        return this.postType === 'poll';
      }
    },
    options: {
      type: [{
        id: {
          type: String
        },
        text: {
          type: String,
          trim: true
        },
        votes: {
          type: [String],
          default: []
        }
      }],
      validate: {
        validator: function(options) {
          // Poll posts must have at least 2 options
          if (this.postType === 'poll') {
            return options && options.length >= 2;
          }
          return true;
        },
        message: 'Poll posts must have at least 2 options'
      }
    },
    duration: {
      type: Number,
      min: 1,
      max: 365 // Maximum 1 year
    },
    allowMultiple: {
      type: Boolean,
      default: false
    },
    anonymous: {
      type: Boolean,
      default: false
    },
    hideResults: {
      type: Boolean,
      default: false
    },
    coverImage: {
      type: String,
      trim: true
    },
    endDate: {
      type: Date
    },
    totalVotes: {
      type: Number,
      default: 0
    }
  },
  
  // Event Post Specific Fields
  eventDetails: {
    date: {
      type: String,
      trim: true,
      required: function() {
        return this.postType === 'event';
      }
    },
    time: {
      type: String,
      trim: true,
      required: false // Make time optional
    },
    location: {
      type: String,
      trim: true,
      required: function() {
        return this.postType === 'event';
      }
    },
    maxAttendees: {
      type: Number,
      min: 1
    },
    registrationForm: {
      type: String,
      trim: true
    },
    recurring: {
      type: Boolean,
      default: false
    },
    attendanceMode: {
      type: String,
      enum: ['in-person', 'online', 'hybrid']
    }
  }
}, {
  timestamps: true
});

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for timeAgo
postSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.createdAt) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 2592000)} months ago`;
});

// Index for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ isPublic: 1, createdAt: -1 });
postSchema.index({ postType: 1 });
postSchema.index({ 'jobDetails.company': 1 });
postSchema.index({ 'eventDetails.date': 1 });

// Ensure virtual fields are serialized
postSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
