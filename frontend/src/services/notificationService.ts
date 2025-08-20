import api from './api';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  senderId: {
    _id: string;
    name: string;
    avatar?: string;
    type: string;
    department?: string;
  };
  relatedPostId?: {
    _id: string;
    title?: string;
    content?: string;
  };
  relatedCommentId?: {
    _id: string;
    content?: string;
  };
  relatedUserId?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  category: string;
  priority: string;
  metadata: any;
}

export interface NotificationSettings {
  _id: string;
  userId: string;
  notifications: {
    followRequests: boolean;
    followAccepted: boolean;
    followRejected: boolean;
    postLikes: boolean;
    postComments: boolean;
    postShares: boolean;
    postMentions: boolean;
    newMessages: boolean;
    messageReadReceipts: boolean;
    eventReminders: boolean;
    eventInvitations: boolean;
    jobApplications: boolean;
    jobUpdates: boolean;
    systemAnnouncements: boolean;
    securityAlerts: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'connections' | 'private';
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    showCompany: boolean;
    showBatch: boolean;
    showDepartment: boolean;
    allowMessagesFrom: 'everyone' | 'connections' | 'none';
    showOnlineStatus: boolean;
  };
  communication: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    inAppNotifications: boolean;
    notificationFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  security: {
    twoFactorEnabled: boolean;
    loginNotifications: boolean;
    sessionTimeout: number;
    requirePasswordChange: boolean;
    lastPasswordChange: Date;
    passwordExpiryDays: number;
  };
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    hasMore: boolean;
  };
}

class NotificationService {
  // Get user notifications with pagination and filtering
  async getNotifications(params: {
    page?: number;
    limit?: number;
    type?: string;
    category?: string;
    unreadOnly?: boolean;
  }): Promise<NotificationResponse> {
    const response = await api.get('/api/notifications', { params });
    return response.data;
  }

  // Get unread notification count
  async getUnreadCount(): Promise<{ count: number }> {
    const response = await api.get('/api/notifications/unread-count');
    return response.data;
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<{ message: string; notification: Notification }> {
    const response = await api.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ message: string; modifiedCount: number }> {
    const response = await api.patch('/api/notifications/mark-all-read');
    return response.data;
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  }

  // Get user notification settings
  async getSettings(): Promise<NotificationSettings> {
    const response = await api.get('/api/notifications/settings');
    return response.data;
  }

  // Update user notification settings
  async updateSettings(settings: Partial<NotificationSettings>): Promise<{ message: string; settings: NotificationSettings }> {
    const response = await api.put('/api/notifications/settings', settings);
    return response.data;
  }

  // Reset notification settings to defaults
  async resetSettings(): Promise<{ message: string; settings: NotificationSettings }> {
    const response = await api.post('/api/notifications/settings/reset');
    return response.data;
  }

  // Get notification statistics
  async getStats(): Promise<{
    total: number;
    unread: number;
    read: number;
    unreadPercentage: number;
  }> {
    const response = await api.get('/api/notifications/stats');
    return response.data;
  }
}

export default new NotificationService();
