import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { io, Socket } from 'socket.io-client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, 
  Phone, Hand, Users, MessageCircle, MoreHorizontal,
  Send, X, Crown, User
} from 'lucide-react';

interface Participant {
  id: string;
  username: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
}

interface Message {
  id: string;
  user: string;
  text: string;
  senderId: string;
  likes: number;
  timestamp: number;
}

export default function MeetingRoom() {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State variables
  const [roomId, setRoomId] = useState(urlRoomId || '');
  const [username, setUsername] = useState(user?.name || '');
  const [isJoining, setIsJoining] = useState(false);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [wasMutedByHost, setWasMutedByHost] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isReactionNotificationShowing, setIsReactionNotificationShowing] = useState(false);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const peerUsernamesRef = useRef<{ [key: string]: string }>({});

  // Socket
  const [meetingSocket, setMeetingSocket] = useState<Socket | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Participants state
  const [participants, setParticipants] = useState<Participant[]>([]);

  // RTC Configuration
  const [rtcConfig, setRtcConfig] = useState({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ]
  });

  // Load RTC configuration
  const loadRTCConfig = useCallback(async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/config`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.rtcConfig && Array.isArray(data.rtcConfig.iceServers)) {
          setRtcConfig(data.rtcConfig);
        }
        }
      } catch (error) {
      console.warn('Could not load RTC config, using defaults');
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      });
      
      setMeetingSocket(socket);
      
      return () => {
        socket.disconnect();
      };
  }, []);

  // Load RTC config and initialize meeting
  useEffect(() => {
    loadRTCConfig();
  }, [loadRTCConfig]);

  // Update roomId when URL parameter changes
  useEffect(() => {
    if (urlRoomId && urlRoomId !== roomId) {
      setRoomId(urlRoomId);
      console.log('Room ID updated from URL:', urlRoomId);
    }
  }, [urlRoomId, roomId]);

  // Ensure video element is properly initialized
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    } else if (localVideoRef.current && !localStreamRef.current) {
      console.warn('Local video ref is available but no stream yet');
    }
  }, [localStreamRef.current]);

  // Socket event handlers
  useEffect(() => {
    if (!meetingSocket) return;

    const socket = meetingSocket;
      
      // Listen for media state updates
    socket.on('media-state-update', handleParticipantUpdate);

    // Listen for room joining confirmation
    socket.on('meeting_joined', (data: any) => {
      console.log('Successfully joined meeting:', data);
      setIsInMeeting(true);
      setRoomId(data.roomId);
      toast({
        title: "Success",
        description: `Joined room: ${data.roomId}`,
      });
    });

    // Listen for room joining errors
    socket.on('meeting_join_error', (error: any) => {
      console.error('Failed to join meeting:', error);
      toast({
        title: "Join Failed",
        description: error.message || "Failed to join the meeting room",
        variant: "destructive"
      });
      setIsJoining(false);
    });

    // Listen for user connections
    socket.on('user-connected', async (userId: string, userName: string) => {
      console.log(`User connected: ${userId} (${userName})`);
      peerUsernamesRef.current[userId] = userName;
      
      try {
        const peerConnection = createPeerConnection(userId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        console.log(`Sending offer to ${userId}`);
        socket.emit('offer', offer, userId);
        
        updateParticipantsList();
      } catch (error) {
        console.error('Error in user-connected handler:', error);
      }
    });

    // Listen for existing users in room
    socket.on('room-users', async (users: any[]) => {
      console.log('Existing users in room:', users);
      
      users.forEach((user) => {
        peerUsernamesRef.current[user.id] = user.username;
      });
      
      users.forEach((user) => {
        createPeerConnection(user.id);
      });
      
      updateParticipantsList();
    });

    // Listen for offers
    socket.on('offer', async (offer: any, senderId: string) => {
      console.log('Received offer from:', senderId);
      
      try {
        let peerConnection = peerConnectionsRef.current[senderId];
        if (!peerConnection) {
          peerConnection = createPeerConnection(senderId);
        }
        
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        console.log(`Sending answer to ${senderId}`);
        socket.emit('answer', answer, senderId);
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    // Listen for answers
    socket.on('answer', async (answer: any, senderId: string) => {
      console.log('Received answer from:', senderId);
      
      const peerConnection = peerConnectionsRef.current[senderId];
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      }
    });

    // Listen for ICE candidates
    socket.on('ice-candidate', async (candidate: any, senderId: string) => {
      console.log('Received ICE candidate from:', senderId);
      
      const peerConnection = peerConnectionsRef.current[senderId];
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // Listen for user disconnections
    socket.on('user-disconnected', (userId: string, userName: string) => {
      console.log(`User disconnected: ${userId} (${userName})`);
      
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
      }
      
      delete peerUsernamesRef.current[userId];
      updateParticipantsList();
        
        toast({
        title: "Participant Left",
        description: `${userName} has left the room`,
      });
    });

    // Listen for messages
    socket.on('receive-message', (data: Message) => {
      setMessages(prev => [...prev, data]);
      
      if (data.senderId !== socket.id && !isChatOpen) {
        setUnreadMessageCount(prev => prev + 1);
      }
    });

    // Listen for message likes
    socket.on('message-liked', ({ messageId, likes }: { messageId: string; likes: number }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, likes } : msg
      ));
    });

    // Listen for hand raises
    socket.on('user-raised-hand', (userId: string, raised: boolean, userName: string) => {
      console.log(`Hand raise event received: userId=${userId}, raised=${raised}, userName=${userName}`);
      
      setParticipants(prev => prev.map(p => 
        p.id === userId ? { ...p, isHandRaised: raised } : p
      ));
      
      if (raised) {
        toast({
          title: "Hand Raised",
          description: `${userName} raised their hand`,
        });
      }
    });

    // Listen for reactions
    socket.on('user-reaction', (userId: string, emoji: string, userName: string) => {
      console.log(`Reaction received from ${userId}: ${emoji} by ${userName}`);
      
      if (userId !== socket.id && !isReactionNotificationShowing) {
        setIsReactionNotificationShowing(true);
    
    toast({
          title: "Reaction",
          description: `${userName} reacted with ${emoji}!`,
        });
        
        setTimeout(() => setIsReactionNotificationShowing(false), 3000);
      }
    });

    // Listen for typing indicators
    socket.on('user-typing', (userId: string, isTyping: boolean, userName: string) => {
      if (isTyping) {
        setTypingUsers(prev => [...prev.filter(id => id !== userId), userId]);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }
    });

    // Listen for host mute all
    socket.on('host-mute-all', () => {
      console.log('Received host-mute-all event');
      
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setWasMutedByHost(true);
          setIsMuted(true);
          
          toast({
            title: "Muted by Host",
            description: "You were muted by the host",
            variant: "destructive"
          });
        }
      }
    });

    // Listen for room info
    socket.on('room-info', (info: any) => {
      console.log('Received room-info:', info);
      const hostId = info && info.hostId ? info.hostId : null;
      setIsHost(hostId === socket.id);
      
      if (hostId === socket.id) {
        toast({
          title: "Host Status",
          description: "You are now the host",
        });
      }
    });

    return () => {
      socket.off('media-state-update');
      socket.off('meeting_joined');
      socket.off('meeting_join_error');
      socket.off('user-connected');
      socket.off('room-users');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-disconnected');
      socket.off('receive-message');
      socket.off('message-liked');
      socket.off('user-raised-hand');
      socket.off('user-reaction');
      socket.off('user-typing');
      socket.off('host-mute-all');
      socket.off('room-info');
    };
  }, [meetingSocket, isChatOpen, toast]);

  // Create peer connection
  const createPeerConnection = useCallback((userId: string) => {
    if (peerConnectionsRef.current[userId]) {
      console.log(`Peer connection already exists for ${userId}`);
      return peerConnectionsRef.current[userId];
    }

    const peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${userId}:`, peerConnection.iceConnectionState);
    };
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${userId}`);
        meetingSocket?.emit('ice-candidate', event.candidate, userId);
      }
    };

    peerConnection.ontrack = (event) => {
      console.log(`Received track from ${userId}`);
      // Handle remote video stream here
    };

    peerConnectionsRef.current[userId] = peerConnection;
    return peerConnection;
  }, [rtcConfig, meetingSocket]);

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const primaryConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (e1) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (e2) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          } catch (e3) {
            throw e3;
          }
        }
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Permission Error",
        description: "Could not access camera or microphone. Please check permissions.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  // Handle create/join meeting
  const handleCreateMeeting = useCallback(async () => {
    if (!roomId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room ID",
        variant: "destructive"
      });
      return;
    }

    if (!username.trim()) {
        toast({
        title: "Error",
        description: "Please enter your name",
          variant: "destructive"
        });
      return;
    }

    setIsJoining(true);

    try {
      await initializeLocalStream();
      
      // Use existing roomId from URL or generate new one if creating
      const targetRoomId = roomId || generateRoomId();
      if (!roomId) {
        setRoomId(targetRoomId);
      }

      meetingSocket?.emit('join-room', targetRoomId, username);

      // Add current user to participants as host
      setParticipants([{
        id: meetingSocket?.id || 'local',
        username,
        isHost: true,
      isMuted: false,
      isVideoOff: false,
        isHandRaised: false
      }]);

      setIsInMeeting(true);

      toast({
        title: "Meeting Created!",
        description: `Welcome to room: ${targetRoomId}`,
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      setIsJoining(false);
    }
  }, [roomId, username, meetingSocket, initializeLocalStream, toast]);

  // Generate room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMutedState = !audioTrack.enabled;
        setIsMuted(newMutedState);
        
      if (newMutedState && wasMutedByHost) {
        setWasMutedByHost(false);
        toast({
          title: "Unmuted",
          description: "You unmuted yourself",
        });
      }

      meetingSocket?.emit('update-media-state', { micEnabled: audioTrack.enabled });
    }
  }, [meetingSocket, wasMutedByHost, toast]);

  // Toggle camera
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoOffState = !videoTrack.enabled;
        setIsVideoOff(newVideoOffState);
        
        meetingSocket?.emit('participant_media_update', {
          roomId,
        isMuted,
          isVideoOff: newVideoOffState
        });
    }
  }, [meetingSocket, roomId, isMuted]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        screenStreamRef.current = screenStream;

        const videoTrack = screenStream.getVideoTracks()[0];
        Object.values(peerConnectionsRef.current).forEach((connection) => {
          const sender = connection.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        setIsScreenSharing(true);

        videoTrack.onended = () => {
          stopScreenSharing();
        };
      } else {
        stopScreenSharing();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
      toast({
          title: "Permission Denied",
          description: "Screen sharing permission was denied. Please allow screen sharing and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Screen Share Error",
          description: "Failed to start screen sharing. Please try again.",
        variant: "destructive"
      });
      }
    }
  }, [isScreenSharing, toast]);

  // Stop screen sharing
  const stopScreenSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach((connection) => {
        const sender = connection.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
    }
    
    setIsScreenSharing(false);
    meetingSocket?.emit('update-media-state', { screenSharing: false });
  }, [meetingSocket]);

  // Toggle hand raise
  const toggleHandRaise = useCallback(() => {
    const newHandRaisedState = !isHandRaised;
    setIsHandRaised(newHandRaisedState);
    
    meetingSocket?.emit('raise-hand', newHandRaisedState);
  }, [isHandRaised, meetingSocket]);

  // Send reaction
  const sendReaction = useCallback((emoji: string) => {
    meetingSocket?.emit('reaction', emoji);
    
    toast({
      title: "Reaction Sent",
      description: `You reacted with ${emoji}`,
    });
  }, [meetingSocket, toast]);

  // Host mute all
  const hostMuteAll = useCallback(() => {
    if (isHost) {
      meetingSocket?.emit('host-mute-all');
      
      toast({
        title: "All Muted",
        description: "All participants have been muted",
      });
    }
  }, [isHost, meetingSocket, toast]);

  // Send message
  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    meetingSocket?.emit('send-message', newMessage.trim());
    setNewMessage('');
  }, [newMessage, meetingSocket]);

  // Handle typing
  const handleTyping = useCallback((isTyping: boolean) => {
    meetingSocket?.emit('typing', isTyping);
  }, [meetingSocket]);

  // Update participants list
  const updateParticipantsList = useCallback(() => {
    const currentParticipants: Participant[] = [
      {
        id: meetingSocket?.id || 'local',
        username,
        isHost,
        isMuted,
        isVideoOff,
        isHandRaised
      }
    ];

    Object.keys(peerUsernamesRef.current).forEach(userId => {
      currentParticipants.push({
        id: userId,
        username: peerUsernamesRef.current[userId],
        isHost: false,
        isMuted: false,
        isVideoOff: false,
        isHandRaised: false
      });
    });

    setParticipants(currentParticipants);
  }, [meetingSocket, username, isHost, isMuted, isVideoOff, isHandRaised]);

  // Handle participant update
  const handleParticipantUpdate = useCallback((data: any) => {
    console.log('Participant update received:', data);
    // Update participant state based on received data
  }, []);

  // End call
  const endCall = useCallback(() => {
    if (isScreenSharing) {
      stopScreenSharing();
    }

    Object.values(peerConnectionsRef.current).forEach((connection) => {
      connection.close();
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    navigate('/dashboard');
  }, [isScreenSharing, stopScreenSharing, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach((connection) => {
        connection.close();
      });
    };
  }, []);

  if (!isInMeeting) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold mb-6 text-center">Join Meeting</h1>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Room ID</label>
                  <Input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
            </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
            </div>
            
              <Button 
                  onClick={handleCreateMeeting}
                  disabled={isJoining || !roomId.trim() || !username.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isJoining ? 'Joining...' : 'Join Meeting'}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      {/* Main video area */}
        <div className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Local video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
              className="w-full h-64 object-cover"
            />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                  {username} (You)
              </div>
            {isHandRaised && (
              <div className="absolute top-2 right-2 bg-blue-500 px-2 py-1 rounded text-sm">
                ✋
                </div>
              )}
            </div>
              
          {/* Remote videos would be rendered here */}
          </div>
        </div>

      {/* Controls */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4 bg-gray-800 p-4 rounded-full border border-gray-600">
        <Button
          onClick={toggleMic}
          variant={isMuted ? "destructive" : "default"}
          size="icon"
          className="w-12 h-12 rounded-full"
        >
          {isMuted ? <MicOff /> : <Mic />}
        </Button>
        
        <Button
          onClick={toggleVideo}
          variant={isVideoOff ? "destructive" : "default"}
          size="icon"
          className="w-12 h-12 rounded-full"
        >
          {isVideoOff ? <VideoOff /> : <Video />}
        </Button>
        
        <Button
          onClick={toggleScreenShare}
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          className="w-12 h-12 rounded-full"
        >
          <Monitor />
        </Button>
        
        <Button
          onClick={toggleHandRaise}
          variant={isHandRaised ? "default" : "secondary"}
          size="icon"
          className="w-12 h-12 rounded-full"
        >
          <Hand />
        </Button>
        
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          variant={isChatOpen ? "default" : "secondary"}
          size="icon"
          className="w-12 h-12 rounded-full relative"
        >
          <MessageCircle />
          {unreadMessageCount > 0 && (
            <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 text-xs">
              {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
            </Badge>
          )}
        </Button>
        
                <Button
          onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
          variant={isParticipantsOpen ? "default" : "secondary"}
          size="icon"
          className="w-12 h-12 rounded-full"
        >
          <Users />
                          </Button>
        
        {isHost && (
                          <Button
            onClick={hostMuteAll}
            variant="destructive"
            size="icon"
            className="w-12 h-12 rounded-full"
          >
            <MicOff />
                          </Button>
        )}
        
                          <Button
          onClick={endCall}
          variant="destructive"
          size="icon"
          className="w-12 h-12 rounded-full"
        >
          <Phone />
                </Button>
              </div>

      {/* Chat Panel */}
      {isChatOpen && (
        <div className="fixed right-6 top-6 bottom-24 w-80 bg-gray-800 rounded-lg border border-gray-600 flex flex-col">
          <div className="p-4 border-b border-gray-600 flex justify-between items-center">
            <h3 className="font-semibold">Chat</h3>
                          <Button
                            variant="ghost"
              size="icon"
              onClick={() => setIsChatOpen(false)}
              className="h-8 w-8"
                          >
              <X />
                          </Button>
                    </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.senderId === meetingSocket?.id
                    ? 'bg-blue-600 ml-auto max-w-xs'
                    : 'bg-gray-700 mr-auto max-w-xs'
                }`}
              >
                <div className="text-xs text-gray-300 mb-1">
                  {message.user}
                  </div>
                <div className="text-sm">{message.text}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
              </div>
            ))}
            
                {typingUsers.length > 0 && (
                  <div className="text-sm text-gray-400 italic">
                {typingUsers.length === 1 ? 'Someone is typing...' : 'Multiple people are typing...'}
                  </div>
                )}
              </div>
          
          <div className="p-4 border-t border-gray-600">
            <div className="flex gap-2">
                  <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping(e.target.value.length > 0);
                }}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                className="flex-1 bg-gray-700 border-gray-600 text-white"
                  />
              <Button onClick={sendMessage} size="icon" className="w-10 h-10">
                <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

            {/* Participants Panel */}
      {isParticipantsOpen && (
        <div className="fixed right-6 top-6 bottom-24 w-80 bg-gray-800 rounded-lg border border-gray-600 flex flex-col">
          <div className="p-4 border-b border-gray-600 flex justify-between items-center">
            <h3 className="font-semibold">Participants ({participants.length})</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsParticipantsOpen(false)}
              className="h-8 w-8"
            >
              <X />
            </Button>
                </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-700"
                    >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-semibold">
                        {participant.username.charAt(0).toUpperCase()}
              </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{participant.username}</span>
                    {participant.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                    {participant.id === meetingSocket?.id && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {participant.isMuted && <MicOff className="w-3 h-3" />}
                    {participant.isVideoOff && <VideoOff className="w-3 h-3" />}
                    {participant.isHandRaised && <Hand className="w-3 h-3 text-blue-400" />}
                  </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

      {/* Reactions Menu */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-800 p-2 rounded-full border border-gray-600">
        {['👍', '👏', '🎉', '❤️', '😂', '😮', '😢', '😡', '👀', '🤔', '🤷', '✨'].map((emoji) => (
          <Button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 text-lg hover:scale-110 transition-transform"
          >
            {emoji}
          </Button>
        ))}
        </div>
      </div>
    );
  }