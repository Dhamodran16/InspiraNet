import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  UserPlus,
  Heart,
  MessageSquare,
  Calendar,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/services/socketService';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface NotificationSettings {
  followRequests: boolean;
  followAccepted: boolean;
  followRejected: boolean;
  postLikes: boolean;
  postComments: boolean;
  postShares: boolean;
  postMentions: boolean;
  newMessages: boolean;
  messageReadReceipts: boolean;
  eventReminders: boolean;
  eventInvitations: boolean;
  jobApplications: boolean;
  jobUpdates: boolean;
  systemAnnouncements: boolean;
  securityAlerts: boolean;
}

interface EnhancedNotificationSettingsProps {
  notifications: NotificationSettings;
  onUpdate: (notifications: NotificationSettings) => void;
}

const EnhancedNotificationSettings: React.FC<EnhancedNotificationSettingsProps> = ({ notifications, onUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Real-time state
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<Array<{
    id: string;
    action: string;
    timestamp: Date;
    status: 'success' | 'error' | 'pending';
  }>>([]);

  // Helper functions
  const addActivityLog = useCallback((action: string, status: 'success' | 'error' | 'pending') => {
    const logEntry = {
      id: Date.now().toString(),
      action,
      timestamp: new Date(),
      status
    };
    setActivityLog(prev => [logEntry, ...prev.slice(0, 49)]);
  }, []);

  // Handle notification update with activity logging
  const handleNotificationUpdate = useCallback((field: string, checked: boolean) => {
    const updatedNotifications = { ...notifications, [field]: checked };
    addActivityLog(`${field} ${checked ? 'enabled' : 'disabled'}`, 'pending');
    setSyncStatus('syncing');

    // Optimistically update the UI
    onUpdate(updatedNotifications);

    // The parent component (Settings.tsx) will handle the API call and update state
    // We'll update sync status when we receive the real-time update via socket
  }, [notifications, onUpdate, addActivityLog]);

  const addPendingChange = useCallback((change: string) => {
    setPendingChanges(prev => [...prev, change]);
  }, []);

  const removePendingChange = useCallback((change: string) => {
    setPendingChanges(prev => prev.filter(c => c !== change));
  }, []);

  // Initialize component
  useEffect(() => {
    // Real-time connection monitoring
    const handleSocketConnect = () => {
      setIsOnline(true);
      addActivityLog('Real-time connection established', 'success');
    };

    const handleSocketDisconnect = () => {
      setIsOnline(false);
      addActivityLog('Real-time connection lost', 'error');
    };

    // Connect socket events
    socketService.connect();

    // Listen for real-time settings updates
    const handleSettingsUpdate = (data: { settings: any }) => {
      if (data.settings && data.settings.notifications) {
        // Update will be handled by parent component, but log the activity
        addActivityLog('Settings updated via real-time', 'success');
        setLastSync(new Date());
        setSyncStatus('synced');
      }
    };

    socketService.on('settings_updated', handleSettingsUpdate);

    // Monitor connection status
    const checkConnection = () => {
      setIsOnline(socketService.getConnectionStatus());
    };

    // Check connection periodically
    const interval = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(interval);
      socketService.off('settings_updated', handleSettingsUpdate);
    };
  }, [addActivityLog]);

  return (
    <div className="space-y-6">
      {/* Real-time Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {isOnline ? 'Real-time Active' : 'Offline'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {syncStatus === 'synced' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {syncStatus === 'syncing' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                {syncStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                <span className="text-sm text-muted-foreground">
                  Last sync: {lastSync.toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {pendingChanges.length > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {pendingChanges.length} pending
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Preferences</span>
          </CardTitle>
          <CardDescription>
            Configure your notification preferences with live updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">Real-time Updates</Label>
                <p className="text-xs text-muted-foreground">Receive live updates</p>
              </div>
            </div>
            <Switch
              checked={realTimeUpdates}
              onCheckedChange={setRealTimeUpdates}
            />
          </div>

          <Separator />

          {/* Follow Notifications */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Follow & Connection Notifications</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="followRequests">Follow Requests</Label>
                <Switch
                  id="followRequests"
                  checked={notifications.followRequests}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('followRequests', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="followAccepted">Follow Accepted</Label>
                <Switch
                  id="followAccepted"
                  checked={notifications.followAccepted}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('followAccepted', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="followRejected">Follow Rejected</Label>
                <Switch
                  id="followRejected"
                  checked={notifications.followRejected}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('followRejected', checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Post Notifications */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>Post Notifications</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="postLikes">Post Likes</Label>
                <Switch
                  id="postLikes"
                  checked={notifications.postLikes}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('postLikes', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="postComments">Post Comments</Label>
                <Switch
                  id="postComments"
                  checked={notifications.postComments}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('postComments', checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Message Notifications */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Message Notifications</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="newMessages">New Messages</Label>
                <Switch
                  id="newMessages"
                  checked={notifications.newMessages}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('newMessages', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="messageReadReceipts">Read Receipts</Label>
                <Switch
                  id="messageReadReceipts"
                  checked={notifications.messageReadReceipts}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('messageReadReceipts', checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Event Notifications */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Event Notifications</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="eventReminders">Event Reminders</Label>
                <Switch
                  id="eventReminders"
                  checked={notifications.eventReminders}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('eventReminders', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="eventInvitations">Event Invitations</Label>
                <Switch
                  id="eventInvitations"
                  checked={notifications.eventInvitations}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('eventInvitations', checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Job Notifications */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Briefcase className="h-4 w-4" />
              <span>Job Notifications</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="jobApplications">Job Applications</Label>
                <Switch
                  id="jobApplications"
                  checked={notifications.jobApplications}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('jobApplications', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="jobUpdates">Job Updates</Label>
                <Switch
                  id="jobUpdates"
                  checked={notifications.jobUpdates}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('jobUpdates', checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* System Notifications */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>System Notifications</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="systemAnnouncements">System Announcements</Label>
                <Switch
                  id="systemAnnouncements"
                  checked={notifications.systemAnnouncements}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('systemAnnouncements', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="securityAlerts">Security Alerts</Label>
                <Switch
                  id="securityAlerts"
                  checked={notifications.securityAlerts}
                  onCheckedChange={(checked) =>
                    handleNotificationUpdate('securityAlerts', checked)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Activity Log</span>
          </CardTitle>
          <CardDescription>
            Recent changes to your notification settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activityLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No activity yet</p>
              </div>
            ) : (
              activityLog.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-2">
                    {log.status === 'success' && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                    {log.status === 'error' && (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    )}
                    {log.status === 'pending' && (
                      <Clock className="h-3 w-3 text-yellow-500" />
                    )}
                    <span className="text-xs">{log.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedNotificationSettings;
