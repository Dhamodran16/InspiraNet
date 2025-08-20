import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { BarChart, LineChart, PieChart, TrendingUp, Users, MessageCircle, Heart, Eye, Download, Calendar, Target, Activity } from 'lucide-react';
import api from '../services/api';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalPosts: number;
    totalEngagements: number;
    growthRate: number;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    messages: number;
    followRequests: number;
  };
  content: {
    postsByType: { type: string; count: number }[];
    topPosts: { id: string; title: string; engagement: number }[];
    trendingTopics: { topic: string; count: number }[];
  };
  users: {
    newUsers: { date: string; count: number }[];
    userTypes: { type: string; count: number }[];
    topUsers: { id: string; name: string; engagement: number }[];
  };
  timeSeries: {
    daily: { date: string; users: number; posts: number; engagement: number }[];
    weekly: { week: string; users: number; posts: number; engagement: number }[];
    monthly: { month: string; users: number; posts: number; engagement: number }[];
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics?range=${timeRange}`);
      if (response.data.success) {
        setData(response.data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return num > 0 ? `+${num}%` : `${num}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Track user engagement and platform performance
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={loadAnalytics}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Users</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{formatNumber(data.overview.totalUsers)}</div>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingUp className={`h-4 w-4 ${data.overview.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`text-sm ${data.overview.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(data.overview.growthRate)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Active Users</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{formatNumber(data.overview.activeUsers)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {((data.overview.activeUsers / data.overview.totalUsers) * 100).toFixed(1)}% of total
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Posts</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{formatNumber(data.overview.totalPosts)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {data.overview.totalUsers > 0 ? (data.overview.totalPosts / data.overview.totalUsers).toFixed(1) : 0} per user
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-muted-foreground">Engagements</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{formatNumber(data.overview.totalEngagements)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {data.overview.totalPosts > 0 ? (data.overview.totalEngagements / data.overview.totalPosts).toFixed(1) : 0} per post
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span>Likes</span>
                    </div>
                    <span className="font-medium">{formatNumber(data.engagement.likes)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      <span>Comments</span>
                    </div>
                    <span className="font-medium">{formatNumber(data.engagement.comments)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4 text-green-500" />
                      <span>Shares</span>
                    </div>
                    <span className="font-medium">{formatNumber(data.engagement.shares)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4 text-purple-500" />
                      <span>Messages</span>
                    </div>
                    <span className="font-medium">{formatNumber(data.engagement.messages)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.content.postsByType.map((type) => (
                    <div key={type.type} className="flex items-center justify-between">
                      <span className="capitalize">{type.type}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(type.count / data.overview.totalPosts) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {type.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.content.topPosts.slice(0, 5).map((post, index) => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{post.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(post.engagement)} engagements
                          </p>
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trending Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.content.trendingTopics.slice(0, 8).map((topic, index) => (
                    <div key={topic.topic} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm">#{topic.topic}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{topic.count} posts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Average Engagement Rate</span>
                    <span className="font-medium">
                      {data.overview.totalPosts > 0 
                        ? ((data.overview.totalEngagements / data.overview.totalPosts) * 100).toFixed(2)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Posts per Day</span>
                    <span className="font-medium">
                      {timeRange === '7d' ? (data.overview.totalPosts / 7).toFixed(1) :
                       timeRange === '30d' ? (data.overview.totalPosts / 30).toFixed(1) :
                       timeRange === '90d' ? (data.overview.totalPosts / 90).toFixed(1) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Engagement per User</span>
                    <span className="font-medium">
                      {data.overview.totalUsers > 0 
                        ? (data.overview.totalEngagements / data.overview.totalUsers).toFixed(1)
                        : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.content.postsByType.map((type) => (
                    <div key={type.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="capitalize">{type.type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{type.count}</span>
                        <span className="text-sm text-muted-foreground">
                          ({((type.count / data.overview.totalPosts) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.users.newUsers.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(day.count / Math.max(...data.users.newUsers.map(u => u.count))) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{day.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.users.topUsers.slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(user.engagement)} engagements
                          </p>
                        </div>
                      </div>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
