import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  UserPlus, 
  Heart, 
  MessageSquare, 
  Share2, 
  Clock, 
  CheckCircle, 
  XCircle,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
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

interface NotificationListProps {
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
}

export function NotificationList({ onNotificationClick, onMarkAllRead }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'connection' | 'communication' | 'follow_requests' | 'read'>('all');

  useEffect(() => {
    loadNotifications();
  }, [currentPage, filter]);

  // Auto-refresh on socket new_notification and notification_read
  useEffect(() => {
    const handleNew = () => loadNotifications(currentPage, false);
    const handleRead = () => loadNotifications(currentPage, false);
    try {
      // Lazy import to avoid circular deps if any
      const { socketService } = require('@/services/socketService');
      socketService.onNewNotification(handleNew);
      socketService.onNotificationRead(handleRead);
      return () => {
        socketService.offNewNotification();
        socketService.offNotificationRead();
      };
    } catch (e) {
      console.warn('Socket not available for NotificationList auto-refresh');
    }
  }, [currentPage]);

  const loadNotifications = async (page = 1, append = false) => {
    try {
      setLoading(true);
      
      const params: any = { page, limit: 20 };
      
      if (filter && filter !== 'all') {
        if (filter === 'follow_requests') {
          params.type = 'follow_request';
        } else if (filter === 'communication') {
          params.category = 'communication';
        } else if (filter === 'connection') {
          params.category = 'connection';
        } else if (filter === 'unread') {
          params.isRead = false;
        } else if (filter === 'read') {
          params.isRead = true;
        }
      }

      const response = await api.get('/api/notifications', { params });
      
      if (append) {
        setNotifications(prev => [...prev, ...response.data.notifications]);
      } else {
        setNotifications(response.data.notifications || []);
      }
      
      setHasMore(response.data.pagination?.hasMore || false);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      toast({
        title: "Success",
        description: "Notification deleted"
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive"
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      onMarkAllRead?.();
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow_request':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'follow_accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'follow_rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'post_like':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'post_comment':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'post_share':
        return <Share2 className="h-5 w-5 text-purple-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'follow_request':
        return 'border-l-blue-500 bg-blue-50';
      case 'follow_accepted':
        return 'border-l-green-500 bg-green-50';
      case 'follow_rejected':
        return 'border-l-red-500 bg-red-50';
      case 'post_like':
        return 'border-l-red-500 bg-red-50';
      case 'post_comment':
        return 'border-l-blue-500 bg-blue-50';
      case 'post_share':
        return 'border-l-purple-500 bg-purple-50';
      case 'message':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    onNotificationClick?.(notification);
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
        <p className="text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Notifications</h3>
        <p className="text-muted-foreground">
          You're all caught up! Check back later for new updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and actions */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('read')}
          >
            Read
          </Button>
          <Button
            variant={filter === 'connection' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('connection')}
          >
            Connections
          </Button>
          <Button
            variant={filter === 'communication' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('communication')}
          >
            Messages
          </Button>
          <Button
            variant={filter === 'follow_requests' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('follow_requests')}
          >
            Follow Requests
          </Button>
        </div>
        
        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
          Mark All Read
        </Button>
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card 
            key={notification._id} 
            className={`border-l-4 ${getNotificationColor(notification.type)} ${
              !notification.isRead ? 'ring-2 ring-blue-200' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    {!notification.isRead && (
                      <Badge variant="secondary" className="text-xs">
                        New
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {notification.category}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      {notification.senderId && (
                        <div className="flex items-center space-x-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={notification.senderId.avatar} />
                            <AvatarFallback>
                              {notification.senderId.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{notification.senderId.name}</span>
                        </div>
                      )}
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                    </div>
                    
                    <div className="flex space-x-1">
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification._id)}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNotification(notification._id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => loadNotifications(currentPage + 1, true)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
