import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  mediaUrl?: string;
  createdAt: string;
  readBy: string[];
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface Notification {
  _id: string;
  recipientId: string;
  type: 'message' | 'follow' | 'like' | 'comment' | 'event' | 'achievement';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

export interface Post {
  _id: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  postType: 'general' | 'event' | 'job' | 'poll';
  createdAt: string;
}

export interface UserStatus {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

export interface Achievement {
  _id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface Event {
  _id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  organizer: {
    _id: string;
    name: string;
  };
}

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupSocket();
  }

  private setupSocket() {
    if (this.socket || this.isConnecting) return;

    this.isConnecting = true;
    
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        console.warn('No authentication token found for socket connection');
        this.isConnecting = false;
        return;
      }

      this.socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Error setting up socket connection:', error);
      this.isConnecting = false;
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });
  }

  // Connection management
  connect() {
    if (!this.socket || !this.socket.connected) {
      this.setupSocket();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Messaging methods
  joinConversations(conversationIds: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('join_conversations', conversationIds);
    }
  }

  sendMessage(conversationId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text', mediaUrl?: string) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', {
        conversationId,
        content,
        messageType,
        mediaUrl
      });
    }
  }

  startTyping(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  // Event listeners for messaging
  onMessage(callback: (message: Message) => void) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onTyping(callback: (data: TypingIndicator) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onStopTyping(callback: (data: TypingIndicator) => void) {
    if (this.socket) {
      this.socket.on('user_stop_typing', callback);
    }
  }

  offMessage() {
    if (this.socket) {
      this.socket.off('new_message');
    }
  }

  offTyping() {
    if (this.socket) {
      this.socket.off('user_typing');
    }
  }

  offStopTyping() {
    if (this.socket) {
      this.socket.off('user_stop_typing');
    }
  }

  // Notification methods
  onNewNotification(callback: (notification: Notification) => void) {
    if (this.socket) {
      this.socket.on('new_notification', callback);
    }
  }

  onNotificationRead(callback: (notificationId: string) => void) {
    if (this.socket) {
      this.socket.on('notification_read', callback);
    }
  }

  onPreferenceUpdate(callback: (preferences: any) => void) {
    if (this.socket) {
      this.socket.on('preference_updated', callback);
    }
  }

  offNewNotification() {
    if (this.socket) {
      this.socket.off('new_notification');
    }
  }

  offNotificationRead() {
    if (this.socket) {
      this.socket.off('notification_read');
    }
  }

  offPreferenceUpdate() {
    if (this.socket) {
      this.socket.off('preference_updated');
    }
  }

  emitPreferenceUpdate(preferences: any) {
    if (this.socket?.connected) {
      this.socket.emit('update_preferences', preferences);
    }
  }

  // Post methods
  onNewPost(callback: (post: Post) => void) {
    if (this.socket) {
      this.socket.on('new_post', callback);
    }
  }

  offNewPost() {
    if (this.socket) {
      this.socket.off('new_post');
    }
  }

  // Post like notifications
  onPostLikeUpdate(callback: (data: { postId: string; liked: boolean; likeCount: number; userId: string; timestamp: Date }) => void) {
    if (this.socket) {
      this.socket.on('post_like_updated', callback);
    }
  }

  offPostLikeUpdate() {
    if (this.socket) {
      this.socket.off('post_like_updated');
    }
  }

  // Post comment notifications
  onPostCommentAdded(callback: (data: { postId: string; comment: any; commentCount: number; timestamp: Date }) => void) {
    if (this.socket) {
      this.socket.on('post_comment_added', callback);
    }
  }

  offPostCommentAdded() {
    if (this.socket) {
      this.socket.off('post_comment_added');
    }
  }

  // Message read status listeners
  onMessageRead(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('message_read', callback);
    }
  }

  offMessageRead() {
    if (this.socket) {
      this.socket.off('message_read');
    }
  }

  // User status methods
  onUserStatusChange(callback: (status: UserStatus) => void) {
    if (this.socket) {
      this.socket.on('user_status_change', callback);
    }
  }

  offUserStatusChange() {
    if (this.socket) {
      this.socket.off('user_status_change');
    }
  }

  // Follower methods
  onNewFollower(callback: (data: { followerId: string; followerName: string }) => void) {
    if (this.socket) {
      this.socket.on('new_follower', callback);
    }
  }

  offNewFollower() {
    if (this.socket) {
      this.socket.off('new_follower');
    }
  }

  // Achievement methods
  onNewAchievement(callback: (achievement: Achievement) => void) {
    if (this.socket) {
      this.socket.on('new_achievement', callback);
    }
  }

  offNewAchievement() {
    if (this.socket) {
      this.socket.off('new_achievement');
    }
  }

  // Event methods
  onEventUpdate(callback: (event: Event) => void) {
    if (this.socket) {
      this.socket.on('event_update', callback);
    }
  }

  offEventUpdate() {
    if (this.socket) {
      this.socket.off('event_update');
    }
  }

  // Stats methods
  onStatsUpdate(callback: (stats: any) => void) {
    if (this.socket) {
      this.socket.on('stats_update', callback);
    }
  }

  offStatsUpdate() {
    if (this.socket) {
      this.socket.off('stats_update');
    }
  }

  // Message read status
  onMessagesRead(callback: (data: { conversationId: string; userId: string }) => void) {
    if (this.socket) {
      this.socket.on('messages_read', callback);
    }
  }

  offMessagesRead() {
    if (this.socket) {
      this.socket.off('messages_read');
    }
  }

  // Mark messages as read
  markMessagesAsRead(conversationId: string, messageIds: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('mark_as_read', { conversationId, messageIds });
    }
  }

  // Enhanced messaging methods
  onMessageStatus(callback: (data: { messageId: string; status: string; readAt?: string }) => void) {
    if (this.socket) {
      this.socket.on('message_status_update', callback);
    }
  }

  offMessageStatus() {
    if (this.socket) {
      this.socket.off('message_status_update');
    }
  }

  onUserOnlineStatus(callback: (data: { userId: string; isOnline: boolean; lastSeen?: string }) => void) {
    if (this.socket) {
      this.socket.on('user_online_status', callback);
    }
  }

  offUserOnlineStatus() {
    if (this.socket) {
      this.socket.off('user_online_status');
    }
  }

  // Poll voting methods
  onPollVoteUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('poll_vote_updated', callback);
    }
  }

  offPollVoteUpdate() {
    if (this.socket) {
      this.socket.off('poll_vote_updated');
    }
  }

  voteOnPoll(postId: string, optionId: string) {
    if (this.socket?.connected) {
      this.socket.emit('poll_vote', { postId, optionId });
    }
  }

  // Follow request methods
  onFollowRequestAccepted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('follow_request_accepted', callback);
    }
  }

  offFollowRequestAccepted() {
    if (this.socket) {
      this.socket.off('follow_request_accepted');
    }
  }

  onFollowRequestRejected(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('follow_request_rejected', callback);
    }
  }

  offFollowRequestRejected() {
    if (this.socket) {
      this.socket.off('follow_request_rejected');
    }
  }

  // Follow/Unfollow listeners
  onFollowStatusUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('follow_status_updated', callback);
    }
  }

  offFollowStatusUpdate() {
    if (this.socket) {
      this.socket.off('follow_status_updated');
    }
  }

  onNewFollowRequest(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('new_follow_request', callback);
    }
  }

  offNewFollowRequest() {
    if (this.socket) {
      this.socket.off('new_follow_request');
    }
  }

  onFollowRequestSent(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('follow_request_sent', callback);
    }
  }

  offFollowRequestSent() {
    if (this.socket) {
      this.socket.off('follow_request_sent');
    }
  }

  onUserFollowed(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_followed', callback);
    }
  }

  offUserFollowed() {
    if (this.socket) {
      this.socket.off('user_followed');
    }
  }

  onUserUnfollowed(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_unfollowed', callback);
    }
  }

  offUserUnfollowed() {
    if (this.socket) {
      this.socket.off('user_unfollowed');
    }
  }


}

// Create and export a singleton instance
export const socketService = new SocketService();
export default socketService;
