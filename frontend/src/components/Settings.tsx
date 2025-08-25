import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Trash2, 
  Key, 
  Eye, 
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Wifi,
  WifiOff,
  Activity,
  Settings as SettingsIcon
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/services/socketService';
import api from '@/services/api';
import EnhancedNotificationSettings from '@/components/notifications/EnhancedNotificationSettings';

interface UserSettings {
  _id: string;
  userId: string;
  notifications: {
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
  };
  privacy: {
    profileVisibility: 'public' | 'connections' | 'private';
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    showCompany: boolean;
    showBatch: boolean;
    showDepartment: boolean;
    allowMessagesFrom: 'everyone' | 'connections' | 'none';
    showOnlineStatus: boolean;
  };
  communication: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    inAppNotifications: boolean;
    notificationFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  security: {
    twoFactorEnabled: boolean;
    loginNotifications: boolean;
    sessionTimeout: number;
    requirePasswordChange: boolean;
    lastPasswordChange: Date;
    passwordExpiryDays: number;
  };
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Account deletion form
  const [deleteForm, setDeleteForm] = useState({
    password: '',
    confirmDelete: ''
  });

  // Real-time state
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [livePreview, setLivePreview] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<Array<{
    id: string;
    action: string;
    timestamp: Date;
    status: 'success' | 'error' | 'pending';
    details?: string;
  }>>([]);

