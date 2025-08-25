import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../utils/urlConfig';

// 🚀 Dynamic socket URL based on environment
const SOCKET_URL = getSocketUrl();

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
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5; // Reduced from 10
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastActivity = Date.now();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupConnectionMonitoring();
    this.setupActivityTracking();
  }

  private setupActivityTracking() {
    // Track user activity to prevent unnecessary reconnections
    const trackActivity = () => {
      this.lastActivity = Date.now();
    };

    // Listen for user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });
  }

  private setupConnectionMonitoring() {
    // Monitor connection health every 60 seconds (increased from 30)
    this.connectionCheckInterval = setInterval(() => {
      if (this.socket && !this.socket.connected && this.isConnected) {
        console.log('Socket connection lost, attempting to reconnect...');
    this.setupSocket();
      }
    }, 60000);
  }

  private setupSocket() {
    if (this.socket || this.isConnected) return;
    
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        console.warn('No authentication token found for socket connection');
        this.isConnected = false;
        return;
      }

      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 15000, // Reduced from 20000
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 3000, // Reduced from 5000
        auth: {
          token: token
        },
        // Performance optimizations
        forceNew: false,
        multiplex: true,
        autoConnect: false
      });

      this.setupEventHandlers();
      this.setupHeartbeat();
      
      // Authenticate with the backend
      this.socket.emit('authenticate', { token });
      
    } catch (error) {
      console.error('Error setting up socket connection:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private setupHeartbeat() {
    if (!this.socket) return;

    // Send heartbeat every 30 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, 30000);
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('authenticated', (data) => {
      console.log('✅ Socket authenticated:', data);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, don't reconnect
        return;
      }
      
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    // Optimized event handlers with debouncing
    this.socket.on('new_message', this.debounceHandler('new_message', (data: any) => {
      this.emitToHandlers('new_message', data);
    }, 100));

    this.socket.on('message_read', this.debounceHandler('message_read', (data: any) => {
      this.emitToHandlers('message_read', data);
    }, 100));

    this.socket.on('new_notification', this.debounceHandler('new_notification', (data: any) => {
      this.emitToHandlers('new_notification', data);
    }, 200));

    this.socket.on('notification_read', this.debounceHandler('notification_read', (data: any) => {
      this.emitToHandlers('notification_read', data);
    }, 100));

    this.socket.on('post_update', this.debounceHandler('post_update', (data: any) => {
      this.emitToHandlers('post_update', data);
    }, 300));

    this.socket.on('user_status_update', this.debounceHandler('user_status_update', (data: any) => {
      this.emitToHandlers('user_status_update', data);
    }, 500));

    this.socket.on('follow_status_update', this.debounceHandler('follow_status_update', (data: any) => {
      this.emitToHandlers('follow_status_update', data);
    }, 200));
  }

  private debounceHandler(eventName: string, handler: Function, delay: number) {
    return (...args: any[]) => {
      const key = `${eventName}_${JSON.stringify(args)}`;
      
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key)!);
      }
      
      const timer = setTimeout(() => {
        handler(...args);
        this.debounceTimers.delete(key);
      }, delay);
      
      this.debounceTimers.set(key, timer);
    };
  }

  private emitToHandlers(eventName: string, data: any) {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${eventName} handler:`, error);
        }
      });
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 10000);
    
    this.reconnectTimer = setTimeout(() => {
      this.setupSocket();
    }, delay);
  }

  // Public methods
  connect() {
    if (!this.socket) {
      this.setupSocket();
    } else if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Event handling with optimized registration
  on(eventName: string, handler: Function) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    this.eventHandlers.get(eventName)!.add(handler);
  }

  off(eventName: string, handler?: Function) {
    if (handler) {
      this.eventHandlers.get(eventName)?.delete(handler);
    } else {
      this.eventHandlers.delete(eventName);
    }
  }

  // Specific event methods for better performance
  onNewMessage(handler: Function) { this.on('new_message', handler); }
  offNewMessage() { this.off('new_message'); }
  
  onMessageRead(handler: Function) { this.on('message_read', handler); }
  offMessageRead() { this.off('message_read'); }
  
  onNewNotification(handler: Function) { this.on('new_notification', handler); }
  offNewNotification() { this.off('new_notification'); }
  
  onNotificationRead(handler: Function) { this.on('notification_read', handler); }
  offNotificationRead() { this.off('notification_read'); }
  
  onPostUpdate(handler: Function) { this.on('post_update', handler); }
  offPostUpdate() { this.off('post_update'); }
  
  onPostCommentAdded(handler: Function) { this.on('post_comment_added', handler); }
  offPostCommentAdded() { this.off('post_comment_added'); }
  
  onPostLikeUpdated(handler: Function) { this.on('post_like_updated', handler); }
  offPostLikeUpdated() { this.off('post_like_updated'); }
  
  onUserStatusUpdate(handler: Function) { this.on('user_status_update', handler); }
  offUserStatusUpdate() { this.off('user_status_update'); }
  
  onFollowStatusUpdate(handler: Function) { this.on('follow_status_update', handler); }
  offFollowStatusUpdate() { this.off('follow_status_update'); }

  // Additional methods used by other components
  onMessage(handler: Function) { this.on('new_message', handler); }
  offMessage() { this.off('new_message'); }
  
  onTyping(handler: Function) { this.on('typing', handler); }
  offTyping() { this.off('typing'); }
  
  onStopTyping(handler: Function) { this.on('stop_typing', handler); }
  offStopTyping() { this.off('stop_typing'); }
  
  onMessageStatus(handler: Function) { this.on('message_status', handler); }
  offMessageStatus() { this.off('message_status'); }
  
  onUserStatus(handler: Function) { this.on('user_status', handler); }
  offUserStatus() { this.off('user_status'); }
  
  onConversationUpdate(handler: Function) { this.on('conversation_update', handler); }
  offConversationUpdate() { this.off('conversation_update'); }
  
  onNotificationUpdated(handler: Function) { this.on('notification_updated', handler); }
  offNotificationUpdated() { this.off('notification_updated'); }
  
  onFollowRequestAccepted(handler: Function) { this.on('follow_request_accepted', handler); }
  offFollowRequestAccepted() { this.off('follow_request_accepted'); }
  
  onFollowRequestRejected(handler: Function) { this.on('follow_request_rejected', handler); }
  offFollowRequestRejected() { this.off('follow_request_rejected'); }
  
  onNewFollowRequest(handler: Function) { this.on('new_follow_request', handler); }
  offNewFollowRequest() { this.off('new_follow_request'); }
  
  onUserFollowed(handler: Function) { this.on('user_followed', handler); }
  offUserFollowed() { this.off('user_followed'); }
  
  onUserUnfollowed(handler: Function) { this.on('user_unfollowed', handler); }
  offUserUnfollowed() { this.off('user_unfollowed'); }
  
  onStatsUpdate(handler: Function) { this.on('stats_update', handler); }
  offStatsUpdate() { this.off('stats_update'); }

  // Emit methods with error handling
  emit(eventName: string, data: any) {
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit(eventName, data);
      } catch (error) {
        console.error(`Error emitting ${eventName}:`, error);
      }
    } else {
      console.warn(`Socket not connected, cannot emit ${eventName}`);
    }
  }

  // Specific emit methods
  sendMessage(messageData: any) {
    this.emit('send_message', messageData);
  }

  markMessagesAsRead(conversationId: string, messageIds: string[]) {
    this.emit('mark_messages_read', { conversationId, messageIds });
  }

  markNotificationAsRead(notificationId: string) {
    this.emit('mark_notification_read', { notificationId });
  }

  // Additional emit methods used by other components
  joinConversations(conversationIds: string[]) {
    this.emit('join_conversations', { conversationIds });
  }

  leaveConversations(conversationIds: string[]) {
    this.emit('leave_conversations', { conversationIds });
  }

  startTyping(conversationId: string) {
    this.emit('start_typing', { conversationId });
  }

  stopTyping(conversationId: string) {
    this.emit('stop_typing', { conversationId });
  }

  // Settings update
  updateSettings(section: string, data: any) {
    this.emit('settings-updated', { section, data });
  }

  // Cleanup
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // Clear event handlers
    this.eventHandlers.clear();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
  }
}

// Export singleton instance
const socketService = new SocketService();

// Ensure the service is properly initialized
if (typeof window !== 'undefined') {
  // Initialize socket connection when the service is imported
  setTimeout(() => {
    socketService.connect();
  }, 100);
}

export { socketService };
