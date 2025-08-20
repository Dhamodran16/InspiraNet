const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information (Common for all user types)
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    college: {
      type: String,
      required: function() { return this.type === 'student' || this.type === 'faculty'; },
      trim: true,
      lowercase: true
    },
    personal: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  type: {
    type: String,
    enum: ['student', 'alumni', 'faculty'],
    required: true
  },
  accountType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  messagePolicy: {
    type: String,
    enum: ['everyone', 'followers', 'mutuals'],
    default: 'mutuals'
  },
  department: {
    type: String,
    required: function() { return this.type === 'student' || this.type === 'faculty'; },
    trim: true,
    lowercase: true
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  bio: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  timezone: {
    type: String,
    trim: true
  },

  // Student-specific fields
  studentInfo: {
    department: String,
    joinYear: Number, // Year when student joined (e.g., 2023)
    graduationYear: String,
    rollNumber: String,
    studentId: String,
    batch: String,
    section: String,
    currentSemester: String,
    cgpa: String,
    specialization: String,
    projects: [{
      title: String,
      description: String,
      technologies: [String],
      githubUrl: String,
      liveUrl: String
    }],
    achievements: [{
      title: String,
      description: String,
      date: Date,
      certificate: String
    }],
    placementStatus: {
      type: String,
      enum: ['seeking', 'placed', 'not_interested', 'higher_studies', 'entrepreneur']
    },
    placementCompany: String,
    placementPackage: String,
    placementDate: Date,
    internships: [{
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      description: String,
      technologies: [String]
    }]
  },

  // Alumni-specific fields
  alumniInfo: {
    currentCompany: String,
    jobTitle: String,
    experience: String,
    salary: String,
    workLocation: String,
    industry: String,
    graduationYear: Number, // Year when student graduated (joinYear + 4)
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    conversionDate: Date, // When student was converted to alumni
    originalStudentId: mongoose.Schema.Types.ObjectId, // Reference to original student record
    originalJoinYear: Number, // Original join year as student
    originalDepartment: String, // Original department as student
    companyDetails: {
      companyName: String,
      companyWebsite: String,
      companySize: String,
      companyType: String, // startup, corporate, government, etc.
      companyDescription: String,
      companyLogo: String
    },
    workHistory: [{
      company: String,
      companyDetails: {
        name: String,
        website: String,
        size: String,
        type: String,
        description: String,
        logo: String
      },
      position: String,
      startDate: Date,
      endDate: Date,
      current: Boolean,
      description: String,
      technologies: [String],
      achievements: [String],
      responsibilities: [String]
    }],
    mentorshipOffering: {
      type: Boolean,
      default: false
    },
    mentorshipAreas: [String]
  },

  // Faculty-specific fields
  facultyInfo: {
    department: String,
    designation: String,
    qualification: String,
    researchAreas: [String],
    publications: [{
      title: String,
      authors: [String],
      journal: String,
      year: String,
      doi: String,
      url: String
    }],
    teachingSubjects: [String],
    officeLocation: String
  },

  // Professional Development (Common)
  skills: [String],
  languages: [String],
  certifications: [{
    name: String,
    issuer: String,
    date: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  interests: [String],

  // Social & Professional Links (Common)
  socialLinks: {
    linkedin: String,
    github: String,
    personalWebsite: String,
    twitter: String,
    instagram: String,
    facebook: String
  },
  resume: {
    type: String,
    default: null
  },
  portfolio: {
    type: String,
    default: null
  },

  // System fields
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  notificationPreferences: {
    email: {
      enabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'daily' },
      types: {
        followRequests: { type: Boolean, default: true },
        newFollowers: { type: Boolean, default: true },
        postLikes: { type: Boolean, default: true },
        postComments: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        events: { type: Boolean, default: true },
        jobUpdates: { type: Boolean, default: true },
        achievements: { type: Boolean, default: true }
      }
    },
    push: {
      enabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' },
      types: {
        followRequests: { type: Boolean, default: true },
        newFollowers: { type: Boolean, default: true },
        postLikes: { type: Boolean, default: true },
        postComments: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        events: { type: Boolean, default: true },
        jobUpdates: { type: Boolean, default: true },
        achievements: { type: Boolean, default: true }
      }
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' },
      types: {
        followRequests: { type: Boolean, default: true },
        newFollowers: { type: Boolean, default: true },
        postLikes: { type: Boolean, default: true },
        postComments: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        events: { type: Boolean, default: true },
        jobUpdates: { type: Boolean, default: true },
        achievements: { type: Boolean, default: true }
      }
    },
    privacy: {
      showOnlineStatus: { type: Boolean, default: true },
      showLastSeen: { type: Boolean, default: true },
      allowNotificationsFrom: { type: String, enum: ['everyone', 'followers', 'mutuals'], default: 'everyone' }
    }
  },
  
  // Follow System
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  pendingFollowRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Note: Password hashing is handled in the auth routes

// Add unique index for college email
userSchema.index({ 'email.college': 1 }, { unique: true, sparse: true });

// Add indexes for better query performance
userSchema.index({ type: 1, department: 1, batch: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ 'followRequests.status': 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ isProfileComplete: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ createdAt: -1 });

// Text search index
userSchema.index({ 
  name: 'text', 
  'email.college': 'text', 
  'email.personal': 'text',
  department: 'text',
  bio: 'text',
  skills: 'text'
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get user without password
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Method to check if user is mutually followed by another user
userSchema.methods.isMutuallyFollowed = function(otherUserId) {
  return this.followers.includes(otherUserId) && this.following.includes(otherUserId);
};

// Method to check if user can message another user
userSchema.methods.canMessage = function(otherUser) {
  if (this.isMutuallyFollowed(otherUser._id)) {
    return true;
  }
  
  if (otherUser.messagePolicy === 'everyone') {
    return true;
  }
  
  if (otherUser.messagePolicy === 'followers' && this.following.includes(otherUser._id)) {
    return true;
  }
  
  return false;
};

// Method to get mutual connections count
userSchema.methods.getMutualConnectionsCount = function() {
  return this.followers.filter(followerId => 
    this.following.includes(followerId)
  ).length;
};

module.exports = mongoose.model('User', userSchema);
