import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Search, 
  Filter, 
  Check, 
  Trash2, 
  MessageCircle, 
  Calendar, 
  Users, 
  Briefcase, 
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { notificationService, NotificationData } from '@/services/notificationService';
import { toast } from '@/hooks/use-toast';

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    const allNotifications = notificationService.getNotifications();
    setNotifications(allNotifications);
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           notification.message.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || notification.category === categoryFilter;
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'read' && notification.isRead) ||
                           (statusFilter === 'unread' && !notification.isRead);
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [notifications, searchQuery, categoryFilter, statusFilter]);

  const handleMarkAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
    loadNotifications();
    toast({
      title: "Marked as Read",
      description: "Notification marked as read",
    });
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    loadNotifications();
    toast({
      title: "All Marked as Read",
      description: "All notifications marked as read",
    });
  };

  const handleClearAll = () => {
    notificationService.clearNotifications();
    setNotifications([]);
    toast({
      title: "Notifications Cleared",
      description: "All notifications have been cleared",
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'message': return <MessageCircle className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'connection': return <Users className="w-4 h-4" />;
      case 'placement': return <Briefcase className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'message': return 'bg-green-100 text-green-800';
      case 'event': return 'bg-orange-100 text-orange-800';
      case 'connection': return 'bg-indigo-100 text-indigo-800';
      case 'placement': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(timestamp).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification History</h2>
          <p className="text-muted-foreground">
            View and manage all your notifications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-sm">
            {unreadCount} unread
          </Badge>
          <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
            <Check className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button onClick={handleClearAll} variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="event">Events</SelectItem>
                <SelectItem value="connection">Connections</SelectItem>
                <SelectItem value="placement">Placements</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="text-sm text-muted-foreground flex items-center justify-center">
              {filteredNotifications.length} of {notifications.length} notifications
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No notifications found</p>
              <p className="text-sm">
                {notifications.length === 0 
                  ? "You don't have any notifications yet" 
                  : "Try adjusting your search or filters"
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.isRead 
                        ? 'bg-background hover:bg-muted/50' 
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="text-xs">
                          {getTypeIcon(notification.type)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className={`font-medium text-sm ${
                                notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                              }`}>
                                {notification.title}
                              </h4>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getCategoryColor(notification.category)}`}
                              >
                                {getCategoryIcon(notification.category)}
                                <span className="ml-1 capitalize">{notification.category}</span>
                              </Badge>
                            </div>
                            
                            <p className={`text-sm ${
                              notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                            }`}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              
                              {notification.actionUrl && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => window.open(notification.actionUrl, '_blank')}
                                >
                                  View Details
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
