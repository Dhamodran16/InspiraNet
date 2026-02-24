import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, UserPlus, Trash2 } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { socketService } from '../../services/socketService';
import FollowRequestList from './FollowRequestList';
import { NotificationList } from './NotificationList';
import api from '../../services/api';

export default function EnhancedNotificationSystem() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUnreadCount();

    // Socket listeners for real-time updates
    const handleNewNotification = (notification: any) => {
      console.log('🔔 New notification received:', notification);
      loadUnreadCount();

      // Show toast for new notifications
      toast({
        title: notification.title || "New Notification",
        description: notification.message,
        duration: 5000,
      });
    };

    const handleNotificationRead = (notificationId: string) => {
      console.log('🔔 Notification marked as read:', notificationId);
      loadUnreadCount();
    };

    const handleNotificationUpdated = (notification: any) => {
      console.log('🔔 Notification updated:', notification);
      loadUnreadCount();
    };

    // Enhanced real-time listeners
    socketService.onNewNotification(handleNewNotification);
    socketService.onNotificationRead(handleNotificationRead);
    socketService.onNotificationUpdated?.(handleNotificationUpdated);

    // Listen for follow status updates that might affect notifications
    const handleFollowStatusUpdate = () => {
      console.log('🔔 Follow status updated, refreshing notifications');
      loadUnreadCount();
    };

    socketService.onFollowStatusUpdate(handleFollowStatusUpdate);

    return () => {
      socketService.offNewNotification();
      socketService.offNotificationRead();
      socketService.offNotificationUpdated?.();
      socketService.offFollowStatusUpdate();
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await api.get('/api/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleMarkAllRead = () => {
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: any) => {
    // Handle notification click - could navigate to related content
    console.log('Notification clicked:', notification);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center space-x-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground mt-2">
          Stay updated with your network activities and connections
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>All Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="follow-requests" className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Follow Requests</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                View and manage all your notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationList
                onNotificationClick={handleNotificationClick}
                onMarkAllRead={handleMarkAllRead}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="follow-requests">
          <Card>
            <CardHeader>
              <CardTitle>Follow Requests</CardTitle>
              <CardDescription>
                Manage incoming follow requests from other users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FollowRequestList onRequestProcessed={loadUnreadCount} />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}