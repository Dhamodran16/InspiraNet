import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Video, Users, Calendar, Clock, MapPin, Plus, Play, Trash2, Copy, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface Meeting {
  roomId: string;
  title: string;
  description: string;
  hostId: string;
  participantCount: number;
  createdAt: string;
  scheduledFor?: string;
}

const MeetingManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    scheduledFor: ''
  });
  const [joinRoomId, setJoinRoomId] = useState('');

  // Load active meetings
  const loadMeetings = async () => {
    try {
      const response = await api.get('/api/meetings');
      if (response.data.success) {
        setMeetings(response.data.meetings);
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  useEffect(() => {
    loadMeetings();
    // Refresh meetings every 30 seconds
    const interval = setInterval(loadMeetings, 30000);
    return () => clearInterval(interval);
  }, []);

  // Create new meeting
  const handleCreateMeeting = async () => {
    if (!newMeeting.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting title",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/meetings/create', newMeeting);
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Meeting created successfully!",
        });
        setNewMeeting({ title: '', description: '', scheduledFor: '' });
        setIsCreateDialogOpen(false);
        loadMeetings();
        
        // Automatically join the created meeting
        navigate(`/meeting/${response.data.roomId}`);
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to create meeting",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Join meeting
  const handleJoinMeeting = () => {
    if (!joinRoomId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room ID",
        variant: "destructive"
      });
      return;
    }

    navigate(`/meeting/${joinRoomId.trim()}`);
    setIsJoinDialogOpen(false);
    setJoinRoomId('');
  };

  // Delete meeting
  const handleDeleteMeeting = async (roomId: string) => {
    try {
      const response = await api.delete(`/meetings/${roomId}`);
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Meeting deleted successfully",
        });
        loadMeetings();
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive"
      });
    }
  };

  // Copy room ID to clipboard
  const copyRoomId = (roomId: string) => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Copied!",
      description: "Room ID copied to clipboard",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 mb-6">
          <Video className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Virtual Meetings
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Connect with fellow alumni and faculty through high-quality video conferencing with screen sharing, chat, and interactive features.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-5 w-5 mr-2" />
              Create Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Meeting</DialogTitle>
              <DialogDescription>
                Set up a new virtual meeting room for your session.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  placeholder="Enter meeting title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  placeholder="Meeting description (optional)"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scheduledFor">Scheduled For</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={newMeeting.scheduledFor}
                  onChange={(e) => setNewMeeting({ ...newMeeting, scheduledFor: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMeeting} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Meeting'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" variant="outline">
              <Play className="h-5 w-5 mr-2" />
              Join Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Join Meeting</DialogTitle>
              <DialogDescription>
                Enter the room ID to join an existing meeting.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="roomId">Room ID</Label>
                <Input
                  id="roomId"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Enter room ID"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsJoinDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleJoinMeeting}>
                Join Meeting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Meetings */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Active Meetings</h2>
        {meetings.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-8">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No active meetings</p>
              <p className="text-sm text-gray-400">Create a meeting to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Card key={meeting.roomId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{meeting.title}</h3>
                        {meeting.hostId === user?._id && (
                          <Badge variant="secondary">Host</Badge>
                        )}
                      </div>
                      {meeting.description && (
                        <p className="text-muted-foreground mb-3">{meeting.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {meeting.participantCount} participants
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(meeting.createdAt).toLocaleString()}
                        </div>
                        {meeting.scheduledFor && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(meeting.scheduledFor).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {meeting.roomId}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyRoomId(meeting.roomId)}
                        title="Copy Room ID"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/meeting/${meeting.roomId}`)}
                        title="Join Meeting"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Join
                      </Button>
                      {meeting.hostId === user?._id && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMeeting(meeting.roomId)}
                          title="Delete Meeting"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Features Info */}
      <Card className="mt-8 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Meeting Features</CardTitle>
          <CardDescription className="text-blue-700">
            Everything you need for productive virtual meetings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-lg border border-blue-200">
              <Video className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-blue-800">HD Video & Audio</h4>
                <p className="text-sm text-blue-700">High-quality video calls with crystal clear audio</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-lg border border-blue-200">
              <Users className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-blue-800">Screen Sharing</h4>
                <p className="text-sm text-blue-700">Share your screen for presentations and demos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-lg border border-blue-200">
              <Calendar className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-blue-800">Real-time Chat</h4>
                <p className="text-sm text-blue-700">Text chat with reactions and typing indicators</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-lg border border-blue-200">
              <Clock className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-blue-800">Hand Raising</h4>
                <p className="text-sm text-blue-700">Raise hand for questions and participation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-lg border border-blue-200">
              <MapPin className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-blue-800">Emoji Reactions</h4>
                <p className="text-sm text-blue-700">Express yourself with emoji reactions</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-lg border border-blue-200">
              <Video className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-blue-800">Host Controls</h4>
                <p className="text-sm text-blue-700">Manage participants and meeting settings</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeetingManagement;

