class PushNotificationService {
  private static instance: PushNotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.initialize();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private async initialize() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showNotification(title: string, options: NotificationOptions = {}) {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        return;
      }
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to the appropriate page based on notification type
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async showMessageNotification(senderName: string, message: string, conversationId: string) {
    return this.showNotification(`New message from ${senderName}`, {
      body: message,
      tag: `message-${conversationId}`,
      data: { url: `/messages?conversation=${conversationId}` }
    });
  }

  async showEventNotification(eventTitle: string, eventDescription: string, eventId: string) {
    return this.showNotification(`New event: ${eventTitle}`, {
      body: eventDescription,
      tag: `event-${eventId}`,
      data: { url: `/events?event=${eventId}` }
    });
  }

  async showFollowNotification(followerName: string, followerId: string) {
    return this.showNotification(`New follower: ${followerName}`, {
      body: `${followerName} started following you`,
      tag: `follow-${followerId}`,
      data: { url: `/profile/${followerId}` }
    });
  }

  async showAchievementNotification(achievementTitle: string, achievementDescription: string) {
    return this.showNotification(`Achievement unlocked: ${achievementTitle}`, {
      body: achievementDescription,
      tag: 'achievement',
      data: { url: '/profile' }
    });
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  isGranted(): boolean {
    return this.permission === 'granted';
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;

