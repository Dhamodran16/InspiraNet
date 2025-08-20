const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Notification Preferences
  notifications: {
    // Follow/Connection notifications
    followRequests: { type: Boolean, default: true },
    followAccepted: { type: Boolean, default: true },
    followRejected: { type: Boolean, default: true },
    
    // Post engagement notifications
    postLikes: { type: Boolean, default: true },
    postComments: { type: Boolean, default: true },
    postShares: { type: Boolean, default: true },
    postMentions: { type: Boolean, default: true },
    
    // Message notifications
    newMessages: { type: Boolean, default: true },
    messageReadReceipts: { type: Boolean, default: true },
    
    // Event notifications
    eventReminders: { type: Boolean, default: true },
    eventInvitations: { type: Boolean, default: true },
    
    // Job notifications
    jobApplications: { type: Boolean, default: true },
    jobUpdates: { type: Boolean, default: true },
    
    // System notifications
    systemAnnouncements: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true }
  },
  
  // Privacy Settings
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'connections', 'private'],
      default: 'public'
    },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    showLocation: { type: Boolean, default: true },
    showCompany: { type: Boolean, default: true },
    showBatch: { type: Boolean, default: true },
    showDepartment: { type: Boolean, default: true },
    allowMessagesFrom: {
      type: String,
      enum: ['everyone', 'connections', 'none'],
      default: 'connections'
    },
    showOnlineStatus: { type: Boolean, default: true }
  },
  
  // Communication Settings
  communication: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    inAppNotifications: { type: Boolean, default: true },
    notificationFrequency: {
      type: String,
      enum: ['immediate', 'hourly', 'daily', 'weekly'],
      default: 'immediate'
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '22:00' }, // 10 PM
      endTime: { type: String, default: '08:00' }   // 8 AM
    }
  },
  
  // Theme and Display
  display: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timeFormat: { type: String, default: '12h' }
  },
  
  // Security Settings
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    loginNotifications: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 24 }, // hours
    requirePasswordChange: { type: Boolean, default: false },
    lastPasswordChange: { type: Date },
    passwordExpiryDays: { type: Number, default: 90 }
  }
}, {
  timestamps: true
});

// Index for better query performance
userSettingsSchema.index({ userId: 1 });

// Ensure virtuals are serialized
userSettingsSchema.set('toJSON', { virtuals: true });
userSettingsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UserSettings', userSettingsSchema);
