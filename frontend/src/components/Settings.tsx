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
  Settings as SettingsIcon,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    navigate(-1);
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      navigate('/signin');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
              </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your account preferences</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Settings Menu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Profile Settings
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Privacy & Security
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Palette className="h-4 w-4 mr-2" />
                    Appearance
        </Button>
                </div>
              </CardContent>
            </Card>
      </div>

          {/* Main Settings Content */}
          <div className="lg:col-span-2">
      <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                      Update your profile information and preferences
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
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={user?.department || ''} disabled />
                </div>
                <div>
                      <Label htmlFor="batch">Batch</Label>
                      <Input id="batch" value={user?.batch || ''} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                      Configure how you receive notifications
              </CardDescription>
            </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
              <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive notifications via email
                        </p>
              </div>
                      <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive push notifications
                        </p>
                  </div>
                      <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                      <div>
                        <Label>Message Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Notify when you receive messages
                        </p>
                  </div>
                      <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

              <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                      Control your privacy and visibility
              </CardDescription>
            </CardHeader>
                  <CardContent className="space-y-4">
              <div>
                      <Label htmlFor="profile-visibility">Profile Visibility</Label>
                      <Select>
                  <SelectTrigger>
                          <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="connections">Connections Only</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                    <div className="flex items-center justify-between">
              <div>
                        <Label>Show Online Status</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Let others see when you're online
                        </p>
              </div>
                      <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

              <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                      Manage your account security
              </CardDescription>
            </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Add an extra layer of security
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Login Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Get notified of new login attempts
                        </p>
                    </div>
                      <Switch />
                    </div>
                    <Separator />
                  <Button
                      variant="destructive" 
                      onClick={handleLogout}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Logging out...
                        </>
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </>
                      )}
                    </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
