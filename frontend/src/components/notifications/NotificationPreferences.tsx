import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, MessageCircle, Calendar, Users, Briefcase, Mail, Smartphone, Globe } from 'lucide-react';
import notificationService, { NotificationSettings } from '@/services/notificationService';
import { socketService } from '@/services/socketService';
import { toast } from '@/hooks/use-toast';

type NotificationPreferencesType = {
  browserNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  messageNotifications: boolean;
  eventReminders: boolean;
  placementUpdates: boolean;
  connectionRequests: boolean;
};

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferencesType>({
    browserNotifications: true,
    emailNotifications: true,
    pushNotifications: true,
    messageNotifications: true,
    eventReminders: true,
    placementUpdates: true,
    connectionRequests: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await notificationService.getSettings();
      // Handle both response structures: { settings } or { success: true, settings }
      const userSettings = (response as any).settings || response;
      
      if (userSettings) {
        setSettings(userSettings as NotificationSettings);
        
        // Map backend settings to local preferences
        setPreferences({
          browserNotifications: userSettings.communication?.pushNotifications || false,
          emailNotifications: userSettings.communication?.emailNotifications || false,
          pushNotifications: userSettings.communication?.pushNotifications || false,
          messageNotifications: userSettings.notifications?.newMessages || false,
          eventReminders: userSettings.notifications?.eventReminders || false,
          placementUpdates: userSettings.notifications?.jobUpdates || false,
          connectionRequests: userSettings.notifications?.followRequests || false
        });
      }
    } catch (error: any) {
      console.error('Error loading notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // Check notification permission status
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    // Listen for real-time settings updates
    const handleSettingsUpdate = (data: { settings: NotificationSettings }) => {
      if (data.settings) {
        setSettings(data.settings);
        // Update local preferences from real-time update
        setPreferences({
          browserNotifications: data.settings.communication.pushNotifications || false,
          emailNotifications: data.settings.communication.emailNotifications || false,
          pushNotifications: data.settings.communication.pushNotifications || false,
          messageNotifications: data.settings.notifications.newMessages || false,
          eventReminders: data.settings.notifications.eventReminders || false,
          placementUpdates: data.settings.notifications.jobUpdates || false,
          connectionRequests: data.settings.notifications.followRequests || false
        });
        toast({
          title: "Settings Updated",
          description: "Notification preferences updated in real-time",
        });
      }
    };

    socketService.on('settings_updated', handleSettingsUpdate);

    return () => {
      socketService.off('settings_updated', handleSettingsUpdate);
    };
  }, [loadSettings]);

  const handlePreferenceChange = async (key: keyof NotificationPreferencesType, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    try {
      setIsSaving(true);
      
      // Map local preferences to backend settings structure
      const updateData: Partial<NotificationSettings> = {};
      
      if (key === 'emailNotifications') {
        updateData.communication = {
          ...(settings?.communication || {}),
          emailNotifications: value
        } as any;
      } else if (key === 'pushNotifications' || key === 'browserNotifications') {
        updateData.communication = {
          ...(settings?.communication || {}),
          pushNotifications: value
        } as any;
      } else if (key === 'messageNotifications') {
        updateData.notifications = {
          ...(settings?.notifications || {}),
          newMessages: value
        } as any;
      } else if (key === 'eventReminders') {
        updateData.notifications = {
          ...(settings?.notifications || {}),
          eventReminders: value
        } as any;
      } else if (key === 'placementUpdates') {
        updateData.notifications = {
          ...(settings?.notifications || {}),
          jobUpdates: value
        } as any;
      } else if (key === 'connectionRequests') {
        updateData.notifications = {
          ...(settings?.notifications || {}),
          followRequests: value
        } as any;
      }

      await notificationService.updateSettings(updateData);
      
      toast({
        title: "Success",
        description: "Notification preferences updated",
      });
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update preferences",
        variant: "destructive"
      });
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        
        if (permission === 'granted') {
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
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("Test Notification", {
          body: "This is a test notification to verify your settings are working correctly.",
          icon: "/favicon.ico"
        });
        toast({
          title: "Test Sent",
          description: "Test notification sent successfully",
        });
      } else {
        toast({
          title: "Permission Required",
          description: "Please grant notification permission first",
          variant: "destructive"
        });
      }
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
