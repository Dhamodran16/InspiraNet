import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Calendar, 
  Trophy, 
  TrendingUp,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/services/socketService';
import { api } from '@/services/api';

interface RealTimeStats {
  totalUsers: number;
  onlineUsers: number;
  totalPosts: number;
  totalEvents: number;
  totalAchievements: number;
  activeConversations: number;
  usersByType: {
    alumni: number;
    student: number;
    faculty: number;
  };
  onlineUsersByType: {
    alumni: number;
    student: number;
    faculty: number;
  };
}

interface LiveActivity {
  id: string;
  type: 'post' | 'message' | 'follow' | 'achievement' | 'event';
  user: {
    name: string;
    type: string;
    avatar?: string;
  };
  action: string;
  timestamp: string;
}

export default function RealTimeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<RealTimeStats>({
    totalUsers: 0,
    onlineUsers: 0,
    totalPosts: 0,
    totalEvents: 0,
    totalAchievements: 0,
    activeConversations: 0,
    usersByType: { alumni: 0, student: 0, faculty: 0 },
    onlineUsersByType: { alumni: 0, student: 0, faculty: 0 }
  });
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Load initial stats
  const loadStats = async () => {
    try {
      // This would be a new API endpoint to get real-time stats
      const response = await api.getRealTimeStats();
      setStats(response);
    } catch (error) {
      console.error('Error loading real-time stats:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  // Listen for real-time updates
  useEffect(() => {
    if (user) {
      // Connection status
      const checkConnection = () => {
        setIsConnected(socketService.isConnected());
      };

      // Listen for new posts
      const handleNewPost = (data: { post: any; author: any; timestamp: string }) => {
        setStats(prev => ({
          ...prev,
          totalPosts: prev.totalPosts + 1
        }));

        setLiveActivities(prev => [{
          id: Date.now().toString(),
          type: 'post',
          user: {
            name: data.author.name,
            type: data.author.type,
            avatar: data.author.avatar
          },
          action: 'created a new post',
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 9)]); // Keep only last 10 activities
      };

      // Listen for new messages
      const handleNewMessage = (data: { message: any; sender: any }) => {
        setLiveActivities(prev => [{
          id: Date.now().toString(),
          type: 'message',
          user: {
            name: data.sender.name,
            type: data.sender.type,
            avatar: data.sender.avatar
          },
          action: 'sent a message',
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 9)]);
      };

      // Listen for new followers
      const handleNewFollower = (data: { followerId: string; followerName: string; followerType: string }) => {
        setLiveActivities(prev => [{
          id: Date.now().toString(),
          type: 'follow',
          user: {
            name: data.followerName,
            type: data.followerType
          },
          action: 'started following someone',
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 9)]);
      };

      // Listen for new achievements
      const handleNewAchievement = (data: { userId: string; userName: string; userType: string; achievement: any }) => {
        setStats(prev => ({
          ...prev,
          totalAchievements: prev.totalAchievements + 1
        }));

        setLiveActivities(prev => [{
          id: Date.now().toString(),
          type: 'achievement',
          user: {
            name: data.userName,
            type: data.userType
          },
          action: `achieved: ${data.achievement.title}`,
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 9)]);
      };

      // Listen for new events
      const handleEventUpdate = (data: { event: any; creator: any }) => {
        setStats(prev => ({
          ...prev,
          totalEvents: prev.totalEvents + 1
        }));

        setLiveActivities(prev => [{
          id: Date.now().toString(),
          type: 'event',
          user: {
            name: data.creator.name,
            type: data.creator.type
          },
          action: 'created a new event',
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 9)]);
      };

      // Listen for user status changes
      const handleUserStatusChange = (data: { userId: string; status: 'online' | 'offline' }) => {
        if (data.status === 'online') {
          setStats(prev => ({
            ...prev,
            onlineUsers: prev.onlineUsers + 1
          }));
        } else {
          setStats(prev => ({
            ...prev,
            onlineUsers: Math.max(0, prev.onlineUsers - 1)
          }));
        }
      };

      // Set up socket listeners
      socketService.onNewPost(handleNewPost);
      socketService.onMessage(handleNewMessage);
      socketService.onNewFollower(handleNewFollower);
      socketService.onNewAchievement(handleNewAchievement);
      socketService.onEventUpdate(handleEventUpdate);
      socketService.onUserStatusChange(handleUserStatusChange);

      // Check connection status periodically
      const connectionInterval = setInterval(checkConnection, 5000);

      // Cleanup listeners on unmount
      return () => {
        socketService.offNewPost();
        socketService.offMessage();
        socketService.offNewFollower();
        socketService.offNewAchievement();
        socketService.offEventUpdate();
        socketService.offUserStatusChange();
        clearInterval(connectionInterval);
      };
    }
  }, [user]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'follow': return <Users className="h-4 w-4" />;
      case 'achievement': return <Trophy className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'alumni': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      case 'faculty': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <span>Real-time Connection Active</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-500" />
                <span>Real-time Connection Offline</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.onlineUsers} currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Growing daily
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Community events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAchievements}</div>
            <p className="text-xs text-muted-foreground">
              Milestones reached
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Alumni
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stats.usersByType.alumni}</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.onlineUsersByType.alumni} online
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Students
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stats.usersByType.student}</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.onlineUsersByType.student} online
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    Faculty
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stats.usersByType.faculty}</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.onlineUsersByType.faculty} online
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Live Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {liveActivities.length > 0 ? (
                  liveActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{activity.user.name}</span>
                          <Badge variant="outline" className={`text-xs ${getTypeColor(activity.user.type)}`}>
                            {activity.user.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
