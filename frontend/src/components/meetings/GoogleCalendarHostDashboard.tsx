import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar,
  Clock,
  Users,
  Video,
  Plus,
  Trash2,
  ExternalLink,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  LogOut
} from 'lucide-react';
import api from '../../services/api';
import { cn } from '../../lib/utils';
import { completeMeeting, downloadAttendancePdf, logJoin, logLeave } from '../../services/attendanceApi';

interface Meeting {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  meet_link: string;
  calendar_link?: string;
  event_id: string;
  attendees: Array<{
    email: string;
    name?: string;
    responseStatus?: string;
  }>;
  host_id: string;
  status: string;
  created_at: string;
}

interface CreateMeetingData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  attendees?: Array<{
    email: string;
    name?: string;
  }>;
}

interface LocalAttendanceRecord {
  email: string;
  name: string;
  status: 'present' | 'left';
  joinTime: string;
  leaveTime?: string;
}

const LOCAL_ATTENDANCE_STORAGE_KEY = 'inspiranet_meeting_attendance';

const GoogleCalendarHostDashboard: React.FC = () => {
  const { user, loginWithGoogle, updateUser } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<CreateMeetingData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    attendees: []
  });
  const [localAttendance, setLocalAttendance] = useState<Record<string, LocalAttendanceRecord>>({});
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const endTimeInputRef = useRef<HTMLInputElement>(null);

  // Load local attendance records from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_ATTENDANCE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setLocalAttendance(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load local attendance records:', error);
    }
  }, []);

  // Persist attendance state
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_ATTENDANCE_STORAGE_KEY, JSON.stringify(localAttendance));
    } catch (error) {
      console.error('Failed to persist local attendance records:', error);
    }
  }, [localAttendance]);

  const openPicker = useCallback((ref: React.RefObject<HTMLInputElement>) => {
    if (!ref.current) return;
    const input = ref.current;
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
        input.click();
      }
    } catch (err) {
      input.focus();
    }
  }, []);

  // Load meetings and check Google connection status
  useEffect(() => {
    if (user) {
      loadMeetings();
      checkGoogleConnection();
    }
  }, [user]);

  const loadMeetings = async () => {
    // Only load meetings if Google Calendar is connected
    if (!isGoogleConnected) {
      console.log('Google Calendar not connected, skipping meeting load');
      setMeetings([]);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading meetings...');
      const response = await api.get('/api/meetings/meetings');
      setMeetings(response.data.meetings || []);
      console.log('Meetings loaded:', response.data.meetings?.length || 0);
    } catch (error: any) {
      console.error('Error loading meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveUserIdentity = useCallback(() => {
    const email =
      (user as any)?.email?.college ||
      (user as any)?.email?.personal ||
      (user as any)?.email ||
      '';

    const name =
      user?.name ||
      [(user as any)?.firstName, (user as any)?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      'Participant';

    return { email, name };
  }, [user]);

  const formatLocalAttendanceTime = useCallback((iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return '—';
    }
  }, []);

  const handleJoinMeetingClick = useCallback(async (meeting: Meeting) => {
    const { email, name } = resolveUserIdentity();

    if (!email) {
      toast({
        title: "Attendance not logged",
        description: "We couldn't find your email to mark attendance. Please update your profile.",
        variant: "destructive",
      });
      window.open(meeting.meet_link, '_blank');
      return;
    }

    try {
      await logJoin(meeting.id, { email, name });
      const joinTime = new Date().toISOString();

      setLocalAttendance(prev => ({
        ...prev,
        [meeting.id]: {
          email,
          name,
          status: 'present',
          joinTime,
        }
      }));

      toast({
        title: "Attendance logged",
        description: "You're marked as present for this meeting."
      });
    } catch (error: any) {
      console.error('Failed to log join:', error);
      toast({
        title: "Attendance log failed",
        description: error.response?.data?.error || error.message || "Could not record attendance",
        variant: "destructive",
      });
    } finally {
      window.open(meeting.meet_link, '_blank');
    }
  }, [resolveUserIdentity, toast]);

  const handleLeaveMeetingClick = useCallback(async (meeting: Meeting) => {
    const { email, name } = resolveUserIdentity();

    if (!email) {
      toast({
        title: "Attendance not updated",
        description: "We couldn't find your email to log leaving the meeting.",
        variant: "destructive",
      });
      return;
    }

    try {
      await logLeave(meeting.id, { email, name });
      const leaveTime = new Date().toISOString();

      setLocalAttendance(prev => {
        const existing = prev[meeting.id];
        return {
          ...prev,
          [meeting.id]: {
            email,
            name,
            status: 'left',
            joinTime: existing?.joinTime || leaveTime,
            leaveTime
          }
        };
      });

      toast({
        title: "Attendance updated",
        description: "Marked as left for this meeting."
      });
    } catch (error: any) {
      console.error('Failed to log leave:', error);
      toast({
        title: "Unable to log leave",
        description: error.response?.data?.error || error.message || "Please try again",
        variant: "destructive",
      });
    }
  }, [resolveUserIdentity, toast]);

  const checkGoogleConnection = async () => {
    // Only check if user is available
    if (!user) {
      console.log('No user available, skipping Google Calendar check');
      setIsGoogleConnected(false);
      setCheckingConnection(false);
      return;
    }

    try {
      setCheckingConnection(true);
      console.log('Checking Google Calendar connection...');
      const response = await api.get('/api/meetings/google-calendar-status');
      console.log('Google Calendar status response:', response.data);
      const connected = response.data.connected || false;
      setIsGoogleConnected(connected);
      console.log('Google Calendar connected:', connected);

      // Update user context with connection status
      if (user && user.googleCalendarConnected !== connected) {
        console.log('Updating user context with Google Calendar status:', connected);
        updateUser({
          googleCalendarConnected: connected
        });
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
      setIsGoogleConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  // Handle OAuth callback redirect
  useEffect(() => {
    const googleAuth = searchParams.get('google_auth');
    if (googleAuth === 'success') {
      toast({
        title: "Success",
        description: "Google Calendar connected successfully!",
      });
      setIsGoogleConnected(true);
      setSearchParams({}, { replace: true }); // Clear the query params

      // Refresh user data from backend to get updated googleCalendarConnected status
      const refreshUserData = async () => {
        try {
          const response = await api.get('/api/auth/profile');
          if (response.data && response.data.user) {
            updateUser({
              googleCalendarConnected: response.data.user.googleCalendarConnected || true
            });
            console.log('User data refreshed with Google Calendar status:', response.data.user.googleCalendarConnected);
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      };

      refreshUserData();
      // Wait a bit for the user data to update, then check connection
      setTimeout(() => {
        checkGoogleConnection();
        loadMeetings();
      }, 1000);
    } else if (googleAuth === 'error') {
      const error = searchParams.get('error');
      toast({
        title: "Connection Failed",
        description: error || "Failed to connect Google Calendar. Please try again.",
        variant: "destructive",
      });
      setSearchParams({}, { replace: true }); // Clear the query params
    }
  }, [searchParams, toast, setSearchParams, updateUser]);

  // Sync Google Calendar connection status with user context
  useEffect(() => {
    if (user?.googleCalendarConnected !== undefined) {
      console.log('Syncing Google Calendar status from user context:', user.googleCalendarConnected);
      setIsGoogleConnected(user.googleCalendarConnected);
      setCheckingConnection(false);
    }
  }, [user?.googleCalendarConnected]);


  const handleGoogleSignIn = () => {
    setGoogleAuthLoading(true);
    loginWithGoogle();

    // Check connection status after a delay
    setTimeout(() => {
      checkGoogleConnection();
      setGoogleAuthLoading(false);
    }, 3000);
  };

  const handleRefreshStatus = () => {
    checkGoogleConnection();
    loadMeetings();
  };

  const handleCreateMeeting = async () => {
    try {
      // Only faculty and alumni can create meetings
      if (!user || (user.type !== 'faculty' && user.type !== 'alumni')) {
        toast({
          title: "Permission denied",
          description: "Only faculty and alumni can create meetings.",
          variant: "destructive",
        });
        return;
      }

      if (!isGoogleConnected) {
        toast({
          title: "Google Calendar Required",
          description: "Please connect your Google Calendar first to create meetings.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.title || !formData.start_time || !formData.end_time) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Validate and convert dates
      const startDate = new Date(formData.start_time);
      const endDate = new Date(formData.end_time);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        toast({
          title: "Invalid Date",
          description: "Please enter valid start and end times",
          variant: "destructive",
        });
        return;
      }

      if (endDate <= startDate) {
        toast({
          title: "Invalid Time Range",
          description: "End time must be after start time",
          variant: "destructive",
        });
        return;
      }

      // Create meeting using backend API
      const meetingData = {
        title: formData.title,
        description: formData.description,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        attendees: formData.attendees || []
      };

      console.log('Creating meeting with data:', meetingData);

      const response = await api.post('/api/meetings/create-meeting', meetingData);
      const newMeeting = response.data.meeting;

      setMeetings(prev => [newMeeting, ...prev]);
      setShowCreateDialog(false);
      resetForm();

      toast({
        title: "Success",
        description: "Google Meet created successfully!",
      });
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      console.error('Error response:', error.response?.data);

      // Handle specific error types with user-friendly messages
      let errorMessage = "Failed to create meeting";
      let errorTitle = "Error";

      // Check for invalid_grant error (revoked access)
      if (error.response?.data?.code === 'invalid_grant' ||
        error.response?.data?.error === 'Google Calendar access revoked' ||
        error.response?.data?.message?.includes('revoked')) {
        errorTitle = "Google Calendar Access Revoked";
        errorMessage = error.response.data?.message || "Your Google Calendar access has been revoked. Please reconnect your account.";

        // Update connection status
        setIsGoogleConnected(false);
        if (updateUser) {
          updateUser({ googleCalendarConnected: false });
        }

        // Show error toast with reconnect message
        toast({
          title: errorTitle,
          description: `${errorMessage} Click "Connect To Your Google Account" to reconnect.`,
          variant: "destructive",
        });
        return;
      }

      if (error.response?.status === 403) {
        errorTitle = "Google Calendar Required";
        errorMessage = error.response.data?.message || "Please connect your Google Calendar first";
      } else if (error.response?.status === 401) {
        errorTitle = "Authentication Required";
        errorMessage = error.response.data?.message || "Please reconnect your Google Calendar account";

        // Update connection status
        setIsGoogleConnected(false);
        if (updateUser) {
          updateUser({ googleCalendarConnected: false });
        }
      } else if (error.response?.status === 500) {
        errorTitle = "Server Error";
        errorMessage = error.response.data?.message || error.response.data?.error || "An error occurred while creating the meeting. Please try again.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.message) {
          errorMessage += `: ${error.response.data.message}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await api.delete(`/api/meetings/delete-meeting/${meetingId}`);
      setMeetings(prev => prev.filter(meeting => meeting.id !== meetingId));

      toast({
        title: "Success",
        description: "Meeting deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      attendees: []
    });
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getMeetingStatus = (meeting: Meeting) => {
    const now = new Date();
    const startTime = new Date(meeting.start_time);
    const endTime = new Date(meeting.end_time);

    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'live';
    return 'ended';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'live': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'ended': return 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const canCreate = !!user && (user.type === 'faculty' || user.type === 'alumni');

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Google Meet Dashboard
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            Create and manage sessions with real-time integration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {!isGoogleConnected ? (
            <Button
              onClick={handleGoogleSignIn}
              disabled={googleAuthLoading}
              className="gap-2 flex-1 md:flex-none"
            >
              <Settings className="h-4 w-4" />
              {googleAuthLoading ? 'Connecting...' : 'Connect Google'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleRefreshStatus}
              className="gap-2 flex-1 md:flex-none"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}

          {canCreate && (
            <Dialog open={showCreateDialog} onOpenChange={(open) => {
              if (!open) {
                setShowCreateDialog(open);
              } else if (isGoogleConnected && !checkingConnection && canCreate) {
                setShowCreateDialog(open);
              } else {
                toast({
                  title: canCreate ? "Google Calendar Required" : "Permission denied",
                  description: canCreate
                    ? "Please connect your Google Calendar first to create meetings."
                    : "Only faculty and alumni can create meetings.",
                  variant: "destructive",
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 flex-1 md:flex-none"
                  disabled={!isGoogleConnected || checkingConnection || !canCreate}
                  title={
                    !canCreate
                      ? "Only faculty and alumni can create meetings"
                      : !isGoogleConnected
                        ? "Please connect Google Calendar first"
                        : checkingConnection
                          ? "Checking connection..."
                          : "Create a new meeting"
                  }
                  onClick={(e) => {
                    if (!canCreate || !isGoogleConnected || checkingConnection) {
                      e.preventDefault();
                      toast({
                        title: !canCreate ? "Permission denied" : "Google Calendar Required",
                        description: !canCreate
                          ? "Only faculty and alumni can create meetings."
                          : "Please connect your Google Calendar first to create meetings.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {checkingConnection ? "Check..." : canCreate ? "Create" : "Disabled"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Google Meet Session</DialogTitle>
                  <DialogDescription>
                    {!canCreate
                      ? "Only faculty and alumni can create meetings."
                      : !isGoogleConnected
                        ? "Google Calendar connection is required to create meetings"
                        : "Create a new Google Meet session with calendar integration"
                    }
                  </DialogDescription>
                </DialogHeader>

                {(!canCreate || !isGoogleConnected) && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <span className="text-orange-800 dark:text-orange-300 font-medium">
                        {!canCreate ? 'Permission Required' : 'Connect To Your Google Account'}
                      </span>
                    </div>
                    <p className="text-orange-700 dark:text-orange-400/80 text-sm mt-2">
                      {!canCreate
                        ? 'Only faculty and alumni can create meetings.'
                        : 'Please connect to your Google Account first to create meetings.'}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Meeting Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter meeting title"
                      disabled={!isGoogleConnected}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter meeting description"
                      rows={3}
                      disabled={!isGoogleConnected}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <Label htmlFor="startTime">Start Time *</Label>
                      <div className="relative">
                        <Input
                          id="startTime"
                          type="datetime-local"
                          value={formData.start_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                          disabled={!isGoogleConnected}
                          className="pr-10 datetime-input text-sm"
                          ref={startTimeInputRef}
                        />
                        <button
                          type="button"
                          onClick={() => openPicker(startTimeInputRef)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-700"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <Label htmlFor="endTime">End Time *</Label>
                      <div className="relative">
                        <Input
                          id="endTime"
                          type="datetime-local"
                          value={formData.end_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                          disabled={!isGoogleConnected}
                          className="pr-10 datetime-input text-sm"
                          ref={endTimeInputRef}
                        />
                        <button
                          type="button"
                          onClick={() => openPicker(endTimeInputRef)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-700"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateMeeting}
                      disabled={!canCreate || !isGoogleConnected || checkingConnection}
                      title={!canCreate ? "Only faculty and alumni can create meetings" : (!isGoogleConnected ? "Google Calendar connection required" : "")}
                    >
                      {checkingConnection ? "Checking..." : "Create Meeting"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {checkingConnection ? (
              <>
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-blue-800 dark:text-blue-300 font-medium">Checking Google Calendar connection...</span>
                <Badge variant="outline" className="text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400">
                  Checking
                </Badge>
              </>
            ) : isGoogleConnected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                <span className="text-green-800 dark:text-green-300 font-medium">Google Calendar Connected</span>
                <Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-500 dark:border-green-500">
                  {canCreate ? 'Ready to create meetings' : 'Ready to join meetings'}
                </Badge>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span className="text-orange-800 dark:text-orange-300 font-medium">Connect To Your Google Account</span>
                <Badge variant="outline" className="text-orange-600 border-orange-600 dark:text-orange-400 dark:border-orange-400">
                  {canCreate ? 'Connect required' : 'Connect to join easily'}
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meetings List */}
      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading meetings...</p>
        </div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No meetings yet</h3>
            <p className="text-gray-600 mb-4">
              {canCreate ? 'Create your first Google Meet session to get started' : 'No meetings available yet. Check back later.'}
            </p>
            {canCreate && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {meetings.map((meeting) => {
            const status = getMeetingStatus(meeting);
            return (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{meeting.title}</h3>
                        <Badge className={cn("text-[10px] sm:text-xs", getStatusColor(status))}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>

                      {meeting.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2 md:line-clamp-none">{meeting.description}</p>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-[10px] sm:text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(meeting.start_time)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(meeting.end_time)}
                        </div>
                        {meeting.attendees && meeting.attendees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {meeting.attendees.length} attendees
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleJoinMeetingClick(meeting)}
                        className="gap-1 flex-1 sm:flex-none text-xs h-8"
                      >
                        <Video className="h-3.5 w-3.5" />
                        {user && (user._id?.toString() === (meeting as any).host_id?.toString() || user._id?.toString() === (meeting as any).createdBy?.toString())
                          ? 'Host'
                          : 'Join'}
                      </Button>
                      {localAttendance[meeting.id]?.status === 'present' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleLeaveMeetingClick(meeting)}
                          className="gap-1 flex-1 sm:flex-none text-xs h-8"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Leave
                        </Button>
                      )}

                      {meeting.calendar_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(meeting.calendar_link, '_blank')}
                          className="gap-1 flex-1 sm:flex-none text-xs h-8"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Calendar
                        </Button>
                      )}

                      {user && (user._id?.toString() === (meeting as any).host_id?.toString() || user._id?.toString() === (meeting as any).createdBy?.toString()) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {localAttendance[meeting.id] && (
                    <div className="mt-3 rounded-lg border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 p-3 text-xs sm:text-sm text-blue-900 dark:text-blue-200">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-start gap-2">
                          <Badge variant={localAttendance[meeting.id].status === 'present' ? 'default' : 'secondary'} className={localAttendance[meeting.id].status === 'present' ? 'bg-blue-600 text-white' : ''}>
                            {localAttendance[meeting.id].status === 'present' ? 'Marked Present' : 'Marked Left'}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-left font-medium">
                            Joined: {formatLocalAttendanceTime(localAttendance[meeting.id].joinTime)}
                          </span>
                          {localAttendance[meeting.id].leaveTime && (
                            <span className="text-left font-medium">
                              Left: {formatLocalAttendanceTime(localAttendance[meeting.id].leaveTime)}
                            </span>
                          )}
                        </div>
                      </div>
                      {!localAttendance[meeting.id].leaveTime && (
                        <p className="mt-2 text-[0.7rem] text-blue-800 dark:text-blue-300 italic opacity-80">
                          Don&apos;t forget to log leave when you finish the meeting.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Host-only attendance actions when meeting ended */}
                  {user && (user._id?.toString() === (meeting as any).host_id?.toString()) && getMeetingStatus(meeting) === 'ended' && (
                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await completeMeeting(meeting.id, meeting.event_id);
                            toast({ title: 'Attendance processed', description: 'You can now download the PDF.' });
                          } catch (err) {
                            console.error('Error completing meeting for attendance:', err);
                            toast({ title: 'Error', description: 'Failed to process attendance', variant: 'destructive' });
                          }
                        }}
                      >
                        Process Attendance
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const blob = await downloadAttendancePdf(meeting.id);
                            const url = window.URL.createObjectURL(new Blob([blob]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `attendance-${meeting.id}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            toast({
                              title: 'Success',
                              description: 'Attendance data downloaded successfully'
                            });
                          } catch (err: any) {
                            console.error('Error downloading attendance PDF:', err);
                            const errorMessage = err.response?.data?.message ||
                              err.response?.data?.error ||
                              'Failed to download attendance data';
                            toast({
                              title: 'Error',
                              description: errorMessage,
                              variant: 'destructive'
                            });
                          }
                        }}
                      >
                        Download Attendance PDF
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )
      }
    </div >
  );
};

export default GoogleCalendarHostDashboard;

