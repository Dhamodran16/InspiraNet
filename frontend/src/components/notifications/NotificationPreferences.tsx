import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, MessageCircle, Calendar, Users, Briefcase, Mail, Smartphone, Globe } from 'lucide-react';
import { notificationService, NotificationPreferences } from '@/services/notificationService';
import { toast } from '@/hooks/use-toast';

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    browserNotifications: true,
    emailNotifications: true,
    pushNotifications: true,
    messageNotifications: true,
    eventReminders: true,
    placementUpdates: true,
    connectionRequests: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Load current preferences
    const currentPreferences = notificationService.getPreferences();
    setPreferences(currentPreferences);

    // Check notification permission status
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    notificationService.updatePreferences(newPreferences);
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setPermissionStatus('granted');
        toast({
          title: "Permission Granted",
          description: "You can now receive browser notifications",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Browser notifications are disabled. You can enable them in your browser settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request notification permission",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.sendNotification({
        title: "Test Notification",
        message: "This is a test notification to verify your settings are working correctly.",
        type: "info",
        category: "system"
      });
      toast({
        title: "Test Sent",
        description: "Test notification sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive"
      });
    }
  };

  const getPermissionStatusColor = (status: NotificationPermission) => {
    switch (status) {
      case 'granted': return 'text-green-600';
      case 'denied': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getPermissionStatusText = (status: NotificationPermission) => {
    switch (status) {
      case 'granted': return 'Enabled';
      case 'denied': return 'Disabled';
      default: return 'Not Set';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-muted-foreground">
            Customize how and when you receive notifications
          </p>
        </div>
        <Button onClick={handleTestNotification} variant="outline">
          Test Notifications
        </Button>
      </div>

      {/* Browser Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Browser Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Permission Status</Label>
              <p className="text-sm text-muted-foreground">
                Current browser notification permission
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`font-medium ${getPermissionStatusColor(permissionStatus)}`}>
                {getPermissionStatusText(permissionStatus)}
              </span>
              {permissionStatus === 'default' && (
                <Button 
                  onClick={handleRequestPermission} 
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? 'Requesting...' : 'Request Permission'}
                </Button>
              )}
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="browser-notifications" className="text-base font-medium">
                Enable Browser Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in your browser
              </p>
            </div>
            <Switch
              id="browser-notifications"
              checked={preferences.browserNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('browserNotifications', checked)}
              disabled={permissionStatus !== 'granted'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <Label htmlFor="email-notifications" className="text-base font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <div>
                <Label htmlFor="push-notifications" className="text-base font-medium">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on mobile
                </p>
              </div>
            </div>
            <Switch
              id="push-notifications"
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <div>
                <Label htmlFor="message-notifications" className="text-base font-medium">
                  Message Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  New messages and chat updates
                </p>
              </div>
            </div>
            <Switch
              id="message-notifications"
              checked={preferences.messageNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('messageNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <Label htmlFor="event-reminders" className="text-base font-medium">
                  Event Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Event notifications and reminders
                </p>
              </div>
            </div>
            <Switch
              id="event-reminders"
              checked={preferences.eventReminders}
              onCheckedChange={(checked) => handlePreferenceChange('eventReminders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-indigo-600" />
              <div>
                <Label htmlFor="connection-requests" className="text-base font-medium">
                  Connection Requests
                </Label>
                <p className="text-sm text-muted-foreground">
                  New connection requests and updates
                </p>
              </div>
            </div>
            <Switch
              id="connection-requests"
              checked={preferences.connectionRequests}
              onCheckedChange={(checked) => handlePreferenceChange('connectionRequests', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              <div>
                <Label htmlFor="placement-updates" className="text-base font-medium">
                  Placement Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Job opportunities and placement news
                </p>
              </div>
            </div>
            <Switch
              id="placement-updates"
              checked={preferences.placementUpdates}
              onCheckedChange={(checked) => handlePreferenceChange('placementUpdates', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Bell className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Notification Tips:</p>
              <ul className="space-y-1">
                <li>• Browser notifications require permission from your browser</li>
                <li>• Email notifications are sent to your registered email address</li>
                <li>• Push notifications work best on mobile devices</li>
                <li>• You can test your settings using the "Test Notifications" button</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
