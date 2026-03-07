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
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 md:py-6 pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 sm:gap-3">
          <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
          Stay updated with your network activities and connections
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="w-full overflow-x-auto scrollbar-none pb-2 max-w-full min-w-0">
          <TabsList className="flex space-x-2 min-w-max pb-1 bg-transparent border-0 p-0 h-auto justify-start">
            <TabsTrigger
              value="notifications"
              className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-sm group flex-1 sm:flex-none justify-center"
            >
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="ml-1 px-1.5 text-[10px] h-4 min-w-[1.25rem] flex items-center justify-center transition-colors border-none group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="follow-requests"
              className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-sm group flex-1 sm:flex-none justify-center"
            >
              <UserPlus className="h-4 w-4" />
              Requests
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="notifications" className="outline-none">
          <Card className="w-full border shadow-sm bg-card">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <CardTitle className="text-lg md:text-xl">All Notifications</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                View and manage all your notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:p-6">
              <NotificationList
                onNotificationClick={handleNotificationClick}
                onMarkAllRead={handleMarkAllRead}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="follow-requests" className="outline-none">
          <Card className="w-full border shadow-sm bg-card">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <CardTitle className="text-lg md:text-xl">Follow Requests</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Manage incoming follow requests from other users
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:p-6">
              <FollowRequestList onRequestProcessed={loadUnreadCount} />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}