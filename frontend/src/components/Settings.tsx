import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (section: string, data: any) => {
    try {
      setSaving(true);
      const response = await api.put('/api/notifications/settings', {
        [section]: data
      });
      setSettings(response.data.settings);
      toast({
        title: "Success",
        description: "Settings updated successfully"
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
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

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load settings</p>
        <Button onClick={loadSettings} className="mt-2">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
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
                  <Input id="company" value={user?.currentCompany || ''} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Notifications */}
              <div>
                <h4 className="font-medium mb-3">Connection Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="followRequests">Follow Requests</Label>
                    <Switch
                      id="followRequests"
                      checked={settings.notifications.followRequests}
                      onCheckedChange={(checked) => 
                        updateSettings('notifications', { ...settings.notifications, followRequests: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="followAccepted">Follow Accepted</Label>
                    <Switch
                      id="followAccepted"
                      checked={settings.notifications.followAccepted}
                      onCheckedChange={(checked) => 
                        updateSettings('notifications', { ...settings.notifications, followAccepted: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="followRejected">Follow Rejected</Label>
                    <Switch
                      id="followRejected"
                      checked={settings.notifications.followRejected}
                      onCheckedChange={(checked) => 
                        updateSettings('notifications', { ...settings.notifications, followRejected: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Engagement Notifications */}
              <div>
                <h4 className="font-medium mb-3">Engagement Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="postLikes">Post Likes</Label>
                    <Switch
                      id="postLikes"
                      checked={settings.notifications.postLikes}
                      onCheckedChange={(checked) => 
                        updateSettings('notifications', { ...settings.notifications, postLikes: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="postComments">Post Comments</Label>
                    <Switch
                      id="postComments"
                      checked={settings.notifications.postComments}
                      onCheckedChange={(checked) => 
                        updateSettings('notifications', { ...settings.notifications, postComments: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="postShares">Post Shares</Label>
                    <Switch
                      id="postShares"
                      checked={settings.notifications.postShares}
                      onCheckedChange={(checked) => 
                        updateSettings('notifications', { ...settings.notifications, postShares: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Communication Settings */}
              <div>
                <h4 className="font-medium mb-3">Communication Preferences</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <Switch
                      id="emailNotifications"
                      checked={settings.communication.emailNotifications}
                      onCheckedChange={(checked) => 
                        updateSettings('communication', { ...settings.communication, emailNotifications: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushNotifications">Push Notifications</Label>
                    <Switch
                      id="pushNotifications"
                      checked={settings.communication.pushNotifications}
                      onCheckedChange={(checked) => 
                        updateSettings('communication', { ...settings.communication, pushNotifications: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="inAppNotifications">In-App Notifications</Label>
                    <Switch
                      id="inAppNotifications"
                      checked={settings.communication.inAppNotifications}
                      onCheckedChange={(checked) => 
                        updateSettings('communication', { ...settings.communication, inAppNotifications: checked })
                      }
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notificationFrequency">Notification Frequency</Label>
                    <Select
                      value={settings.communication.notificationFrequency}
                      onValueChange={(value) => 
                        updateSettings('communication', { ...settings.communication, notificationFrequency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Quiet Hours */}
              <div>
                <h4 className="font-medium mb-3">Quiet Hours</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="quietHours">Enable Quiet Hours</Label>
                  <Switch
                      id="quietHours"
                      checked={settings.communication.quietHours.enabled}
                      onCheckedChange={(checked) => 
                        updateSettings('communication', { 
                          ...settings.communication, 
                          quietHours: { ...settings.communication.quietHours, enabled: checked }
                        })
                      }
                    />
                  </div>
                  
                  {settings.communication.quietHours.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={settings.communication.quietHours.startTime}
                          onChange={(e) => 
                            updateSettings('communication', { 
                              ...settings.communication, 
                              quietHours: { ...settings.communication.quietHours, startTime: e.target.value }
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={settings.communication.quietHours.endTime}
                          onChange={(e) => 
                            updateSettings('communication', { 
                              ...settings.communication, 
                              quietHours: { ...settings.communication.quietHours, endTime: e.target.value }
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
  );
}