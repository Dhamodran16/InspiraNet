import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, MessageCircle, Calendar, Briefcase, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { socketService, Message } from '@/services/socketService';
import { toast } from '@/hooks/use-toast';

interface NotificationItem {
  id: string;
  type: 'message' | 'event' | 'job' | 'network' | 'general';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
}

export default function NotificationSystem() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const onIncomingMessage = (messageData: Message) => {
      addNotification({
        id: `msg_${Date.now()}`,
        type: 'message',
        title: 'New Message',
        message: messageData.content,
        timestamp: new Date(),
        isRead: false,
        actionUrl: `/messages`,
      });
    };

    socketService.onMessage(onIncomingMessage);

    return () => {
      // remove listeners when needed
    };
  }, [user]);

  const addNotification = (notification: NotificationItem) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]);
    setUnreadCount(prev => prev + 1);

    toast({
      title: notification.title,
      description: notification.message,
    });
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    setUnreadCount(0);
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => {
      const notif = prev.find(n => n.id === notificationId);
      if (notif && !notif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case 'event':
        return <Calendar className="w-4 h-4 text-green-500 dark:text-green-400" />;
      case 'job':
        return <Briefcase className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
      case 'network':
        return <Users className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getNotificationColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'message':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20';
      case 'event':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/20';
      case 'job':
        return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/20';
      case 'network':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950/20';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

             {isOpen && (
         <div className="absolute right-0 top-12 w-80 bg-card rounded-lg shadow-xl border border-border z-50 max-h-96 overflow-hidden">
           <div className="p-4 border-b border-border flex items-center justify-between">
             <h3 className="font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
                         {notifications.length === 0 ? (
               <div className="p-4 text-center text-muted-foreground">
                 <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                 <p>No notifications yet</p>
               </div>
             ) : (
              notifications.map((notification) => (
                                 <div
                   key={notification.id}
                   className={`p-4 border-b border-border hover:bg-muted cursor-pointer ${
                     !notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                   }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                                     <div className="flex items-start space-x-3">
                     <div className={`p-2 rounded-full bg-muted`}>
                       {getNotificationIcon(notification.type)}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between">
                         <h4 className="font-medium text-sm text-foreground">
                           {notification.title}
                         </h4>
                         <span className="text-xs text-muted-foreground">
                           {notification.timestamp.toLocaleTimeString()}
                         </span>
                       </div>
                       <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                         {notification.message}
                       </p>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                                         <Button
                       variant="ghost"
                       size="sm"
                       className="text-muted-foreground hover:text-foreground"
                       onClick={(e) => {
                         e.stopPropagation();
                         removeNotification(notification.id);
                       }}
                     >
                       <X className="w-3 h-3" />
                     </Button>
                  </div>
                </div>
              ))
            )}
          </div>

                     {notifications.length > 0 && (
             <div className="p-3 border-t border-border text-center">
               <Button
                 variant="ghost"
                 size="sm"
                 className="text-xs text-muted-foreground hover:text-foreground"
                 onClick={() => {
                   // Navigate to notifications page or clear all
                   setNotifications([]);
                   setUnreadCount(0);
                 }}
               >
                 Clear all notifications
               </Button>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