  useEffect(() => {
    loadSettings();
    
    // Real-time connection monitoring
    const checkConnection = () => {
      const quality = navigator.onLine ? 'excellent' : 'poor';
      setConnectionQuality(quality);
      setIsOnline(navigator.onLine);
    };

    // Monitor online/offline status
    window.addEventListener('online', () => {
      setIsOnline(true);
      setConnectionQuality('excellent');
      addActivityLog('Connection restored', 'success', 'Back online');
    });

    window.addEventListener('offline', () => {
      setIsOnline(false);
      setConnectionQuality('poor');
      addActivityLog('Connection lost', 'error', 'No internet connection');
    });

    // Socket connection monitoring
    const handleSocketConnect = () => {
      setIsOnline(true);
      setConnectionQuality('excellent');
      addActivityLog('Real-time connection established', 'success');
    };

    const handleSocketDisconnect = () => {
      setIsOnline(false);
      setConnectionQuality('poor');
      addActivityLog('Real-time connection lost', 'error');
    };

    // Connect socket events - using available methods
            if (socketService.getConnectionStatus()) {
      handleSocketConnect();
    } else {
      socketService.connect();
    }

    // Initial connection check
    checkConnection();

    // Periodic sync status update
    const syncInterval = setInterval(() => {
      setLastSync(new Date());
      if (isOnline && realTimeUpdates) {
        setSyncStatus('synced');
      }
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', () => {});
      window.removeEventListener('offline', () => {});
      clearInterval(syncInterval);
    };
  }, [realTimeUpdates]);

  // Helper functions for real-time functionality
  const addActivityLog = useCallback((action: string, status: 'success' | 'error' | 'pending', details?: string) => {
    const logEntry = {
      id: Date.now().toString(),
      action,
      timestamp: new Date(),
      status,
      details
    };
    setActivityLog(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 entries
  }, []);

  const addPendingChange = useCallback((change: string) => {
    setPendingChanges(prev => [...prev, change]);
  }, []);

  const removePendingChange = useCallback((change: string) => {
    setPendingChanges(prev => prev.filter(c => c !== change));
  }, []);

  const syncSettings = useCallback(async () => {
    if (!isOnline) {
      addActivityLog('Sync failed', 'error', 'No internet connection');
      return;
    }

    setSyncStatus('syncing');
    try {
      await loadSettings();
      setSyncStatus('synced');
      setLastSync(new Date());
      addActivityLog('Settings synced', 'success');
    } catch (error) {
      setSyncStatus('error');
      addActivityLog('Sync failed', 'error', 'Server error');
    }
  }, [isOnline, addActivityLog]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/settings');
      
      // Check if response has the expected structure
      if (response.data && response.data.success && response.data.settings) {
        setSettings(response.data.settings);
      } else if (response.data && response.data.settings) {
        // Fallback for direct settings response
        setSettings(response.data.settings);
      } else if (response.data) {
        // Fallback for direct data response
        setSettings(response.data);
      } else {
        // Create default settings if none exist
        const defaultSettings: UserSettings = {
          _id: '',
          userId: user?._id || '',
          notifications: {
            followRequests: true,
            followAccepted: true,
            followRejected: true,
            postLikes: true,
            postComments: true,
            postShares: true,
            postMentions: true,
            newMessages: true,
            messageReadReceipts: true,
            eventReminders: true,
            eventInvitations: true,
            jobApplications: true,
            jobUpdates: true,
            systemAnnouncements: true,
            securityAlerts: true,
          },
          privacy: {
            profileVisibility: 'public',
            showEmail: false,
            showPhone: false,
            showLocation: false,
            showCompany: false,
            showBatch: false,
            showDepartment: false,
            allowMessagesFrom: 'everyone',
            showOnlineStatus: true,
          },
          communication: {
            emailNotifications: true,
            pushNotifications: true,
            inAppNotifications: true,
            notificationFrequency: 'immediate',
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00',
            },
          },
          display: {
            theme: 'auto',
            language: 'en',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h',
          },
          security: {
            twoFactorEnabled: false,
            loginNotifications: true,
            sessionTimeout: 30,
            requirePasswordChange: false,
            lastPasswordChange: new Date(),
            passwordExpiryDays: 90,
          },
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      
      // Create default settings on error
      const defaultSettings: UserSettings = {
        _id: '',
        userId: user?._id || '',
        notifications: {
          followRequests: true,
          followAccepted: true,
          followRejected: true,
          postLikes: true,
          postComments: true,
          postShares: true,
          postMentions: true,
          newMessages: true,
          messageReadReceipts: true,
          eventReminders: true,
          eventInvitations: true,
          jobApplications: true,
          jobUpdates: true,
          systemAnnouncements: true,
          securityAlerts: true,
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          showLocation: false,
          showCompany: false,
          showBatch: false,
          showDepartment: false,
          allowMessagesFrom: 'everyone',
          showOnlineStatus: true,
        },
        communication: {
          emailNotifications: true,
          pushNotifications: true,
          inAppNotifications: true,
          notificationFrequency: 'immediate',
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
          },
        },
        display: {
          theme: 'auto',
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
        },
        security: {
          twoFactorEnabled: false,
          loginNotifications: true,
          sessionTimeout: 30,
          requirePasswordChange: false,
          lastPasswordChange: new Date(),
          passwordExpiryDays: 90,
        },
      };
      setSettings(defaultSettings);
      
      toast({
        title: "Warning",
        description: "Using default settings. Some features may be limited.",
        variant: "default"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (section: string, data: any) => {
    const changeId = `${section}-${Date.now()}`;
    addPendingChange(changeId);
    
    try {
      setSaving(true);
      setSyncStatus('syncing');
      
      const response = await api.put('/api/notifications/settings', {
        [section]: data
      });
      
      setSettings(response.data.settings);
      setSyncStatus('synced');
      setLastSync(new Date());
      removePendingChange(changeId);
      
      // Emit real-time update to other connected clients
      if (realTimeUpdates) {
        socketService.updateSettings(section, data);
      }
      
      addActivityLog(`${section} settings updated`, 'success');
      
      toast({
        title: "Success",
        description: "Settings updated successfully"
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      setSyncStatus('error');
      removePendingChange(changeId);
      addActivityLog(`${section} settings update failed`, 'error', 'Server error');
      
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper function to safely access settings
  const getSetting = (path: string, defaultValue: any = null) => {
    if (!settings) return defaultValue;
    
    const keys = path.split('.');
    let value = settings;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      await api.post('/api/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      toast({
        title: "Success",
        description: "Password changed successfully"
      });
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to change password",
        variant: "destructive"
      });
    }
  };

  const handleAccountDeletion = async () => {
    if (deleteForm.confirmDelete !== 'DELETE') {
      toast({
        title: "Error",
        description: "Please type DELETE to confirm account deletion",
        variant: "destructive"
      });
      return;
    }

    if (!deleteForm.password) {
      toast({
        title: "Error",
        description: "Please enter your password",
        variant: "destructive"
      });
      return;
    }

    try {
      await api.delete('/api/users/delete-account', {
        data: {
          password: deleteForm.password,
          confirmDelete: deleteForm.confirmDelete
        }
      });
      
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted"
      });
      
      logout();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete account",
        variant: "destructive"
      });
    }
  };

  const resetSettings = async () => {
    try {
      const response = await api.post('/api/notifications/settings/reset');
      setSettings(response.data.settings);
      toast({
        title: "Success",
        description: "Settings reset to defaults"
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast({
        title: "Error",
        description: "Failed to reset settings",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (!settings || !settings.privacy || !settings.notifications) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load settings</p>
        <Button onClick={loadSettings} className="mt-2">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Real-time Status Indicator */}
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
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Connection: {connectionQuality}
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
              
              <Button
                size="sm"
                variant="outline"
                onClick={syncSettings}
                disabled={syncStatus === 'syncing' || !isOnline}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and privacy</p>
        </div>
        <Button onClick={resetSettings} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={user?.name || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email?.college || user?.email?.personal || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="type">User Type</Label>
                  <Input id="type" value={user?.type || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={user?.department || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="batch">Batch Year</Label>
                  <Input id="batch" value={user?.joinYear || user?.batch || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={user?.company || user?.alumniInfo?.currentCompany || ''} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <EnhancedNotificationSettings />
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Privacy & Visibility</span>
              </CardTitle>
              <CardDescription>
                Control who can see your information and contact you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="profileVisibility">Profile Visibility</Label>
                <Select
                  value={settings.privacy.profileVisibility}
                  onValueChange={(value) => 
                    updateSettings('privacy', { ...settings.privacy, profileVisibility: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Everyone can see</SelectItem>
                    <SelectItem value="connections">Connections Only</SelectItem>
                    <SelectItem value="private">Private - Hidden from search</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="allowMessagesFrom">Who can message you</Label>
                <Select
                  value={settings.privacy.allowMessagesFrom}
                  onValueChange={(value) => 
                    updateSettings('privacy', { ...settings.privacy, allowMessagesFrom: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="connections">Connections Only</SelectItem>
                    <SelectItem value="none">No one</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

                  <div>
                <h4 className="font-medium mb-3">Information Visibility</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showEmail">Show Email Address</Label>
                    <Switch
                      id="showEmail"
                      checked={settings.privacy.showEmail}
                      onCheckedChange={(checked) => 
                        updateSettings('privacy', { ...settings.privacy, showEmail: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showPhone">Show Phone Number</Label>
                    <Switch
                      id="showPhone"
                      checked={settings.privacy.showPhone}
                      onCheckedChange={(checked) => 
                        updateSettings('privacy', { ...settings.privacy, showPhone: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showLocation">Show Location</Label>
                    <Switch
                      id="showLocation"
                      checked={settings.privacy.showLocation}
                      onCheckedChange={(checked) => 
                        updateSettings('privacy', { ...settings.privacy, showLocation: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showCompany">Show Company</Label>
                    <Switch
                      id="showCompany"
                      checked={settings.privacy.showCompany}
                      onCheckedChange={(checked) => 
                        updateSettings('privacy', { ...settings.privacy, showCompany: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showBatch">Show Batch Year</Label>
                    <Switch
                      id="showBatch"
                      checked={settings.privacy.showBatch}
                      onCheckedChange={(checked) => 
                        updateSettings('privacy', { ...settings.privacy, showBatch: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showDepartment">Show Department</Label>
                  <Switch
                      id="showDepartment"
                      checked={settings.privacy.showDepartment}
                      onCheckedChange={(checked) => 
                        updateSettings('privacy', { ...settings.privacy, showDepartment: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & Authentication</span>
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Change */}
              <div>
                <h4 className="font-medium mb-3">Change Password</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button onClick={handlePasswordChange} className="w-full">
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Account Deletion */}
              <div>
                <h4 className="font-medium mb-3 text-red-600">Delete Account</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="deletePassword">Enter Password</Label>
                    <Input
                      id="deletePassword"
                      type="password"
                      value={deleteForm.password}
                      onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })}
                      placeholder="Enter your password to confirm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmDelete">Type DELETE to confirm</Label>
                    <Input
                      id="confirmDelete"
                      value={deleteForm.confirmDelete}
                      onChange={(e) => setDeleteForm({ ...deleteForm, confirmDelete: e.target.value })}
                      placeholder="Type DELETE to confirm deletion"
                    />
                  </div>
                  <Button 
                    onClick={handleAccountDeletion} 
                    variant="destructive" 
                    className="w-full"
                    disabled={deleteForm.confirmDelete !== 'DELETE' || !deleteForm.password}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Permanently Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Settings */}
        <TabsContent value="display" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Display & Appearance</span>
              </CardTitle>
              <CardDescription>
                Customize your interface appearance and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={settings.display.theme}
                  onValueChange={(value) => 
                    updateSettings('display', { ...settings.display, theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.display.timezone}
                  onValueChange={(value) => 
                    updateSettings('display', { ...settings.display, timezone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={settings.display.dateFormat}
                  onValueChange={(value) => 
                    updateSettings('display', { ...settings.display, dateFormat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select
                  value={settings.display.timeFormat}
                  onValueChange={(value) => 
                    updateSettings('display', { ...settings.display, timeFormat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Real-time Activity Log</span>
              </CardTitle>
              <CardDescription>
                Monitor your settings changes and system activity in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Real-time Controls */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={realTimeUpdates}
                        onCheckedChange={setRealTimeUpdates}
                      />
                      <Label>Real-time Updates</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={autoSave}
                        onCheckedChange={setAutoSave}
                      />
                      <Label>Auto Save</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={livePreview}
                        onCheckedChange={setLivePreview}
                      />
                      <Label>Live Preview</Label>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActivityLog([])}
                  >
                    Clear Log
                  </Button>
                </div>

                {/* Activity Log */}
                <ScrollArea className="h-96">
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
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            {log.status === 'success' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {log.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            {log.status === 'pending' && (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            
                            <div>
                              <p className="text-sm font-medium">{log.action}</p>
                              {log.details && (
                                <p className="text-xs text-muted-foreground">{log.details}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
