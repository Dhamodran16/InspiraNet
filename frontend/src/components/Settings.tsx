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
  X,
  Plus,
  Mail,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/services/socketService';
import api from '@/services/api';
import EnhancedNotificationSettings from '@/components/notifications/EnhancedNotificationSettings';

type ActivityStatus = 'success' | 'error' | 'pending';

interface ActivityLogEntry {
  id: string;
  action: string;
  timestamp: Date;
  status: ActivityStatus;
  details?: string;
}

const ACTIVITY_LOG_LIMIT = 100;

const mapServerActivityLog = (log: any): ActivityLogEntry => ({
  id: log?._id?.toString?.() || log?.id || `log-${Date.now()}`,
  action: log?.action || 'Activity',
  status: (log?.status as ActivityStatus) || 'success',
  details: log?.details || '',
  timestamp: log?.timestamp ? new Date(log.timestamp) : new Date()
});

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
    profileVisibility: 'public' | 'connections';
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    showCompany: boolean;
    showBatch: boolean;
    showDepartment: boolean;
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
  const { user, logout, updateUser } = useAuth();
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

  // Profile edit form
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    bio: '',
    location: '',
    city: '',
    state: '',
    country: '',
    department: '',
    batch: '',
    company: '',
    jobTitle: '',
    designation: '',
    collegeEmail: '',
    personalEmail: '',
    skills: [] as string[],
    interests: [] as string[],
    resume: '',
    portfolio: '',
    linkedin: '',
    github: '',
    leetcode: '',
    customLinks: [] as { label: string; url: string }[]
  });
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [customLinkName, setCustomLinkName] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const effectiveCustomLinks =
    (isEditingProfile ? profileForm.customLinks : user?.socialLinks?.customLinks) || [];

  const handleAddCustomLink = () => {
    if (!isEditingProfile) return;
    if (!customLinkName.trim() || !customLinkUrl.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a label and URL for the custom link.",
        variant: "destructive"
      });
      return;
    }
    try {
      new URL(customLinkUrl.trim());
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL that starts with http or https.",
        variant: "destructive"
      });
      return;
    }
    setProfileForm(prev => ({
      ...prev,
      customLinks: [
        ...(prev.customLinks || []),
        { label: customLinkName.trim(), url: customLinkUrl.trim() }
      ]
    }));
    setCustomLinkName('');
    setCustomLinkUrl('');
  };

  const handleRemoveCustomLink = (index: number) => {
    if (!isEditingProfile) return;
    setProfileForm(prev => ({
      ...prev,
      customLinks: (prev.customLinks || []).filter((_, i) => i !== index)
    }));
  };
  
  // Email expiration status
  const [emailExpirationStatus, setEmailExpirationStatus] = useState<any>(null);
  const [loadingEmailStatus, setLoadingEmailStatus] = useState(false);

  // Real-time state
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [livePreview, setLivePreview] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  // Helper functions for real-time functionality
  const addActivityLog = useCallback(
    async (
      action: string,
      status: ActivityStatus,
      details?: string,
      options?: { persist?: boolean }
    ) => {
      const shouldPersist = options?.persist !== false;
      const tempId = `log-${Date.now()}-${Math.random()}`;
      const timestamp = new Date();
      const logEntry: ActivityLogEntry = {
        id: tempId,
        action,
        status,
        details,
        timestamp
      };

      setActivityLog(prev => [logEntry, ...prev].slice(0, ACTIVITY_LOG_LIMIT));

      if (shouldPersist) {
        try {
          const response = await api.post('/api/notifications/activity', {
            action,
            status,
            details,
            clientId: tempId
          });

          if (response.data?.log) {
            const persisted = mapServerActivityLog(response.data.log);
            setActivityLog(prev => {
              const idx = prev.findIndex(entry => entry.id === (response.data?.clientId || tempId));
              if (idx === -1) {
                return [persisted, ...prev].slice(0, ACTIVITY_LOG_LIMIT);
    }
              const updated = [...prev];
              updated[idx] = persisted;
              return updated;
            });
          }
        } catch (error) {
          console.error('Error persisting activity log:', error);
        }
      }
    },
    []
  );

  const clearActivityLog = useCallback(async () => {
    try {
      await api.delete('/api/notifications/activity');
      setActivityLog([]);
      toast({
        title: "Activity log cleared",
        description: "All activity entries have been removed."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to clear activity log",
        variant: "destructive"
      });
    }
  }, [toast]);

  const addPendingChange = useCallback((change: string) => {
    setPendingChanges(prev => [...prev, change]);
  }, []);

  const removePendingChange = useCallback((change: string) => {
    setPendingChanges(prev => prev.filter(c => c !== change));
  }, []);

  // Listen for real-time settings updates
  const handleSettingsUpdate = useCallback((data: { settings: UserSettings }) => {
    if (data.settings) {
      setSettings(data.settings);
      setSyncStatus('synced');
      setLastSync(new Date());
    }
  }, []);

  // Function to refresh user data from backend - memoized to prevent infinite loops
  const refreshUserData = useCallback(async () => {
    try {
      const response = await api.get('/api/users/profile');
      if (response.data && response.data.user) {
        // Update user in AuthContext
        if (updateUser) {
          updateUser(response.data.user);
        }
        return response.data.user;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // Don't throw - just log the error
    }
    return null;
  }, [updateUser]);

  // Memoize loadSettings to prevent infinite loops
  const loadSettingsMemoized = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/settings');
      
      // Handle different response structures from backend
      let userSettings: UserSettings | null = null;
      
      if (response.data) {
        // Check for { success: true, settings: {...} } structure
        if (response.data.success && response.data.settings) {
          userSettings = response.data.settings;
        }
        // Check for { settings: {...} } structure
        else if (response.data.settings) {
          userSettings = response.data.settings;
        }
        // Check if response.data itself is the settings object
        else if (response.data._id || response.data.userId || response.data.notifications) {
          userSettings = response.data;
        }
      }
      
      if (userSettings && userSettings._id) {
        // Valid settings loaded from backend
        setSettings(userSettings);
        addActivityLog('Settings loaded successfully', 'success', undefined, { persist: false });
      } else {
        // Settings don't exist yet - backend should create them, but if not, use defaults silently
        // Don't show warning as backend creates default settings automatically
        console.log('Settings not found, backend will create defaults on first save');
        
        // Set minimal default structure to prevent UI errors
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
            showLocation: true,
            showCompany: true,
            showBatch: true,
            showDepartment: true,
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
    } catch (error: any) {
      console.error('Error loading settings:', error);
      
      // Only show warning for actual errors, not for missing settings
      // Backend creates default settings automatically, so this is likely a network/auth error
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      
      // Check if it's a network error (connection refused, etc.)
      const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || 
                             error.message?.includes('Network Error') || 
                             error.message?.includes('ERR_CONNECTION_REFUSED');
      
      // Check if it's a 404 (settings don't exist) vs other errors
      if (error.response?.status === 404 || error.response?.status === 401) {
        // Settings don't exist or unauthorized - backend will create on first save
        // Use defaults silently without warning
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
            showLocation: true,
            showCompany: true,
            showBatch: true,
            showDepartment: true,
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
      } else if (isNetworkError) {
        // Network error - server might be down, use defaults and show a warning
        console.warn('Network error - server may be down. Using default settings.');
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
            showLocation: true,
            showCompany: true,
            showBatch: true,
            showDepartment: true,
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
          title: "Connection Error",
          description: "Cannot connect to server. Please ensure the backend server is running. Settings shown are defaults.",
          variant: "destructive"
        });
      } else {
        // Real error (network, server error, etc.) - show error but don't use "default settings" warning
        addActivityLog('Failed to load settings', 'error', errorMessage);
        toast({
          title: "Error Loading Settings",
          description: errorMessage,
          variant: "destructive"
        });
        // Still set default settings so the UI doesn't break
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
            showLocation: true,
            showCompany: true,
            showBatch: true,
            showDepartment: true,
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
    } finally {
      setLoading(false);
    }
  }, [user?._id, addActivityLog]);

  useEffect(() => {
    // Only run once on mount - don't include dependencies that change frequently
    let mounted = true;
    
    const initializeSettings = async () => {
      // Load settings only once
      if (mounted) {
        await loadSettingsMemoized();
      }
      
      // Refresh user data only once on mount
      if (mounted) {
        await refreshUserData();
      }
      
      // Initialize profile form with user data
      if (mounted && user) {
        setProfileForm({
          name: user.name || '',
          phone: user.phone || '',
          bio: user.bio || '',
          location: user.location || '',
          city: user.city || '',
          state: user.state || '',
          country: user.country || '',
          department: user.department || user.studentInfo?.department || user.facultyInfo?.department || '',
          batch: user.batch || user.studentInfo?.batch || '',
          company: user.company || user.alumniInfo?.currentCompany || '',
          jobTitle: user.alumniInfo?.jobTitle || '',
          designation: user.designation || user.facultyInfo?.designation || '',
          collegeEmail: user.email?.college || '',
          personalEmail: user.email?.personal || '',
          skills: user.skills || [],
          interests: user.interests || [],
          resume: user.resume || '',
          portfolio: user.portfolio || '',
          linkedin: user.socialLinks?.linkedin || '',
          github: user.socialLinks?.github || '',
          leetcode: user.socialLinks?.leetcode || '',
          customLinks: user.socialLinks?.customLinks ? [...user.socialLinks.customLinks] : []
        });
      }
    };
    
    initializeSettings();
    
    // Load email expiration status
    const loadEmailExpirationStatus = async () => {
      try {
        setLoadingEmailStatus(true);
        const response = await api.get('/api/email-migration/status');
        if (response.data) {
          setEmailExpirationStatus(response.data);
        }
      } catch (error: any) {
        // Only log if it's not a 404 (route might not exist for some users)
        if (error.response?.status !== 404) {
          console.error('Error loading email expiration status:', error);
        }
        // Set default status if route doesn't exist
        setEmailExpirationStatus({
          hasKonguEmail: false,
          expired: false,
          migrationNeeded: false
        });
      } finally {
        setLoadingEmailStatus(false);
      }
    };
    
    if (mounted) {
      loadEmailExpirationStatus();
    }
    
    // Real-time connection monitoring
    const checkConnection = () => {
      const quality = navigator.onLine ? 'excellent' : 'poor';
      setConnectionQuality(quality);
      setIsOnline(navigator.onLine);
    };

    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality('excellent');
      addActivityLog('Connection restored', 'success', 'Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('poor');
      addActivityLog('Connection lost', 'error', 'No internet connection');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

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

    // Subscribe to settings updates
    socketService.on('settings_updated', handleSettingsUpdate);

    const handleSecurityEvent = (event: any) => {
      if (!event?.type) return;
      if (event.type === 'password_changed') {
        setSettings(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            security: {
              ...prev.security,
              lastPasswordChange: event.timestamp ? new Date(event.timestamp) : new Date()
            }
          };
        });
        toast({
          title: "Password Updated",
          description: "Security settings refreshed in real-time."
        });
      } else if (event.type === 'security_settings_updated' && event.changes) {
        setSettings(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            security: {
              ...prev.security,
              ...event.changes
            }
          };
        });
        const changeSummaries = Object.keys(event.changes).map(key => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `${label}: ${event.changes[key]}`;
        });
        toast({
          title: "Security Settings Updated",
          description: changeSummaries.length ? changeSummaries.join(', ') : 'Security preferences refreshed.'
        });
      }
    };

    socketService.on('security_event', handleSecurityEvent);

    // Initial connection check
    checkConnection();

    // Periodic sync status update (don't trigger API calls)
    const syncInterval = setInterval(() => {
      if (mounted) {
        setLastSync(new Date());
        if (isOnline && realTimeUpdates) {
          setSyncStatus('synced');
        }
      }
    }, 30000); // Every 30 seconds

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
      // Clean up socket listener
      socketService.off('settings_updated', handleSettingsUpdate);
      socketService.off('security_event', handleSecurityEvent);
    };
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    const fetchActivityLog = async () => {
      if (!user?._id) return;
      try {
        const response = await api.get('/api/notifications/activity');
        if (response.data?.logs) {
          const logs: ActivityLogEntry[] = response.data.logs.map(mapServerActivityLog);
          setActivityLog(logs.slice(0, ACTIVITY_LOG_LIMIT));
        }
      } catch (error) {
        console.error('Error loading activity log:', error);
      }
    };

    fetchActivityLog();
  }, [user?._id]);

  useEffect(() => {
    const handleActivityLogCreated = (payload: { log: any; clientId?: string }) => {
      if (!payload?.log) return;
      const entry = mapServerActivityLog(payload.log);
      setActivityLog(prev => {
        const existingByServerId = prev.findIndex(log => log.id === entry.id);
        if (existingByServerId !== -1) {
          const updated = [...prev];
          updated[existingByServerId] = entry;
          return updated;
        }
        if (payload?.clientId) {
          const pendingIndex = prev.findIndex(log => log.id === payload.clientId);
          if (pendingIndex !== -1) {
            const updated = [...prev];
            updated[pendingIndex] = entry;
            return updated;
          }
        }
        return [entry, ...prev].slice(0, ACTIVITY_LOG_LIMIT);
      });
    };

    const handleActivityLogCleared = () => {
      setActivityLog([]);
    };

    socketService.onActivityLog(handleActivityLogCreated);
    socketService.onActivityLogCleared(handleActivityLogCleared);

    return () => {
      socketService.offActivityLog();
      socketService.offActivityLogCleared();
    };
  }, []);

  const syncSettings = useCallback(async () => {
    if (!isOnline) {
      addActivityLog('Sync failed', 'error', 'No internet connection');
      toast({
        title: "Sync Failed",
        description: "No internet connection",
        variant: "destructive"
      });
      return;
    }

    setSyncStatus('syncing');
    try {
      await loadSettingsMemoized();
      setSyncStatus('synced');
      setLastSync(new Date());
      addActivityLog('Settings synced', 'success');
      toast({
        title: "Success",
        description: "Settings synced successfully"
      });
    } catch (error: any) {
      setSyncStatus('error');
      const errorMessage = error.response?.data?.error || error.message || 'Server error';
      addActivityLog('Sync failed', 'error', errorMessage);
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [isOnline, addActivityLog, loadSettingsMemoized]);


  const updateSettings = async (section: string, data: any) => {
    const changeId = `${section}-${Date.now()}`;
    addPendingChange(changeId);
    
    try {
      setSaving(true);
      setSyncStatus('syncing');
      
      // Create a more descriptive activity log message based on the section and specific field changed
      let activityMessage = `${section} settings updated`;
      if (section === 'privacy') {
        // Detect which privacy field changed
        const changedFields = Object.keys(data).filter(key => 
          settings?.privacy && settings.privacy[key as keyof typeof settings.privacy] !== data[key]
        );
        if (changedFields.length > 0) {
          const field = changedFields[0];
          // Format field name for display
          const fieldNameMap: { [key: string]: string } = {
            'profileVisibility': 'Profile Visibility',
            'showEmail': 'Show Email Address',
            'showPhone': 'Show Phone Number',
            'showLocation': 'Show Location',
            'showCompany': 'Show Company',
            'showBatch': 'Show Batch Year',
            'showDepartment': 'Show Department',
            'showOnlineStatus': 'Show Online Status'
          };
          const fieldName = fieldNameMap[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const value = data[field];
          if (typeof value === 'boolean') {
            activityMessage = `Privacy: ${fieldName} ${value ? 'enabled' : 'disabled'}`;
          } else {
            activityMessage = `Privacy: ${fieldName} changed to ${value}`;
          }
        }
      }
      
      const response = await api.put('/api/notifications/settings', {
        [section]: data
      });
      
      // Validate response structure
      if (response.data && response.data.success && response.data.settings) {
        // Update settings immediately (optimistic update)
        setSettings((prevSettings) => {
          if (!prevSettings) return response.data.settings;
          const updatedSettings = { ...prevSettings };
          if (section === 'privacy') {
            updatedSettings.privacy = { ...prevSettings.privacy, ...data };
          } else if (section === 'notifications') {
            updatedSettings.notifications = { ...prevSettings.notifications, ...data };
            // Log specific notification changes
            const notificationChanges: string[] = [];
            Object.keys(data).forEach(key => {
              if (prevSettings.notifications && prevSettings.notifications[key as keyof typeof prevSettings.notifications] !== data[key]) {
                const fieldName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                notificationChanges.push(`${fieldName}: ${data[key] ? 'enabled' : 'disabled'}`);
              }
            });
            if (notificationChanges.length > 0) {
              activityMessage = `Notifications updated: ${notificationChanges.join(', ')}`;
            }
          } else if (section === 'communication') {
            updatedSettings.communication = { ...prevSettings.communication, ...data };
          } else if (section === 'security') {
            const securityFieldMap: Record<string, string> = {
              loginNotifications: 'Login Notifications',
              requirePasswordChange: 'Require Password Change',
              sessionTimeout: 'Session Timeout',
              passwordExpiryDays: 'Password Expiry Days',
              twoFactorEnabled: 'Two-factor Authentication'
            };
            const securityChangeLog: string[] = [];
            Object.keys(data).forEach(key => {
              if (prevSettings.security && (prevSettings.security as any)[key] !== data[key]) {
                const label = securityFieldMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const newValue = data[key];
                securityChangeLog.push(
                  `${label}: ${typeof newValue === 'boolean' ? (newValue ? 'enabled' : 'disabled') : newValue}`
                );
              }
            });
            if (securityChangeLog.length > 0) {
              activityMessage = `Security updated: ${securityChangeLog.join(', ')}`;
            }
            updatedSettings.security = { ...prevSettings.security, ...data };
          }
          return updatedSettings;
        });
      setSyncStatus('synced');
      setLastSync(new Date());
      removePendingChange(changeId);
      
        // Note: Backend already emits 'settings_updated' event, which will sync all clients
        // The handleSettingsUpdate callback will handle the real-time update for other tabs/devices
      
        addActivityLog(activityMessage, 'success');
      
      toast({
        title: "Success",
          description: response.data.message || "Settings updated successfully"
      });
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      setSyncStatus('error');
      removePendingChange(changeId);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.details || 
                          error.message || 
                          'Failed to update settings';
      
      addActivityLog(`${section} settings update failed`, 'error', errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
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
      const response = await api.post('/api/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      if (response.data?.settings) {
        setSettings(response.data.settings);
      } else {
        // Reload settings to update lastPasswordChange
        await loadSettingsMemoized();
      }
      
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
      setSaving(true);
      setSyncStatus('syncing');
      
      const response = await api.post('/api/notifications/settings/reset');
      
      if (response.data && response.data.success && response.data.settings) {
      setSettings(response.data.settings);
        setSyncStatus('synced');
        setLastSync(new Date());
        addActivityLog('Settings reset to defaults', 'success');
        
        toast({
          title: "Success",
          description: response.data.message || "Settings reset to defaults"
        });
      } else if (response.data && response.data.settings) {
        // Fallback for response without success flag
        setSettings(response.data.settings);
        setSyncStatus('synced');
        setLastSync(new Date());
        addActivityLog('Settings reset to defaults', 'success');
        
      toast({
        title: "Success",
        description: "Settings reset to defaults"
      });
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('Error resetting settings:', error);
      setSyncStatus('error');
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.details || 
                          error.message || 
                          'Failed to reset settings';
      
      addActivityLog('Settings reset failed', 'error', errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
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
        <Button onClick={loadSettingsMemoized} className="mt-2">Retry</Button>
      </div>
    );
  }

  return (
    <div className="settings-theme container mx-auto py-6 space-y-6">
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
                </div>
                {!isEditingProfile ? (
                  <Button onClick={() => setIsEditingProfile(true)} variant="outline">
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button 
                      onClick={async () => {
                        try {
                          setSaving(true);
                          // Prepare data based on user type
                          const cleanedCustomLinks = (profileForm.customLinks || [])
                            .filter(link => link?.label?.trim() && link?.url?.trim())
                            .map(link => ({
                              label: link.label.trim(),
                              url: link.url.trim()
                            }));

                          const updateData: any = {
                            name: profileForm.name,
                            email: {
                              college: profileForm.collegeEmail || user?.email?.college || '',
                              personal: profileForm.personalEmail || user?.email?.personal || ''
                            },
                            phone: profileForm.phone,
                            bio: profileForm.bio,
                            location: profileForm.location,
                            city: profileForm.city,
                            state: profileForm.state,
                            country: profileForm.country,
                            department: profileForm.department,
                            skills: profileForm.skills,
                            interests: profileForm.interests,
                            resume: profileForm.resume,
                            portfolio: profileForm.portfolio,
                            socialLinks: {
                              ...(user?.socialLinks || {}),
                              linkedin: profileForm.linkedin,
                              github: profileForm.github,
                              leetcode: profileForm.leetcode,
                              customLinks: cleanedCustomLinks
                            }
                          };

                          // Handle type-specific fields
                          if (user?.type === 'student') {
                            updateData.studentInfo = {
                              department: profileForm.department,
                              batch: profileForm.batch
                            };
                            // Also set at root level for easy access
                            updateData.department = profileForm.department;
                            updateData.batch = profileForm.batch;
                          } else if (user?.type === 'alumni') {
                            updateData.alumniInfo = {
                              currentCompany: profileForm.company,
                              jobTitle: profileForm.jobTitle
                            };
                            // Also set at root level for easy access
                            updateData.company = profileForm.company;
                          } else if (user?.type === 'faculty') {
                            updateData.facultyInfo = {
                              department: profileForm.department,
                              designation: profileForm.designation
                            };
                            // Also set at root level for easy access
                            updateData.department = profileForm.department;
                          }

                          const response = await api.put('/api/users/profile', updateData);
                          toast({
                            title: "Success",
                            description: "Profile updated successfully"
                          });
                          
                          // Update user in AuthContext with response data
                          if (response.data && response.data.user && updateUser) {
                            updateUser(response.data.user);
                          } else {
                            // Fallback: refresh user data
                            await refreshUserData();
                          }
                          
                          setIsEditingProfile(false);
                          
                          // Update profile form with new data
                          if (response.data && response.data.user) {
                            const updatedUser = response.data.user;
                            setProfileForm({
                              name: updatedUser.name || '',
                              phone: updatedUser.phone || '',
                              bio: updatedUser.bio || '',
                              location: updatedUser.location || '',
                              city: updatedUser.city || '',
                              state: updatedUser.state || '',
                              country: updatedUser.country || '',
                              department: updatedUser.department || updatedUser.studentInfo?.department || updatedUser.facultyInfo?.department || '',
                              batch: updatedUser.batch || updatedUser.studentInfo?.batch || '',
                              company: updatedUser.company || updatedUser.alumniInfo?.currentCompany || '',
                              jobTitle: updatedUser.alumniInfo?.jobTitle || '',
                              designation: updatedUser.designation || updatedUser.facultyInfo?.designation || '',
                              collegeEmail: updatedUser.email?.college || '',
                              personalEmail: updatedUser.email?.personal || '',
                              skills: updatedUser.skills || [],
                              interests: updatedUser.interests || [],
                              resume: updatedUser.resume || '',
                              portfolio: updatedUser.portfolio || '',
                              linkedin: updatedUser.socialLinks?.linkedin || '',
                              github: updatedUser.socialLinks?.github || '',
                              leetcode: updatedUser.socialLinks?.leetcode || '',
                              customLinks: updatedUser.socialLinks?.customLinks ? [...updatedUser.socialLinks.customLinks] : []
                            });
                            setCustomLinkName('');
                            setCustomLinkUrl('');
                          }
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.response?.data?.error || "Failed to update profile",
                            variant: "destructive"
                          });
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsEditingProfile(false);
                        // Reset form to original values
                        if (user) {
                          setProfileForm({
                            name: user.name || '',
                            phone: user.phone || '',
                            bio: user.bio || '',
                            location: user.location || '',
                            city: user.city || '',
                            state: user.state || '',
                            country: user.country || '',
                            department: user.department || user.studentInfo?.department || user.facultyInfo?.department || '',
                            batch: user.batch || user.studentInfo?.batch || '',
                            company: user.company || user.alumniInfo?.currentCompany || '',
                            jobTitle: user.alumniInfo?.jobTitle || '',
                            designation: user.designation || user.facultyInfo?.designation || '',
                            collegeEmail: user.email?.college || '',
                            personalEmail: user.email?.personal || '',
                            skills: user.skills || [],
                            interests: user.interests || [],
                            resume: user.resume || '',
                            portfolio: user.portfolio || '',
                            linkedin: user.socialLinks?.linkedin || '',
                            github: user.socialLinks?.github || '',
                            leetcode: user.socialLinks?.leetcode || '',
                            customLinks: user.socialLinks?.customLinks ? [...user.socialLinks.customLinks] : []
                          });
                          setSkillInput('');
                          setInterestInput('');
                          setCustomLinkName('');
                          setCustomLinkUrl('');
                        }
                      }}
                      variant="outline"
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={isEditingProfile ? profileForm.name : (user?.name || '')} 
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={user?.email?.college || user?.email?.personal || ''} 
                    disabled 
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <Label htmlFor="type">User Type</Label>
                  <Input id="type" value={user?.type || ''} disabled />
                  <p className="text-xs text-muted-foreground mt-1">User type cannot be changed</p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    value={isEditingProfile ? profileForm.phone : (user?.phone || '')} 
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department" 
                    value={isEditingProfile ? profileForm.department : (user?.department || user?.studentInfo?.department || user?.facultyInfo?.department || '')} 
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  />
                </div>
                {user?.type === 'student' && (
                <div>
                    <Label htmlFor="batch">Batch</Label>
                    <Input 
                      id="batch" 
                      value={isEditingProfile ? profileForm.batch : (user?.batch || user?.studentInfo?.batch || '')} 
                      disabled={!isEditingProfile}
                      onChange={(e) => setProfileForm({ ...profileForm, batch: e.target.value })}
                    />
                </div>
                )}
                {(user?.type === 'alumni' || user?.type === 'faculty') && (
                  <>
                    {user?.type === 'alumni' && (
                      <>
                <div>
                  <Label htmlFor="company">Company</Label>
                          <Input 
                            id="company" 
                            value={isEditingProfile ? profileForm.company : (user?.company || user?.alumniInfo?.currentCompany || '')} 
                            disabled={!isEditingProfile}
                            onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="jobTitle">Job Title</Label>
                          <Input 
                            id="jobTitle" 
                            value={isEditingProfile ? profileForm.jobTitle : (user?.alumniInfo?.jobTitle || '')} 
                            disabled={!isEditingProfile}
                            onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    {user?.type === 'faculty' && (
                      <div>
                        <Label htmlFor="designation">Designation</Label>
                        <Input 
                          id="designation" 
                          value={isEditingProfile ? profileForm.designation : (user?.designation || user?.facultyInfo?.designation || '')} 
                          disabled={!isEditingProfile}
                          onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={isEditingProfile ? profileForm.bio : (user?.bio || '')} 
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    value={isEditingProfile ? profileForm.location : (user?.location || '')} 
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    value={isEditingProfile ? profileForm.city : (user?.city || '')} 
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input 
                    id="state" 
                    value={isEditingProfile ? profileForm.state : (user?.state || '')} 
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input 
                    id="country" 
                    value={isEditingProfile ? profileForm.country : (user?.country || '')} 
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* Email Expiration Warning */}
              {emailExpirationStatus && emailExpirationStatus.hasKonguEmail && (
                <div className={`p-4 rounded-lg border ${
                  emailExpirationStatus.expired 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                    : emailExpirationStatus.daysUntilExpiry && emailExpirationStatus.daysUntilExpiry <= 30
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}>
                  <div className="flex items-start space-x-3">
                    <AlertCircle className={`h-5 w-5 mt-0.5 ${
                      emailExpirationStatus.expired 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`} />
                    <div className="flex-1">
                      <h5 className="font-semibold mb-1">
                        {emailExpirationStatus.expired 
                          ? 'Kongu Email Expired' 
                          : `Kongu Email Expiring in ${emailExpirationStatus.daysUntilExpiry} Days`}
                      </h5>
                      <p className="text-sm text-muted-foreground mb-2">
                        Your Kongu email ({emailExpirationStatus.konguEmail}) will expire on{' '}
                        {emailExpirationStatus.expirationDate 
                          ? new Date(emailExpirationStatus.expirationDate).toLocaleDateString() 
                          : 'N/A'}.
                        {!emailExpirationStatus.hasPersonalEmail && (
                          <span className="block mt-1 font-medium">
                            Please add a personal email below to ensure uninterrupted access to your account.
                          </span>
                        )}
                      </p>
                      {emailExpirationStatus.hasPersonalEmail && !emailExpirationStatus.migrated && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const response = await api.post('/api/email-migration/migrate', {
                                personalEmail: user?.email?.personal
                              });
                              toast({
                                title: "Migration Started",
                                description: "Your account is being migrated to your personal email."
                              });
                              await refreshUserData();
                              // Reload email status
                              const statusRes = await api.get('/api/email-migration/status');
                              setEmailExpirationStatus(statusRes.data);
                            } catch (error: any) {
                              toast({
                                title: "Migration Failed",
                                description: error.response?.data?.error || "Failed to migrate email",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          Migrate to Personal Email Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h4 className="font-medium mb-3 flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Contact Information</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="collegeEmail">College Email</Label>
                    <Input 
                      id="collegeEmail" 
                      type="email"
                      value={isEditingProfile ? profileForm.collegeEmail : (user?.email?.college || '')} 
                      disabled={!isEditingProfile}
                      onChange={(e) => setProfileForm({ ...profileForm, collegeEmail: e.target.value })}
                      placeholder="college-email@kongu.edu"
                    />
                  </div>
                  <div>
                    <Label htmlFor="personalEmail">Personal Email</Label>
                    <Input 
                      id="personalEmail" 
                      type="email"
                      value={isEditingProfile ? profileForm.personalEmail : (user?.email?.personal || '')} 
                      disabled={!isEditingProfile}
                      onChange={(e) => setProfileForm({ ...profileForm, personalEmail: e.target.value })}
                      placeholder="your.personal@email.com"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Skills */}
              <div>
                <h4 className="font-medium mb-3">Skills</h4>
                {isEditingProfile ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && skillInput.trim()) {
                            e.preventDefault();
                            if (!profileForm.skills.includes(skillInput.trim())) {
                              setProfileForm({
                                ...profileForm,
                                skills: [...profileForm.skills, skillInput.trim()]
                              });
                            }
                            setSkillInput('');
                          }
                        }}
                        placeholder="Add a skill (e.g., JavaScript, Python)"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (skillInput.trim() && !profileForm.skills.includes(skillInput.trim())) {
                            setProfileForm({
                              ...profileForm,
                              skills: [...profileForm.skills, skillInput.trim()]
                            });
                            setSkillInput('');
                          }
                        }}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profileForm.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {skill}
                          <button
                            type="button"
                            onClick={() => {
                              setProfileForm({
                                ...profileForm,
                                skills: profileForm.skills.filter((_, i) => i !== index)
                              });
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {user?.skills && user.skills.length > 0 ? (
                      user.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills added</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Interests */}
              <div>
                <h4 className="font-medium mb-3">Interests</h4>
                {isEditingProfile ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && interestInput.trim()) {
                            e.preventDefault();
                            if (!profileForm.interests.includes(interestInput.trim())) {
                              setProfileForm({
                                ...profileForm,
                                interests: [...profileForm.interests, interestInput.trim()]
                              });
                            }
                            setInterestInput('');
                          }
                        }}
                        placeholder="Add an interest (e.g., AI, Automation)"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (interestInput.trim() && !profileForm.interests.includes(interestInput.trim())) {
                            setProfileForm({
                              ...profileForm,
                              interests: [...profileForm.interests, interestInput.trim()]
                            });
                            setInterestInput('');
                          }
                        }}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profileForm.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {interest}
                          <button
                            type="button"
                            onClick={() => {
                              setProfileForm({
                                ...profileForm,
                                interests: profileForm.interests.filter((_, i) => i !== index)
                              });
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {user?.interests && user.interests.length > 0 ? (
                      user.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary">{interest}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No interests added</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Resume */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  Resume
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </h4>
                <Input 
                  id="resume" 
                  value={isEditingProfile ? profileForm.resume : (user?.resume || '')} 
                  disabled={!isEditingProfile}
                  onChange={(e) => setProfileForm({ ...profileForm, resume: e.target.value })}
                  placeholder="Resume URL or file path"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter URL or file path to your Resume</p>
              </div>

              <div className="mt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  Portfolio URL
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </h4>
                <Input 
                  id="portfolio" 
                  value={isEditingProfile ? profileForm.portfolio : (user?.portfolio || '')} 
                  disabled={!isEditingProfile}
                  onChange={(e) => setProfileForm({ ...profileForm, portfolio: e.target.value })}
                  placeholder="https://yourportfolio.com"
                />
                <p className="text-xs text-muted-foreground mt-1">Share a public portfolio or project site link</p>
              </div>

              <Separator />

              {/* Social Links */}
              <div>
                <h4 className="font-medium mb-3 flex items-center space-x-2">
                  <LinkIcon className="h-4 w-4" />
                  <span>Social Links</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input 
                      id="linkedin" 
                      value={isEditingProfile ? profileForm.linkedin : (user?.socialLinks?.linkedin || '')} 
                      disabled={!isEditingProfile}
                      onChange={(e) => setProfileForm({ ...profileForm, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div>
                    <Label htmlFor="github">GitHub</Label>
                    <Input 
                      id="github" 
                      value={isEditingProfile ? profileForm.github : (user?.socialLinks?.github || '')} 
                      disabled={!isEditingProfile}
                      onChange={(e) => setProfileForm({ ...profileForm, github: e.target.value })}
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                  <div>
                    <Label htmlFor="leetcode">LeetCode</Label>
                    <Input 
                      id="leetcode" 
                      value={isEditingProfile ? profileForm.leetcode : (user?.socialLinks?.leetcode || '')} 
                      disabled={!isEditingProfile}
                      onChange={(e) => setProfileForm({ ...profileForm, leetcode: e.target.value })}
                      placeholder="https://leetcode.com/yourusername"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Custom Links</Label>
                    <span className="text-xs text-muted-foreground">Add other profiles (Behance, Blog, etc.)</span>
                  </div>
                  {isEditingProfile && (
                    <div className="flex flex-col md:flex-row gap-2">
                      <Input 
                        placeholder="Label (e.g., Portfolio, Blog)" 
                        value={customLinkName}
                        onChange={(e) => setCustomLinkName(e.target.value)}
                      />
                      <Input 
                        placeholder="https://example.com/your-link" 
                        value={customLinkUrl}
                        onChange={(e) => setCustomLinkUrl(e.target.value)}
                      />
                      <Button type="button" onClick={handleAddCustomLink}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Link
                      </Button>
                    </div>
                  )}
                  {effectiveCustomLinks.length > 0 ? (
                    <div className="space-y-2">
                      {effectiveCustomLinks.map((link, index) => (
                        <div key={`${link.label}-${index}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                          <a 
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <LinkIcon className="h-4 w-4" />
                            <span className="font-medium">{link.label}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {isEditingProfile && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleRemoveCustomLink(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No custom links added</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <EnhancedNotificationSettings 
            notifications={settings.notifications}
            onUpdate={(notifications) => updateSettings('notifications', notifications)}
          />
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Privacy & Visibility</span>
              </CardTitle>
              <CardDescription>
                Control who can see your information and contact you
              </CardDescription>
                </div>
                {isOnline && realTimeUpdates && (
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="text-xs">Real-time Active</span>
                  </Badge>
                )}
              </div>
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
                  </SelectContent>
                </Select>
              </div>


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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showOnlineStatus">Show Online Status</Label>
                    <Switch
                      id="showOnlineStatus"
                      checked={settings.privacy.showOnlineStatus}
                      onCheckedChange={(checked) => 
                        updateSettings('privacy', { ...settings.privacy, showOnlineStatus: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Settings */}
        <TabsContent value="communication" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>Communication Preferences</span>
                  </CardTitle>
                  <CardDescription>
                    Manage how you receive notifications and updates
                  </CardDescription>
                </div>
                {isOnline && realTimeUpdates && (
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="text-xs">Real-time Active</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Notification Channels</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="pushNotifications">Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">Receive push notifications on your device</p>
                    </div>
                    <Switch
                      id="pushNotifications"
                      checked={settings.communication.pushNotifications}
                      onCheckedChange={(checked) => 
                        updateSettings('communication', { ...settings.communication, pushNotifications: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="inAppNotifications">In-App Notifications</Label>
                      <p className="text-xs text-muted-foreground">Show notifications within the application</p>
                    </div>
                    <Switch
                      id="inAppNotifications"
                      checked={settings.communication.inAppNotifications}
                      onCheckedChange={(checked) => 
                        updateSettings('communication', { ...settings.communication, inAppNotifications: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="notificationFrequency">Notification Frequency</Label>
                <Select
                  value={settings.communication.notificationFrequency}
                  onValueChange={(value) => 
                    updateSettings('communication', { ...settings.communication, notificationFrequency: value as 'immediate' | 'hourly' | 'daily' | 'weekly' })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate - Receive notifications as they happen</SelectItem>
                    <SelectItem value="hourly">Hourly - Receive notifications once per hour</SelectItem>
                    <SelectItem value="daily">Daily - Receive notifications once per day</SelectItem>
                    <SelectItem value="weekly">Weekly - Receive notifications once per week</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">How often you want to receive notification digests</p>
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

              {/* Security Preferences */}
              <div>
                <h4 className="font-medium mb-3">Security Preferences</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="loginNotifications">Login Notifications</Label>
                      <p className="text-xs text-muted-foreground">Get notified when someone logs into your account</p>
                    </div>
                    <Switch
                      id="loginNotifications"
                      checked={settings.security.loginNotifications}
                      onCheckedChange={(checked) => 
                        updateSettings('security', { ...settings.security, loginNotifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="requirePasswordChange">Require Password Change</Label>
                      <p className="text-xs text-muted-foreground">Force password change on next login</p>
                    </div>
                    <Switch
                      id="requirePasswordChange"
                      checked={settings.security.requirePasswordChange}
                      onCheckedChange={(checked) => 
                        updateSettings('security', { ...settings.security, requirePasswordChange: checked })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min="5"
                      max="1440"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => 
                        updateSettings('security', { ...settings.security, sessionTimeout: parseInt(e.target.value) || 30 })
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Time before automatic logout (5-1440 minutes)</p>
                  </div>

                  <div>
                    <Label htmlFor="passwordExpiryDays">Password Expiry (days)</Label>
                    <Input
                      id="passwordExpiryDays"
                      type="number"
                      min="30"
                      max="365"
                      value={settings.security.passwordExpiryDays}
                      onChange={(e) => 
                        updateSettings('security', { ...settings.security, passwordExpiryDays: parseInt(e.target.value) || 90 })
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Days before password expires (30-365 days)</p>
                  </div>

                  <div>
                    <Label>Last Password Change</Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm">
                      {settings.security.lastPasswordChange 
                        ? new Date(settings.security.lastPasswordChange).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'Never'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Date when your password was last changed</p>
                  </div>
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
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
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
                    onClick={clearActivityLog}
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
                          className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
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
