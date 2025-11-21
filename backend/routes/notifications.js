const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const UserSettings = require('../models/UserSettings');

// Get user notifications with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Notifications route accessed by user:', req.user._id);
    
    const { page = 1, limit = 20, type, category, isRead } = req.query;
    const userId = req.user._id;

    console.log('🔍 Query parameters:', { page, limit, type, category });

    let notificationType = type;
    if (category) {
      // Map category to notification types
      const categoryMap = {
        'connection': ['follow_request', 'follow_accepted', 'follow_rejected'],
        'engagement': ['post_like', 'post_comment', 'post_share', 'post_mention'],
        'communication': ['message'],
        'system': ['system_announcement', 'security_alert']
      };
      if (categoryMap[category]) {
        notificationType = { $in: categoryMap[category] };
      }
    }

    console.log('🔍 Notification type filter:', notificationType);

    const readFilter = typeof isRead !== 'undefined' ? isRead === 'true' || isRead === true || isRead === '1' : null;
    const result = await NotificationService.getUserNotifications(
      userId, 
      parseInt(page), 
      parseInt(limit), 
      notificationType,
      readFilter
    );

    console.log('✅ Successfully fetched notifications:', {
      count: result.notifications?.length || 0,
      total: result.pagination?.total || 0
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
      name: error.name
    });
    
    // Send a more detailed error response
    res.status(500).json({ 
      error: 'Failed to get notifications',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await NotificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Get notification settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get or create user settings
    let userSettings = await UserSettings.findOne({ userId });
    
    if (!userSettings) {
      // Create default settings
      userSettings = new UserSettings({
        userId,
        emailNotifications: {
          newMessages: true,
          newFollowers: true,
          postLikes: true,
          postComments: true,
          systemUpdates: true
        },
        pushNotifications: {
          newMessages: true,
          newFollowers: true,
          postLikes: true,
          postComments: true,
          systemUpdates: true
        },
        inAppNotifications: {
          newMessages: true,
          newFollowers: true,
          postLikes: true,
          postComments: true,
          systemUpdates: true
        }
      });
      await userSettings.save();
    }

    res.json({ settings: userSettings });
  } catch (error) {
    console.error('Error getting notification settings:', error);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// Update notification settings
router.patch('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { emailNotifications, pushNotifications, inAppNotifications } = req.body;
    
    const userSettings = await UserSettings.findOneAndUpdate(
      { userId },
      { 
        emailNotifications, 
        pushNotifications, 
        inAppNotifications 
      },
      { new: true, upsert: true }
    );

    res.json({ message: 'Settings updated successfully', settings: userSettings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await NotificationService.markAsRead(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Emit socket event so clients can update unread counters in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notification_read', notificationId);
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await NotificationService.markAllAsRead(userId);
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('all_notifications_read');
    }

    res.json({ 
      message: 'All notifications marked as read', 
      updatedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Get user notification settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      // Create default settings matching UserSettings model
      settings = new UserSettings({
        userId,
        notifications: {
          followRequests: true,
          followAccepted: true,
          followRejected: true,
          postLikes: true,
          postComments: true,
          postShares: true,
          postMentions: true,
          newMessages: true,
          messageReadReceipts: true,
          eventReminders: true,
          eventInvitations: true,
          jobApplications: true,
          jobUpdates: true,
          systemAnnouncements: true,
          securityAlerts: true
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          showLocation: true,
          showCompany: true,
          showBatch: true,
          showDepartment: true,
          showOnlineStatus: true
        },
        communication: {
          emailNotifications: true,
          pushNotifications: true,
          inAppNotifications: true,
          notificationFrequency: 'immediate',
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00'
          }
        },
        display: {
          theme: 'auto',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h'
        },
        security: {
          twoFactorEnabled: false,
          loginNotifications: true,
          sessionTimeout: 30, // minutes
          requirePasswordChange: false,
          passwordExpiryDays: 90
        }
      });
      await settings.save();
    }

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error getting notification settings:', error);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// Update user notification settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { notifications, privacy, communication, display, security } = req.body;
    
    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      settings = new UserSettings({ userId });
    }

    // Update notification settings with validation
    if (notifications) {
      // Validate notification settings structure
      const validNotificationFields = [
        'followRequests', 'followAccepted', 'followRejected',
        'postLikes', 'postComments', 'postShares', 'postMentions',
        'newMessages', 'messageReadReceipts',
        'eventReminders', 'eventInvitations',
        'jobApplications', 'jobUpdates',
        'systemAnnouncements', 'securityAlerts'
      ];
      const filteredNotifications = {};
      validNotificationFields.forEach(field => {
        if (notifications[field] !== undefined) {
          filteredNotifications[field] = notifications[field];
        }
      });
      settings.notifications = { ...settings.notifications, ...filteredNotifications };
    }

    // Update privacy settings with validation
    if (privacy) {
      const validPrivacyFields = [
        'profileVisibility', 'showEmail', 'showPhone', 'showLocation',
        'showCompany', 'showBatch', 'showDepartment',
        'showOnlineStatus'
      ];
      const filteredPrivacy = {};
      validPrivacyFields.forEach(field => {
        if (privacy[field] !== undefined) {
          filteredPrivacy[field] = privacy[field];
        }
      });
      // Validate enum values
      if (filteredPrivacy.profileVisibility && !['public', 'connections'].includes(filteredPrivacy.profileVisibility)) {
        return res.status(400).json({ error: 'Invalid profileVisibility value' });
      }
      settings.privacy = { ...settings.privacy, ...filteredPrivacy };
    }

    // Update communication settings (handle nested quietHours)
    if (communication) {
      const validCommunicationFields = [
        'emailNotifications', 'pushNotifications', 'inAppNotifications',
        'notificationFrequency'
      ];
      const filteredCommunication = {};
      validCommunicationFields.forEach(field => {
        if (communication[field] !== undefined) {
          filteredCommunication[field] = communication[field];
        }
      });
      // Validate notificationFrequency enum
      if (filteredCommunication.notificationFrequency && 
          !['immediate', 'hourly', 'daily', 'weekly'].includes(filteredCommunication.notificationFrequency)) {
        return res.status(400).json({ error: 'Invalid notificationFrequency value' });
      }
      // Handle nested quietHours
      if (communication.quietHours) {
        settings.communication.quietHours = {
          ...settings.communication.quietHours,
          ...communication.quietHours
        };
      }
      settings.communication = { ...settings.communication, ...filteredCommunication };
    }

    // Update display settings with validation
    if (display) {
      const validDisplayFields = ['theme', 'language', 'timezone', 'dateFormat', 'timeFormat'];
      const filteredDisplay = {};
      validDisplayFields.forEach(field => {
        if (display[field] !== undefined) {
          filteredDisplay[field] = display[field];
        }
      });
      // Validate enum values
      if (filteredDisplay.theme && !['light', 'dark', 'auto'].includes(filteredDisplay.theme)) {
        return res.status(400).json({ error: 'Invalid theme value' });
      }
      if (filteredDisplay.timeFormat && !['12h', '24h'].includes(filteredDisplay.timeFormat)) {
        return res.status(400).json({ error: 'Invalid timeFormat value' });
      }
      settings.display = { ...settings.display, ...filteredDisplay };
    }

    // Update security settings with validation
    let securityChanges = null;
    if (security) {
      const validSecurityFields = [
        'twoFactorEnabled', 'loginNotifications', 'sessionTimeout',
        'requirePasswordChange', 'lastPasswordChange', 'passwordExpiryDays'
      ];
      const filteredSecurity = {};
      validSecurityFields.forEach(field => {
        if (security[field] !== undefined) {
          filteredSecurity[field] = security[field];
        }
      });
      // Validate numeric fields
      if (filteredSecurity.sessionTimeout !== undefined) {
        const timeout = parseInt(filteredSecurity.sessionTimeout);
        if (isNaN(timeout) || timeout < 5 || timeout > 1440) {
          return res.status(400).json({ error: 'sessionTimeout must be between 5 and 1440 minutes' });
        }
        filteredSecurity.sessionTimeout = timeout;
      }
      if (filteredSecurity.passwordExpiryDays !== undefined) {
        const expiry = parseInt(filteredSecurity.passwordExpiryDays);
        if (isNaN(expiry) || expiry < 30 || expiry > 365) {
          return res.status(400).json({ error: 'passwordExpiryDays must be between 30 and 365 days' });
        }
        filteredSecurity.passwordExpiryDays = expiry;
      }
      settings.security = { ...settings.security, ...filteredSecurity };
      if (Object.keys(filteredSecurity).length > 0) {
        securityChanges = { ...filteredSecurity };
      }
    }

    await settings.save();

    // Emit socket event for real-time settings update to all user's connected clients
    const io = req.app.get('io');
    if (io) {
      // Convert settings to plain object for socket emission
      const settingsObj = settings.toObject ? settings.toObject() : settings;
      io.to(`user_${userId}`).emit('settings_updated', { settings: settingsObj });
      console.log(`✅ Emitted settings_updated event to user_${userId} room`);
      if (securityChanges) {
        io.to(`user_${userId}`).emit('security_event', {
          type: 'security_settings_updated',
          changes: securityChanges,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings', details: error.message });
  }
});

// Get activity log
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const settings = await UserSettings.findOne({ userId }).select('activityLog');

    res.json({
      success: true,
      logs: settings?.activityLog || []
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// Add activity log entry
router.post('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { action, status = 'success', details, clientId } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    if (!['success', 'error', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const timestamp = new Date();

    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      {
        $push: {
          activityLog: {
            $each: [{ action, status, details, timestamp }],
            $position: 0,
            $slice: 200
          }
        }
      },
      { new: true, upsert: true, runValidators: true }
    ).select('activityLog');

    const logEntry = settings?.activityLog?.[0];

    const io = req.app.get('io');
    if (io && logEntry) {
      io.to(`user_${userId}`).emit('activity_log_created', { log: logEntry, clientId });
    }

    res.json({
      success: true,
      log: logEntry,
      clientId
    });
  } catch (error) {
    console.error('Error adding activity log:', error);
    res.status(500).json({ error: 'Failed to add activity log' });
  }
});

// Clear activity log
router.delete('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    await UserSettings.findOneAndUpdate(
      { userId },
      { $set: { activityLog: [] } },
      { upsert: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('activity_log_cleared');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing activity log:', error);
    res.status(500).json({ error: 'Failed to clear activity log' });
  }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const result = await NotificationService.deleteNotification(notificationId, userId);
    
    if (!result) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notification_deleted', notificationId);
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});



// Reset notification settings to defaults
router.post('/settings/reset', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Delete existing settings
    await UserSettings.findOneAndDelete({ userId });
    
    // Create new default settings
    const userSettings = new UserSettings({ userId });
    await userSettings.save();

    res.json({ 
      success: true,
      message: 'Settings reset to defaults', 
      settings: userSettings 
    });
  } catch (error) {
    console.error('Error resetting notification settings:', error);
    res.status(500).json({ error: 'Failed to reset notification settings' });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [totalNotifications, unreadCount, readCount] = await Promise.all([
      NotificationService.getUserNotifications(userId, 1, 1),
      NotificationService.getUnreadCount(userId),
      NotificationService.getUserNotifications(userId, 1, 1, null, true) // read only
    ]);

    const stats = {
      total: totalNotifications.pagination.total,
      unread: unreadCount,
      read: readCount.pagination.total,
      unreadPercentage: totalNotifications.pagination.total > 0 
        ? Math.round((unreadCount / totalNotifications.pagination.total) * 100) 
        : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({ error: 'Failed to get notification stats' });
  }
});

// Test endpoint to create a notification (for debugging)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 Creating test notification for user:', req.user._id);
    
    const testNotification = await NotificationService.createNotification({
      recipientId: req.user._id,
      senderId: req.user._id, // Self for testing
      type: 'system_announcement',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working',
      category: 'system',
      priority: 'medium'
    });

    if (testNotification) {
      console.log('✅ Test notification created successfully:', testNotification._id);
      res.json({ 
        success: true, 
        message: 'Test notification created',
        notification: testNotification
      });
    } else {
      console.log('⚠️ Test notification was not created (likely disabled by user settings)');
      res.json({ 
        success: false, 
        message: 'Test notification not created (check user settings)'
      });
    }
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
    res.status(500).json({ 
      error: 'Failed to create test notification',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;