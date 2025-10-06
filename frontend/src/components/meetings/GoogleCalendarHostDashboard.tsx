import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { completeMeeting, downloadAttendancePdf, logJoin } from '../../services/attendanceApi';

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

const GoogleCalendarHostDashboard: React.FC = () => {
  const { user, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  
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

  // Sync Google Calendar connection status with user context
  useEffect(() => {
    if (user?.googleCalendarConnected !== undefined) {
      console.log('Syncing Google Calendar status from user context:', user.googleCalendarConnected);
      setIsGoogleConnected(user.googleCalendarConnected);
      setCheckingConnection(false);
    }
  }, [user?.googleCalendarConnected]);

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
      const response = await api.get('/api/meetings');
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
      const response = await api.get('/api/google-calendar-status');
      console.log('Google Calendar status response:', response.data);
      const connected = response.data.connected || false;
      setIsGoogleConnected(connected);
      console.log('Google Calendar connected:', connected);
      
      // Update user context with connection status
      if (user.googleCalendarConnected !== connected) {
        console.log('Updating user context with Google Calendar status');
        // Note: In a real app, you'd update the user context here
        // For now, we'll just log it
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
      setIsGoogleConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

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

      // Create meeting using backend API
      const meetingData = {
        title: formData.title,
        description: formData.description,
        startTime: new Date(formData.start_time).toISOString(),
        endTime: new Date(formData.end_time).toISOString(),
        attendees: formData.attendees || []
      };

      const response = await api.post('/api/create-meeting', meetingData);
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
      
      // Handle specific error types with user-friendly messages
      let errorMessage = "Failed to create meeting";
      
      if (error.response?.status === 403) {
        errorMessage = "Please connect your Google Calendar first";
      } else if (error.response?.status === 401) {
        errorMessage = "Please sign in to create meetings";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await api.delete(`/api/delete-meeting/${meetingId}`);
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
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canCreate = !!user && (user.type === 'faculty' || user.type === 'alumni');

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Google Meet Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create and manage Google Meet sessions with real-time integration
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {!isGoogleConnected ? (
            <Button 
              onClick={handleGoogleSignIn}
              disabled={googleAuthLoading}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              {googleAuthLoading ? 'Connecting...' : 'Connect via Google'}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={handleRefreshStatus}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh status
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
                className="gap-2" 
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
                {checkingConnection ? "Checking..." : canCreate ? "Create Meeting" : "Create Disabled"}
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
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span className="text-orange-800 font-medium">
                      {!canCreate ? 'Permission Required' : 'Google Calendar Not Connected'}
                    </span>
                  </div>
                  <p className="text-orange-700 text-sm mt-2">
                    {!canCreate
                      ? 'Only faculty and alumni can create meetings.'
                      : 'Please connect your Google Calendar first to create meetings.'}
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      disabled={!isGoogleConnected}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      disabled={!isGoogleConnected}
                    />
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
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="text-blue-800 font-medium">Checking Google Calendar connection...</span>
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Checking
                </Badge>
              </>
            ) : isGoogleConnected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Google Calendar Connected</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {canCreate ? 'Ready to create meetings' : 'Ready to join meetings'}
                </Badge>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800 font-medium">Google Calendar Not Connected</span>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{meeting.title}</h3>
                        <Badge className={getStatusColor(status)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>
                      
                      {meeting.description && (
                        <p className="text-gray-600 mb-3">{meeting.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(meeting.start_time)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDateTime(meeting.end_time)}
                        </div>
                        {meeting.attendees && meeting.attendees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {meeting.attendees.length} attendees
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const email = (user as any)?.email?.college || (user as any)?.email?.personal || '';
                            const name = (user as any)?.name || '';
                            if (email) {
                              await logJoin(meeting.id, { email, name });
                            }
                          } catch (e) {
                            console.error('Failed to log join:', e);
                          } finally {
                            window.open(meeting.meet_link, '_blank');
                          }
                        }}
                        className="gap-1"
                      >
                        <Video className="h-4 w-4" />
                        {user && (user._id?.toString() === (meeting as any).host_id?.toString() || user._id?.toString() === (meeting as any).createdBy?.toString())
                          ? 'Join as Host'
                          : 'Join as Participant'}
                      </Button>
                      
                      {meeting.calendar_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(meeting.calendar_link, '_blank')}
                          className="gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Calendar
                        </Button>
                      )}
                      
                      {user && (user._id?.toString() === (meeting as any).host_id?.toString() || user._id?.toString() === (meeting as any).createdBy?.toString()) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      )}
                    </div>
                  </div>

                  {/* Host-only attendance actions when meeting ended */}
                  {user && (user._id?.toString() === (meeting as any).host_id?.toString()) && getMeetingStatus(meeting) === 'ended' && (
                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            // ConferenceId typically maps to event_id for completed records; adjust if needed
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
                          } catch (err) {
                            console.error('Error downloading attendance PDF:', err);
                            toast({ title: 'Error', description: 'Failed to download PDF', variant: 'destructive' });
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
      )}
    </div>
  );
};

export default GoogleCalendarHostDashboard;