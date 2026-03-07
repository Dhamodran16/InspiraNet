import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  BellRing,
  Users,
  Radio,
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
import { socketService } from '@/services/socketService';

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

    socketService.onNewNotification(handleNew);
    socketService.onNotificationRead(handleRead);
    return () => {
      socketService.offNewNotification();
      socketService.offNotificationRead();
    };
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
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/20';
      case 'follow_accepted':
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-900/20';
      case 'follow_rejected':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-900/20';
      case 'post_like':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-900/20';
      case 'post_comment':
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/20';
      case 'post_share':
        return 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/20';
      case 'message':
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-900/20';
      default:
        return 'border-l-gray-500 bg-gray-50/50 dark:bg-slate-800/20';
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
      {/* Header with filters and actions - Made responsive with horizontal scroll */}
      {/* Header with filters and actions - Made responsive with horizontal scroll */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="w-full sm:w-auto overflow-x-auto scrollbar-none">
          <div className="flex space-x-2 min-w-max pb-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border ${filter === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Bell className="h-4 w-4" />
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border ${filter === 'unread' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <BellRing className="h-4 w-4" />
              Unread
            </button>
            <button
              onClick={() => setFilter('connection')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border ${filter === 'connection' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Users className="h-4 w-4" />
              Network
            </button>
            <button
              onClick={() => setFilter('communication')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border ${filter === 'communication' ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Radio className="h-4 w-4" />
              Alerts
            </button>
            <button
              onClick={() => setFilter('follow_requests')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border ${filter === 'follow_requests' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <UserPlus className="h-4 w-4" />
              Follow
            </button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllRead}
          className="h-9 px-3 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-semibold flex-shrink-0 transition-all w-full sm:w-auto whitespace-nowrap"
        >
          <CheckCircle className="h-4 w-4 mr-1.5" />
          Mark all read
        </Button>
      </div>

      {/* Notifications list */}
      <div className="flex flex-col gap-2.5 sm:gap-3 px-3 sm:px-0 mt-2 sm:mt-3">
        {notifications.map((notification) => (
          <div
            key={notification._id}
            className={`transition-all duration-300 transform hover:scale-[1.005] sm:rounded-lg sm:border-l-4 sm:border shadow-sm hover:shadow-md ${getNotificationColor(notification.type)} ${!notification.isRead ? 'bg-blue-50/40 ring-1 ring-blue-100/50' : 'bg-white sm:bg-card'
              } p-3 sm:p-3 relative overflow-hidden group`}
          >
            <div className="p-0">
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="scale-90 transform origin-top">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                    <h4 className="font-semibold text-[13px] sm:text-sm leading-tight break-words flex-1 min-w-[100px]">
                      {notification.title}
                    </h4>
                    <div className="flex items-center gap-1 ml-auto">
                      {!notification.isRead && (
                        <Badge variant="secondary" className="text-[9px] px-1 h-3.5 leading-none">
                          New
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] px-1 h-3.5 leading-none opacity-70">
                        {notification.category}
                      </Badge>
                    </div>
                  </div>

                  {notification.message && (
                    <p className="text-[12px] sm:text-[13px] text-muted-foreground mb-2 line-clamp-2 md:line-clamp-none leading-snug">
                      {notification.message}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1 pt-1 border-t border-black/5 dark:border-white/5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] sm:text-[10px] text-muted-foreground/80">
                      {notification.senderId && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-3.5 w-3.5">
                            <AvatarImage src={notification.senderId.avatar} />
                            <AvatarFallback className="text-[7px]">
                              {notification.senderId.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="max-w-[80px] truncate font-medium">{notification.senderId.name}</span>
                        </div>
                      )}
                      <span className="opacity-40">•</span>
                      <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          className="h-5 w-5 p-0 hover:bg-blue-100/50"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-100/50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={() => loadNotifications(currentPage + 1, true)}
            disabled={loading}
            className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
