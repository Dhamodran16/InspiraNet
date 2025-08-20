const Notification = require('../models/Notification');
const UserSettings = require('../models/UserSettings');
const User = require('../models/User');
const mongoose = require('mongoose');

class NotificationService {
  // Create a new notification
  static async createNotification(data) {
    try {
      const {
        recipientId,
        senderId,
        type,
        title,
        message,
        relatedPostId,
        relatedCommentId,
        relatedUserId,
        priority = 'medium',
        category = 'connection',
        metadata = {}
      } = data;

      // Check if user has disabled this type of notification
      let userSettings;
      try {
        userSettings = await UserSettings.findOne({ userId: recipientId });
      } catch (error) {
        console.warn('Could not fetch user settings for notification check:', error);
        userSettings = null;
      }

      if (userSettings && !this.isNotificationEnabled(userSettings, type)) {
        return null; // Don't create notification if disabled
      }

      // Check quiet hours
      if (userSettings?.communication?.quietHours?.enabled) {
        if (this.isInQuietHours(userSettings.communication.quietHours)) {
          return null; // Don't create notification during quiet hours
        }
      }

      const notification = new Notification({
        recipientId,
        senderId,
        type,
        title,
        message,
        relatedPostId,
        relatedCommentId,
        relatedUserId,
        priority,
        category,
        metadata
      });

      await notification.save();
      
      // Populate sender information for frontend
      try {
        await notification.populate('senderId', 'name avatar type department');
      } catch (populateError) {
        console.warn('Could not populate sender information:', populateError);
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Check if notification type is enabled for user
  static isNotificationEnabled(userSettings, type) {
    if (!userSettings?.notifications) return true;

    const notificationMap = {
      'follow_request': userSettings.notifications.followRequests,
      'follow_accepted': userSettings.notifications.followAccepted,
      'follow_rejected': userSettings.notifications.followRejected,
      'post_like': userSettings.notifications.postLikes,
      'post_comment': userSettings.notifications.postComments,
      'post_share': userSettings.notifications.postShares,
      'post_mention': userSettings.notifications.postMentions,
      'message': userSettings.notifications.newMessages,
      'event_reminder': userSettings.notifications.eventReminders,
      'event_invitation': userSettings.notifications.eventInvitations,
      'job_application': userSettings.notifications.jobApplications,
      'job_update': userSettings.notifications.jobUpdates,
      'system_announcement': userSettings.notifications.systemAnnouncements,
      'security_alert': userSettings.notifications.securityAlerts
    };

    return notificationMap[type] !== false;
  }

  // Check if current time is in quiet hours
  static isInQuietHours(quietHours) {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes <= endMinutes) {
      // Same day (e.g., 9 AM to 5 PM)
      return currentTime >= startMinutes && currentTime <= endMinutes;
    } else {
      // Overnight (e.g., 10 PM to 8 AM)
      return currentTime >= startMinutes || currentTime <= endMinutes;
    }
  }

  // Create follow request notification
  static async createFollowRequestNotification(requesterId, targetId) {
    const requester = await User.findById(requesterId);
    const target = await User.findById(targetId);
    
    if (!requester || !target) return null;

    return await this.createNotification({
      recipientId: targetId,
      senderId: requesterId,
      type: 'follow_request',
      title: 'New Follow Request',
      message: `${requester.name} wants to connect with you`,
      relatedUserId: requesterId,
      category: 'connection',
      metadata: {
        requesterName: requester.name,
        requesterAvatar: requester.avatar,
        requesterType: requester.type,
        requesterDepartment: requester.department
      }
    });
  }

  // Create follow accepted notification
  static async createFollowAcceptedNotification(accepterId, requesterId) {
    const accepter = await User.findById(accepterId);
    
    if (!accepter) return null;

    return await this.createNotification({
      recipientId: requesterId,
      senderId: accepterId,
      type: 'follow_accepted',
      title: 'Follow Request Accepted',
      message: `${accepter.name} accepted your follow request! You can now message each other.`,
      relatedUserId: accepterId,
      category: 'connection',
      metadata: {
        accepterName: accepter.name,
        accepterAvatar: accepter.avatar
      }
    });
  }

  // Create follow rejected notification
  static async createFollowRejectedNotification(rejecterId, requesterId) {
    const rejecter = await User.findById(rejecterId);
    
    if (!rejecter) return null;

    return await this.createNotification({
      recipientId: requesterId,
      senderId: rejecterId,
      type: 'follow_rejected',
      title: 'Follow Request Rejected',
      message: `${rejecter.name} rejected your follow request. You can send a new request after 30 days.`,
      relatedUserId: rejecterId,
      category: 'connection',
      metadata: {
        rejecterName: rejecter.name,
        rejecterAvatar: rejecter.avatar
      }
    });
  }

  // Create post like notification
  static async createPostLikeNotification(likerId, postOwnerId, postId, postTitle) {
    const liker = await User.findById(likerId);
    
    if (!liker || likerId.toString() === postOwnerId.toString()) return null;

    return await this.createNotification({
      recipientId: postOwnerId,
      senderId: likerId,
      type: 'post_like',
      title: 'New Like',
      message: `${liker.name} liked your post`,
      relatedPostId: postId,
      category: 'engagement',
      metadata: {
        likerName: liker.name,
        likerAvatar: liker.avatar,
        postTitle: postTitle || 'Your post'
      }
    });
  }

  // Create post comment notification
  static async createPostCommentNotification(commenterId, postOwnerId, postId, postTitle, commentText) {
    const commenter = await User.findById(commenterId);
    
    if (!commenter || commenterId.toString() === postOwnerId.toString()) return null;

    return await this.createNotification({
      recipientId: postOwnerId,
      senderId: commenterId,
      type: 'post_comment',
      title: 'New Comment',
      message: `${commenter.name} commented on your post: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      relatedPostId: postId,
      category: 'engagement',
      metadata: {
        commenterName: commenter.name,
        commenterAvatar: commenter.avatar,
        postTitle: postTitle || 'Your post',
        commentText: commentText
      }
    });
  }

  // Create post share notification
  static async createPostSharedNotification(sharerId, postOwnerId, postId, postTitle) {
    const sharer = await User.findById(sharerId);
    
    if (!sharer || sharerId.toString() === postOwnerId.toString()) return null;

    return await this.createNotification({
      recipientId: postOwnerId,
      senderId: sharerId,
      type: 'post_share',
      title: 'Post Shared',
      message: `${sharer.name} shared your post`,
      relatedPostId: postId,
      category: 'engagement',
      metadata: {
        sharerName: sharer.name,
        sharerAvatar: sharer.avatar,
        postTitle: postTitle || 'Your post'
      }
    });
  }

  // Create message notification
  static async createMessageNotification(senderId, recipientId, messageText, conversationId) {
    const sender = await User.findById(senderId);
    
    if (!sender) return null;

    return await this.createNotification({
      recipientId: recipientId,
      senderId: senderId,
      type: 'message',
      title: 'New Message',
      message: `${sender.name} sent you a message: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
      relatedUserId: senderId,
      category: 'communication',
      metadata: {
        senderName: sender.name,
        senderAvatar: sender.avatar,
        messageText: messageText,
        conversationId: conversationId
      }
    });
  }

  // Get user notifications with pagination
  static async getUserNotifications(userId, page = 1, limit = 20, type = null, isRead = null) {
    try {
      const skip = (page - 1) * limit;
      
      const query = { 
        recipientId: userId, 
        isDeleted: false 
      };
      
      if (type) {
        query.type = type;
      }
      if (typeof isRead === 'boolean') {
        query.isRead = isRead;
      }
      
      let notifications;
      let total;
      
      try {
        // Only populate senderId to avoid schema conflicts
        notifications = await Notification.find(query)
          .populate('senderId', 'name avatar type department')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
      } catch (populateError) {
        console.warn('Error populating notification data:', populateError);
        // Try without population if it fails
        notifications = await Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
      }
      
      try {
        total = await Notification.countDocuments(query);
      } catch (countError) {
        console.warn('Error counting notifications:', countError);
        total = notifications.length; // Fallback to current page count
      }
      
      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total,
          hasMore: page < Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipientId: userId },
        { isRead: true },
        { new: true }
      );
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipientId: userId, isRead: false },
        { isRead: true }
      );
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipientId: userId },
        { isDeleted: true },
        { new: true }
      );
      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get unread count
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipientId: userId,
        isRead: false,
        isDeleted: false
      });
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Clean up old notifications (older than 90 days)
  static async cleanupOldNotifications() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      const result = await Notification.updateMany(
        { createdAt: { $lt: cutoffDate } },
        { isDeleted: true }
      );
      
      console.log(`Cleaned up ${result.modifiedCount} old notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
