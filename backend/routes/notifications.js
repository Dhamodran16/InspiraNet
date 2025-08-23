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
      // Create default settings
      settings = new UserSettings({
        userId,
        notifications: {
          email: true,
          push: true,
          inApp: true,
          types: {
            follow_request: true,
            follow_accepted: true,
            post_like: true,
            post_comment: true,
            post_share: true,
            message: true,
            system_announcement: true,
            security_alert: true
          }
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          allowMessages: true,
          allowFollowRequests: true
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
    const { notifications, privacy } = req.body;
    
    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      settings = new UserSettings({ userId });
    }

    // Update notification settings
    if (notifications) {
      settings.notifications = { ...settings.notifications, ...notifications };
    }

    // Update privacy settings
    if (privacy) {
      settings.privacy = { ...settings.privacy, ...privacy };
    }

    await settings.save();

    // Emit socket event for real-time settings update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('settings_updated', { settings });
    }

    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
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