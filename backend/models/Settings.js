const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Notification Preferences
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' }
    },
    push: {
      enabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' }
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' }
    },
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
  
  // Privacy Settings
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    showLocation: { type: Boolean, default: true },
    showCompany: { type: Boolean, default: true },
    showSkills: { type: Boolean, default: true },
    allowMessages: { type: String, enum: ['everyone', 'followers', 'mutual', 'none'], default: 'followers' },
    allowFollowRequests: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true }
  },
  
  // Theme and UI Settings
  theme: {
    mode: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    primaryColor: { type: String, default: '#3b82f6' },
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    compactMode: { type: Boolean, default: false }
  },
  
  // Communication Settings
  communication: {
    autoAcceptFollowRequests: { type: Boolean, default: false },
    messagePolicy: { type: String, enum: ['everyone', 'followers', 'mutual', 'none'], default: 'followers' },
    groupInvitePolicy: { type: String, enum: ['everyone', 'followers', 'mutual', 'none'], default: 'followers' },
    eventInvitePolicy: { type: String, enum: ['everyone', 'followers', 'mutual', 'none'], default: 'followers' }
  },
  
  // Content Preferences
  content: {
    postVisibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
    allowComments: { type: Boolean, default: true },
    allowShares: { type: Boolean, default: true },
    contentFilter: { type: String, enum: ['none', 'moderate', 'strict'], default: 'moderate' },
    language: { type: String, default: 'en' }
  },
  
  // Email Preferences
  emailPreferences: {
    marketing: { type: Boolean, default: false },
    weeklyDigest: { type: Boolean, default: true },
    eventReminders: { type: Boolean, default: true },
    jobAlerts: { type: Boolean, default: true },
    networkUpdates: { type: Boolean, default: true }
  },
  
  // Security Settings
  security: {
    twoFactorAuth: { type: Boolean, default: false },
    loginNotifications: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 24 }, // hours
    requirePasswordChange: { type: Boolean, default: false },
    lastPasswordChange: { type: Date, default: Date.now }
  },
  
  // Data and Analytics
  analytics: {
    allowDataCollection: { type: Boolean, default: true },
    allowPersonalization: { type: Boolean, default: true },
    allowThirdPartyCookies: { type: Boolean, default: false },
    shareUsageData: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Index for faster queries
settingsSchema.index({ userId: 1 });

// Pre-save middleware to ensure required fields
settingsSchema.pre('save', function(next) {
  // Set default values for new settings
  if (this.isNew) {
    this.notifications = this.notifications || {};
    this.privacy = this.privacy || {};
    this.theme = this.theme || {};
    this.communication = this.communication || {};
    this.content = this.content || {};
    this.emailPreferences = this.emailPreferences || {};
    this.security = this.security || {};
    this.analytics = this.analytics || {};
  }
  next();
});

// Static method to get or create user settings
settingsSchema.statics.getOrCreate = async function(userId) {
  let settings = await this.findOne({ userId });
  
  if (!settings) {
    settings = new this({ userId });
    await settings.save();
  }
  
  return settings;
};

// Instance method to update specific settings
settingsSchema.methods.updateSettings = async function(updates) {
  Object.assign(this, updates);
  return await this.save();
};

// Instance method to reset to defaults
settingsSchema.methods.resetToDefaults = async function() {
  this.notifications = {
    email: { enabled: true, frequency: 'immediate' },
    push: { enabled: true, frequency: 'immediate' },
    inApp: { enabled: true, frequency: 'immediate' },
    types: {
      followRequests: true,
      newFollowers: true,
      postLikes: true,
      postComments: true,
      messages: true,
      events: true,
      jobUpdates: true,
      achievements: true
    }
  };
  
  this.privacy = {
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    showLocation: true,
    showCompany: true,
    showSkills: true,
    allowMessages: 'followers',
    allowFollowRequests: true,
    showOnlineStatus: true
  };
  
  this.theme = {
    mode: 'auto',
    primaryColor: '#3b82f6',
    fontSize: 'medium',
    compactMode: false
  };
  
  this.communication = {
    autoAcceptFollowRequests: false,
    messagePolicy: 'followers',
    groupInvitePolicy: 'followers',
    eventInvitePolicy: 'followers'
  };
  
  this.content = {
    postVisibility: 'public',
    allowComments: true,
    allowShares: true,
    contentFilter: 'moderate',
    language: 'en'
  };
  
  this.emailPreferences = {
    marketing: false,
    weeklyDigest: true,
    eventReminders: true,
    jobAlerts: true,
    networkUpdates: true
  };
  
  this.security = {
    twoFactorAuth: false,
    loginNotifications: true,
    sessionTimeout: 24,
    requirePasswordChange: false,
    lastPasswordChange: new Date()
  };
  
  this.analytics = {
    allowDataCollection: true,
    allowPersonalization: true,
    allowThirdPartyCookies: false,
    shareUsageData: false
  };
  
  return await this.save();
};

module.exports = mongoose.model('Settings', settingsSchema);

