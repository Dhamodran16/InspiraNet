import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Video, 
  Users, 
  Plus, 
  LogIn, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Monitor, 
  Phone, 
  Hand, 
  MessageSquare,
  MoreHorizontal,
  X,
  Send
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import config from '@/config/env';
import { getMeetingUrl } from '../utils/urlConfig';

// 🚀 Dynamic meeting URL based on environment
const MEETING_URL = getMeetingUrl();

interface Participant {
  id: string;
  username: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  hasRaisedHand: boolean;
}

interface Message {
  id: string;
  user: string;
  text: string;
  senderId: string;
  likes: number;
  timestamp: number;
  replyTo?: string;
  replies?: Message[];
}

export default function MeetingRoom() {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State variables
  const [roomId, setRoomId] = useState(urlRoomId || '');
  const [username, setUsername] = useState(user?.name || '');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Meeting state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // WebRTC
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnections, setPeerConnections] = useState<{ [key: string]: RTCPeerConnection }>({});
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
  // Meeting socket
  const [meetingSocket, setMeetingSocket] = useState<Socket | null>(null);
  
  // ICE servers configuration
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  // Load RTC configuration from meeting server
  const loadRTCConfig = async () => {
    try {
      const response = await fetch(`${MEETING_URL}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.rtcConfig && Array.isArray(data.rtcConfig.iceServers)) {
          Object.assign(rtcConfig, data.rtcConfig);
          console.log('✅ RTC configuration loaded from meeting server');
        }
        }
      } catch (error) {
      console.warn('⚠️ Failed to load RTC configuration from meeting server, using defaults:', error.message);
      // Continue with default configuration - don't prevent meeting from working
    }
  };

  // Initialize meeting socket when component mounts
  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      const socket = io(MEETING_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000
      });
      
      socket.on('connect', () => {
        console.log('✅ Connected to meeting server');
      });
      
      socket.on('connect_error', (error) => {
        console.error('❌ Meeting server connection error:', error);
        // Don't show error to user if it's just auth issue
        if (!error.message.includes('Authentication')) {
        toast({
            title: "Connection Error",
            description: "Failed to connect to meeting server. Please try again.",
          variant: "destructive"
        });
      }
      });
      
      setMeetingSocket(socket);
      
      return () => {
        socket.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (isInMeeting) {
      setupSocketListeners();
      return () => {
        cleanupSocketListeners();
        leaveMeeting();
      };
    }
  }, [isInMeeting]);

  useEffect(() => {
    if (showChat && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, showChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    loadRTCConfig();
  }, []);
  
  // Update roomId when URL parameter changes
  useEffect(() => {
    if (urlRoomId && urlRoomId !== roomId) {
      setRoomId(urlRoomId);
      console.log('✅ Room ID updated from URL:', urlRoomId);
    }
  }, [urlRoomId, roomId]);

  // Ensure video element is properly initialized
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('Setting up local video element...');
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => {
        console.error('Error playing local video:', e);
      });
    } else if (localStream && !localVideoRef.current) {
      console.log('Waiting for video ref to be available...');
    }
  }, [localStream, localVideoRef.current]);

  const setupSocketListeners = () => {
    if (meetingSocket) {
      // Listen for existing users in the room
      meetingSocket.on('room-users', (users: any[]) => {
        console.log('✅ Existing users in room:', users);
        // Handle existing users in the room
        users.forEach(async (user) => {
          if (user.id !== meetingSocket?.id) {
            console.log('Processing existing user:', user.id, user.username);
            await handleExistingUser(user.id, user.username);
          }
        });
      });

      // Listen for new user connections
      meetingSocket.on('user-connected', handleUserConnected);
      
      // Listen for user disconnections
      meetingSocket.on('user-disconnected', handleUserDisconnected);
      
      // Listen for WebRTC offers
      meetingSocket.on('offer', handleOffer);
      
      // Listen for WebRTC answers
      meetingSocket.on('answer', handleAnswer);
      
      // Listen for ICE candidates
      meetingSocket.on('ice-candidate', handleIceCandidate);
      
      // Listen for chat messages
      meetingSocket.on('receive-message', handleMessage);
      
      // Listen for typing indicators
      meetingSocket.on('user-typing', handleUserTyping);
      
      // Listen for hand raise events
      meetingSocket.on('user-raised-hand', handleUserRaisedHand);
      
      // Listen for host mute all events
      meetingSocket.on('host-mute-all', handleHostMuteAll);
      
      // Listen for host end meeting events
      meetingSocket.on('meeting-ended-by-host', handleMeetingEndedByHost);
      
      // Listen for room info updates
      meetingSocket.on('room-info', handleRoomInfo);
      
      // Listen for emoji reactions
      meetingSocket.on('emoji-reaction', handleEmojiReaction);
      
      // Listen for participant updates
      meetingSocket.on('participant-update', handleParticipantUpdate);
      
      // Listen for media state updates
      meetingSocket.on('media-state-update', handleParticipantUpdate);
      
      // Listen for room joining confirmation
      meetingSocket.on('meeting_joined', (data: any) => {
        console.log('✅ Successfully joined meeting:', data);
        setIsInMeeting(true);
        setRoomId(data.roomId);
        toast({
          title: "Success",
          description: `Joined room: ${data.roomId}`,
        });
      });
      
      // Listen for room joining errors
      meetingSocket.on('meeting_join_error', (error: any) => {
        console.error('❌ Failed to join meeting:', error);
        toast({
          title: "Join Failed",
          description: error.message || "Failed to join the meeting room",
          variant: "destructive"
        });
        setIsJoining(false);
      });
    }
  };

  const cleanupSocketListeners = () => {
    if (meetingSocket) {
      meetingSocket.off('room-users');
      meetingSocket.off('user-connected');
      meetingSocket.off('user-disconnected');
      meetingSocket.off('offer');
      meetingSocket.off('answer');
      meetingSocket.off('ice-candidate');
      meetingSocket.off('receive-message');
      meetingSocket.off('user-typing');
      meetingSocket.off('user-raised-hand');
      meetingSocket.off('host-mute-all');
      meetingSocket.off('meeting-ended-by-host');
      meetingSocket.off('room-info');
      meetingSocket.off('emoji-reaction');
      meetingSocket.off('participant-update');
      meetingSocket.off('media-state-update');
      meetingSocket.off('meeting_joined');
      meetingSocket.off('meeting_join_error');
    }
  };

  const handleJoinRoom = async () => {
    if (!username.trim() || !roomId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both your name and room ID.",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      // Initialize local stream first
      await initializeLocalStream();
      
      // Join the room directly (no need to validate meeting exists first)
      meetingSocket?.emit('join_meeting', { roomId: roomId, username });
      
      // Add current user to participants
      const currentParticipant: Participant = {
        id: meetingSocket?.id || 'local',
        username,
        isHost: isHost,
        isMuted: false,
        isVideoOff: false,
        hasRaisedHand: false
      };
      setParticipants([currentParticipant]);
      
      setIsInMeeting(true);
      toast({
        title: "Success",
        description: `Joined room: ${roomId}`,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please check your permissions and try again.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinExistingMeeting = async () => {
    if (!username.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to join a meeting.",
        variant: "destructive"
      });
      return;
    }

    if (username.trim().length < 2) {
      toast({
        title: "Invalid Name",
        description: "Name must be at least 2 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (!roomId.trim()) {
      toast({
        title: "Room ID Required",
        description: "Please enter the room ID to join an existing meeting.",
        variant: "destructive"
      });
      return;
    }

    if (roomId.trim().length < 3) {
      toast({
        title: "Invalid Room ID",
        description: "Room ID must be at least 3 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    
    try {
      await initializeLocalStream();
      
      // Join the existing room
      meetingSocket?.emit('join_meeting', { roomId: roomId, username });
      
      // Add current user to participants
      const currentParticipant: Participant = {
        id: meetingSocket?.id || 'local',
        username,
        isHost: false,
        isMuted: false,
        isVideoOff: false,
        hasRaisedHand: false
      };
      setParticipants([currentParticipant]);
      
      setIsInMeeting(true);
      setIsHost(false);
      
      toast({
        title: "Joining Meeting!",
        description: `Joining room: ${roomId}`,
      });
    } catch (error) {
      console.error('Error joining meeting:', error);
      toast({
        title: "Error",
        description: "Failed to join meeting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!username.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to create a meeting.",
        variant: "destructive"
      });
      return;
    }

    if (username.trim().length < 2) {
      toast({
        title: "Invalid Name",
        description: "Name must be at least 2 characters long.",
        variant: "destructive"
      });
      return;
    }

    // Use existing roomId from URL or generate new one if creating
    const targetRoomId = roomId || generateRoomId();
    if (!roomId) {
      setRoomId(targetRoomId);
    }
    
    try {
      await initializeLocalStream();
      meetingSocket?.emit('join_meeting', { roomId: targetRoomId, username });
      
      // Add current user to participants as host
      const currentParticipant: Participant = {
        id: meetingSocket?.id || 'local',
        username,
        isHost: true,
        isMuted: false,
        isVideoOff: false,
        hasRaisedHand: false
      };
      setParticipants([currentParticipant]);
      
      setIsInMeeting(true);
      setIsHost(true);
      toast({
        title: "Meeting Created!",
        description: `Welcome to room: ${targetRoomId}`,
      });
      } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const initializeLocalStream = async () => {
    try {
      console.log('Requesting media permissions...');
      
      // First try to get both video and audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('Media permissions granted, stream obtained:', stream);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('Local video element updated with stream:', stream);
        console.log('Video tracks:', stream.getVideoTracks());
        console.log('Audio tracks:', stream.getAudioTracks());
        
        // Force video to play
        localVideoRef.current.play().catch(e => {
          console.error('Error playing local video:', e);
        });
      } else {
        console.warn('Local video ref is null, will be set up in useEffect');
      }
      
      // Reset video/audio states
      setIsVideoOff(false);
      setIsMuted(false);
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Try audio-only if video is denied
      try {
        console.log('Trying audio-only stream...');
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        
        console.log('Audio-only stream obtained');
        setLocalStream(audioStream);
        setIsVideoOff(true);
        
        toast({
          title: "Camera Access Denied",
          description: "Joined with audio only. You can enable video later.",
          variant: "destructive"
        });
        
        return audioStream;
      } catch (audioError) {
        console.error('Error accessing audio:', audioError);
        
        // Show permission help dialog
        setPermissionDenied(true);
        
        toast({
          title: "Media Access Required",
          description: "Please allow camera and microphone access to join the meeting. Check your browser settings.",
          variant: "destructive"
        });
        
        throw new Error('Failed to access camera and microphone. Please check your browser permissions.');
      }
    }
  };

  const joinRoom = async (roomId: string, username: string) => {
    // Emit join room event
    meetingSocket?.emit('join_meeting', { roomId: roomId, username });
    
    // Add current user to participants
    const currentParticipant: Participant = {
      id: meetingSocket?.id || 'local',
      username,
      isHost: isHost,
      isMuted: false,
      isVideoOff: false,
      hasRaisedHand: false
    };
    
    setParticipants([currentParticipant]);
  };

  const leaveMeeting = () => {
    if (meetingSocket) {
      meetingSocket.emit('leave_meeting');
    }
    
    // Clean up media streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    
    // Clean up peer connections
    Object.values(peerConnections).forEach(connection => {
      connection.close();
    });
    setPeerConnections({});
    
    // Reset state
    setIsInMeeting(false);
    setParticipants([]);
    setMessages([]);
    setShowChat(false);
    setShowParticipants(false);
    setIsHost(false);
    setHasRaisedHand(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setRoomId('');
    setUsername('');
    
    // Clear any existing remote videos
    if (remoteVideosRef.current) {
      remoteVideosRef.current.innerHTML = '';
    }
    
    toast({
      title: "Meeting Left",
      description: "You have left the meeting.",
    });
  };

  const createPeerConnection = (userId: string) => {
      const peerConnection = new RTCPeerConnection(rtcConfig);

      // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind, track.enabled);
        peerConnection.addTrack(track, localStream);
        });
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
        meetingSocket?.emit('webrtc-signal', {
          type: 'ice-candidate',
          targetUserId: userId,
          candidate: event.candidate
        });
        }
      };

    // Handle incoming tracks
      peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteVideosRef.current) {
        // Remove any existing video for this user
        const existingContainer = document.getElementById(`remote-container-${userId}`);
        if (existingContainer) {
          existingContainer.remove();
        }
        
        const videoContainer = document.createElement('div');
        videoContainer.id = `remote-container-${userId}`;
        videoContainer.className = 'relative bg-gray-800 rounded-lg overflow-hidden';
        
        const videoElement = document.createElement('video');
        videoElement.id = `remote-${userId}`;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.srcObject = remoteStream;
        videoElement.className = 'w-full h-full object-cover';
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm text-white';
        // Find the participant name from the participants state
        const participant = participants.find(p => p.id === userId);
        nameLabel.textContent = participant?.username || 'Unknown User';
        
        // Add mute/video indicators
        const statusIndicators = document.createElement('div');
        statusIndicators.className = 'absolute top-2 right-2 flex space-x-1';
        
        if (participant?.isMuted) {
          const muteIcon = document.createElement('div');
          muteIcon.className = 'bg-red-500 p-1 rounded';
          muteIcon.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>';
          statusIndicators.appendChild(muteIcon);
        }
        
        if (participant?.isVideoOff) {
          const videoOffIcon = document.createElement('div');
          videoOffIcon.className = 'bg-red-500 p-1 rounded';
          videoOffIcon.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
          statusIndicators.appendChild(videoOffIcon);
        }
        
        if (participant?.hasRaisedHand) {
          const handIcon = document.createElement('div');
          handIcon.className = 'bg-yellow-500 p-1 rounded';
          handIcon.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0012 2.5m-9-3h12m-12 0h12"></path></svg>';
          statusIndicators.appendChild(handIcon);
        }
        
        videoContainer.appendChild(videoElement);
        videoContainer.appendChild(nameLabel);
        videoContainer.appendChild(statusIndicators);
        remoteVideosRef.current.appendChild(videoContainer);
        
        console.log('Remote video added for user:', userId, 'with name:', participant?.username);
        
        // Force video to play
        videoElement.play().catch(e => {
          console.error('Error playing remote video:', e);
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        console.log(`✅ Connected to ${userId}`);
      } else if (peerConnection.connectionState === 'failed') {
        console.log(`❌ Connection failed with ${userId}`);
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${userId}:`, peerConnection.iceConnectionState);
    };
    
    setPeerConnections(prev => ({ ...prev, [userId]: peerConnection }));
    return peerConnection;
  };

  const handleUserConnected = async (userId: string, userName: string) => {
    console.log('User connected:', userId, userName);
    
    // Add to participants
    const newParticipant: Participant = {
      id: userId,
      username: userName,
      isHost: false,
      isMuted: false,
      isVideoOff: false,
      hasRaisedHand: false
    };
    
    setParticipants(prev => [...prev, newParticipant]);
    
    // Create peer connection and send offer
    const peerConnection = createPeerConnection(userId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    meetingSocket?.emit('offer', offer, userId);
  };

  const handleUserDisconnected = (userId: string, userName: string) => {
    console.log('User disconnected:', userId, userName);
    
    // Remove from participants
    setParticipants(prev => prev.filter(p => p.id !== userId));
    
    // Close peer connection
    if (peerConnections[userId]) {
      peerConnections[userId].close();
      setPeerConnections(prev => {
        const newConnections = { ...prev };
        delete newConnections[userId];
        return newConnections;
      });
    }
    
    // Remove video element
    const videoContainer = document.getElementById(`remote-container-${userId}`);
    if (videoContainer) {
      videoContainer.remove();
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, senderId: string) => {
    console.log('Received offer from:', senderId);
    
    let peerConnection = peerConnections[senderId];
    if (!peerConnection) {
      peerConnection = createPeerConnection(senderId);
    }
    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    meetingSocket?.emit('webrtc-signal', {
      type: 'answer',
      targetUserId: senderId,
      answer: answer
    });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, senderId: string) => {
    console.log('Received answer from:', senderId);
    
    const peerConnection = peerConnections[senderId];
      if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, senderId: string) => {
    console.log('Received ICE candidate from:', senderId);
      
    const peerConnection = peerConnections[senderId];
      if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const handleMessage = (data: any) => {
    const newMessage: Message = {
      id: data.id || Date.now().toString(),
      user: data.user,
      text: data.text,
      senderId: data.senderId,
      likes: data.likes || 0,
      timestamp: data.timestamp || Date.now(),
      replyTo: data.replyTo,
      replies: data.replies || []
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const handleUserTyping = (userId: string, isTyping: boolean, userName: string) => {
      if (isTyping) {
      setTypingUsers(prev => [...prev.filter(id => id !== userId), userId]);
      } else {
      setTypingUsers(prev => prev.filter(id => id !== userId));
      }
  };

  const handleUserRaisedHand = (userId: string, hasRaised: boolean, userName: string) => {
    console.log('User raised hand:', userId, hasRaised, userName);
      setParticipants(prev => prev.map(p => 
      p.id === userId ? { ...p, hasRaisedHand: hasRaised } : p
    ));
  };

  const handleHostMuteAll = () => {
    console.log('Host muted all participants');
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        setIsMuted(true);
        toast({
          title: "Muted by Host",
          description: "The host has muted all participants.",
          variant: "destructive"
        });
      }
    }
  };

  const handleRoomInfo = (info: any) => {
    console.log('Room info received:', info);
    setIsHost(info.hostId === meetingSocket?.id);
  };

  const handleEmojiReaction = (messageId: string, emoji: string, userId: string) => {
    console.log('Emoji reaction:', messageId, emoji, userId);
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, likes: msg.likes + 1 } : msg
    ));
  };

  const sendEmojiReaction = (messageId: string, emoji: string) => {
    meetingSocket?.emit('emoji-reaction', { messageId, emoji });
  };

  const handleParticipantUpdate = (userId: string, updates: any) => {
    console.log('Participant update:', userId, updates);
    setParticipants(prev => prev.map(p => 
      p.id === userId ? { ...p, ...updates } : p
    ));
  };

  const handleExistingUser = async (userId: string, userName: string) => {
    console.log('Handling existing user:', userId, userName);
    // Add to participants
    const newParticipant: Participant = {
      id: userId,
      username: userName,
      isHost: false,
      isMuted: false,
      isVideoOff: false,
      hasRaisedHand: false
    };
    setParticipants(prev => [...prev, newParticipant]);

    // Create peer connection and send offer
    const peerConnection = createPeerConnection(userId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    meetingSocket?.emit('offer', offer, userId);
  };

  const sendReply = (messageId: string, replyText: string) => {
    const replyMessage: Message = {
      id: Date.now().toString(),
      user: username,
      text: replyText,
      senderId: meetingSocket?.id || 'local',
      likes: 0,
      timestamp: Date.now(),
      replyTo: messageId,
      replies: []
    };
    setMessages(prev => [...prev, replyMessage]);
    meetingSocket?.emit('meeting_message', { 
      roomId, 
      content: replyText, 
      messageType: 'text',
      replyTo: messageId 
    });
  };


  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMutedState = !audioTrack.enabled;
        setIsMuted(newMutedState);
        
        // Update media state
        meetingSocket?.emit('participant_media_update', {
          roomId,
          isMuted: newMutedState,
          isVideoOff: isVideoOff
        });
        
        console.log('Microphone toggled:', audioTrack.enabled);
        
        toast({
          title: newMutedState ? "Microphone Muted" : "Microphone Unmuted",
          description: newMutedState ? "Your microphone is now muted" : "Your microphone is now active",
        });
      } else {
        console.warn('No audio track found');
        toast({
          title: "Audio Not Available",
          description: "No microphone access available.",
          variant: "destructive"
        });
      }
    } else {
      console.warn('No local stream available');
      toast({
        title: "Stream Not Available",
        description: "Please wait for the stream to initialize.",
        variant: "destructive"
      });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoOffState = !videoTrack.enabled;
        setIsVideoOff(newVideoOffState);
        
        // Update media state
        meetingSocket?.emit('participant_media_update', {
          roomId,
          isMuted: isMuted,
          isVideoOff: newVideoOffState
        });
        
        console.log('Video toggled:', videoTrack.enabled);
        
        toast({
          title: newVideoOffState ? "Camera Turned Off" : "Camera Turned On",
          description: newVideoOffState ? "Your camera is now off" : "Your camera is now active",
        });
      } else {
        console.warn('No video track found');
        toast({
          title: "Camera Not Available",
          description: "No camera access available.",
          variant: "destructive"
        });
      }
    } else {
      console.warn('No local stream available');
      toast({
        title: "Stream Not Available",
        description: "Please wait for the stream to initialize.",
        variant: "destructive"
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        setScreenStream(stream);
        setIsScreenSharing(true);
        
        // Replace video track in all peer connections
        Object.values(peerConnections).forEach(connection => {
          const sender = connection.getSenders().find(s => s.track?.kind === 'video');
          if (sender && stream.getVideoTracks()[0]) {
            sender.replaceTrack(stream.getVideoTracks()[0]);
            console.log('Screen sharing track replaced for peer connection');
          }
        });
        
        // Handle screen share stop
        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
        
        console.log('Screen sharing started');
        toast({
          title: "Screen Sharing Started",
          description: "Your screen is now being shared with all participants.",
        });
      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      if (error.name === 'NotAllowedError') {
      toast({
          title: "Permission Denied",
          description: "Please allow screen sharing when prompted.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Screen Sharing Error",
          description: "Failed to start screen sharing. Please try again.",
        variant: "destructive"
      });
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    
    setIsScreenSharing(false);
    
    // Restore original video track in all peer connections
    if (localStream) {
      Object.values(peerConnections).forEach(connection => {
        const sender = connection.getSenders().find(s => s.track?.kind === 'video');
        if (sender && localStream.getVideoTracks()[0]) {
          sender.replaceTrack(localStream.getVideoTracks()[0]);
          console.log('Original video track restored for peer connection');
        }
      });
    }
    
    toast({
      title: "Screen Sharing Stopped",
      description: "Screen sharing has been stopped.",
    });
  };

  const toggleHandRaise = () => {
    const newRaisedState = !hasRaisedHand;
    setHasRaisedHand(newRaisedState);
    
    // Emit hand raise event
    meetingSocket?.emit('hand_raise', { raised: newRaisedState });
    
    toast({
      title: newRaisedState ? "Hand Raised" : "Hand Lowered",
      description: newRaisedState ? "Your hand is now raised" : "Your hand is now lowered",
    });
  };

  const sendMessage = (replyTo?: string) => {
    const messageText = messageInputRef.current?.value?.trim();
    if (messageText && meetingSocket) {
      const messageData = {
        roomId,
        content: messageText,
        messageType: 'text',
        replyTo: replyTo
      };
      meetingSocket.emit('meeting_message', messageData);
      messageInputRef.current.value = '';
      
      // Clear typing indicator
      setIsTyping(false);
      meetingSocket.emit('typing', false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    meetingSocket?.emit('typing', isTyping);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    } else {
      // Set typing indicator
    if (!isTyping) {
      setIsTyping(true);
        meetingSocket?.emit('typing', true);
    }
    
    // Clear typing indicator after delay
    setTimeout(() => {
      setIsTyping(false);
        meetingSocket?.emit('typing', false);
    }, 1000);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      setPermissionDenied(false);
      await initializeLocalStream();
    toast({
        title: "Permissions Granted!",
        description: "You can now create or join meetings.",
      });
    } catch (error) {
      console.error('Permission request failed:', error);
      setPermissionDenied(true);
    }
  };

  const handleMeetingEndedByHost = () => {
    toast({
      title: "Meeting Ended",
      description: "The host has ended this meeting.",
      variant: "destructive"
    });
    
    // Clean up everything
    leaveMeeting();
    
    // Force redirect to main meeting page
    setTimeout(() => {
      window.location.href = '/meeting';
    }, 2000);
  };

  if (permissionDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <VideoOff className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl text-red-600">Camera/Microphone Access Required</CardTitle>
            <CardDescription>
              To use the meeting functionality, please allow access to your camera and microphone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p className="mb-2"><strong>Chrome/Edge:</strong></p>
              <ol className="list-decimal list-inside mb-4 space-y-1">
                <li>Click the camera icon in the address bar</li>
                <li>Select "Allow" for Camera and Microphone</li>
                <li>Refresh the page</li>
              </ol>
              
              <p className="mb-2"><strong>Firefox:</strong></p>
              <ol className="list-decimal list-inside mb-4 space-y-1">
                <li>Click on the shield icon in the address bar</li>
                <li>Click "Allow" for camera and microphone</li>
                <li>Refresh the page</li>
              </ol>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleRequestPermissions}
                className="flex-1"
              >
                <VideoIcon className="h-4 w-4 mr-2" />
                Try Again
            </Button>
              <Button 
                variant="outline" 
                onClick={() => setPermissionDenied(false)}
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isInMeeting) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
        {/* Meeting Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Meeting Room</h1>
        <div className="flex items-center space-x-2">
              <Badge variant="outline" className="font-mono text-sm bg-blue-600 text-white border-blue-500">
                {roomId}
              </Badge>
          <Button
                onClick={() => {
                  navigator.clipboard.writeText(roomId);
                  toast({
                    title: "Room ID Copied!",
                    description: "Room ID has been copied to clipboard",
                  });
                }}
            size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-blue-600"
              >
                📋
          </Button>
        </div>
            <Badge variant={isHost ? "default" : "secondary"}>
              {isHost ? "Host" : "Participant"}
            </Badge>
          </div>
          <Button onClick={leaveMeeting} variant="destructive">
            <Phone className="h-4 w-4 mr-2" />
            Leave Meeting
          </Button>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
          {/* Video Area */}
        <div className="flex-1 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                  className="w-full h-full object-cover"
              />
              {!localStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <Video className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">Camera loading...</p>
                  </div>
                </div>
              )}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                  {username} (You)
              </div>
              {isMuted && (
                <div className="absolute top-2 right-2 bg-red-500 p-1 rounded">
                  <MicOff className="h-4 w-4" />
                </div>
              )}
              {isVideoOff && (
                <div className="absolute top-2 right-2 bg-red-500 p-1 rounded">
                  <VideoOff className="h-4 w-4" />
                </div>
              )}
            </div>
              
              {/* Remote Videos */}
              <div ref={remoteVideosRef} className="contents">
                {/* Remote videos will be added here dynamically */}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setShowChat(true)}
                className={`flex-1 p-3 text-center ${showChat ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              >
                <MessageSquare className="h-4 w-4 mx-auto mb-1" />
                Chat
              </button>
              <button
                onClick={() => setShowParticipants(true)}
                className={`flex-1 p-3 text-center ${showParticipants ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              >
                <Users className="h-4 w-4 mx-auto mb-1" />
                Participants ({participants.length})
              </button>
              </div>
              
            {/* Chat Panel */}
          {showChat && (
            <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-2" ref={chatContainerRef}>
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded ${
                        message.senderId === (meetingSocket?.id || 'local')
                          ? 'bg-blue-600 ml-8'
                          : 'bg-gray-700 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-200">{message.user}</div>
                        <div className="text-xs text-gray-300">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="mb-2">{message.text}</div>
                      {message.replyTo && (
                        <div className="text-xs text-gray-300 mb-2">
                          Replying to: {messages.find(m => m.id === message.replyTo)?.user || 'Unknown'}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-1">
                <Button
                            onClick={() => sendEmojiReaction(message.id, '👍')}
                            size="sm"
                  variant="ghost"
                            className="h-6 w-6 p-0 text-xs"
                          >
                            👍
                          </Button>
                          <Button
                            onClick={() => sendEmojiReaction(message.id, '❤️')}
                  size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-xs"
                          >
                            ❤️
                          </Button>
                          <Button
                            onClick={() => sendEmojiReaction(message.id, '😂')}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-xs"
                          >
                            😂
                </Button>
              </div>
                        <div className="flex items-center space-x-2">
                          {message.likes > 0 && (
                            <span className="text-xs text-gray-300">❤️ {message.likes}</span>
                          )}
                          <Button
                            onClick={() => {
                              const replyText = prompt('Type your reply:');
                              if (replyText) sendReply(message.id, replyText);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                          >
                            Reply
                          </Button>
                    </div>
                  </div>
                    </div>
                  ))
                )}
                {typingUsers.length > 0 && (
                  <div className="text-sm text-gray-400 italic">
                      {typingUsers.join(', ')} typing...
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-700 bg-gray-700">
                <div className="flex space-x-2">
                  <Input
                      ref={messageInputRef}
                    placeholder="Type a message..."
                      onKeyPress={handleKeyPress}
                      className="flex-1 bg-gray-600 border-gray-500 text-white placeholder-gray-300"
                  />
                  <Button onClick={() => sendMessage()} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

            {/* Participants Panel */}
          {showParticipants && (
              <div className="h-full overflow-y-auto p-4">
                <div className="mb-4 p-3 bg-gray-700 rounded">
                  <h3 className="font-semibold text-lg mb-2">Participants ({participants.length})</h3>
                  <p className="text-sm text-gray-300">All users currently in this meeting</p>
                </div>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                    >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        {participant.username.charAt(0).toUpperCase()}
              </div>
                      <div>
                        <span className="font-medium">{participant.username}</span>
                        {participant.isHost && (
                          <Badge variant="default" className="ml-2 text-xs">Host</Badge>
                        )}
                  </div>
                  </div>
                    <div className="flex items-center space-x-2">
                        {participant.hasRaisedHand && (
                          <div className="bg-yellow-500 p-1 rounded" title="Hand Raised">
                            <Hand className="h-4 w-4 text-white" />
                    </div>
                        )}
                        {participant.isMuted && (
                          <div className="bg-red-500 p-1 rounded" title="Muted">
                            <MicOff className="h-4 w-4 text-white" />
                          </div>
                        )}
                        {participant.isVideoOff && (
                          <div className="bg-red-500 p-1 rounded" title="Video Off">
                            <VideoOff className="h-4 w-4 text-white" />
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full p-2 flex items-center space-x-2">
          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "secondary"}
            size="sm"
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          
          <Button
            onClick={toggleVideo}
            variant={isVideoOff ? "destructive" : "secondary"}
            size="sm"
          >
            {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>
          
          <Button
            onClick={toggleScreenShare}
            variant={isScreenSharing ? "default" : "secondary"}
            size="sm"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={toggleHandRaise}
            variant={hasRaisedHand ? "default" : "secondary"}
            size="sm"
          >
            <Hand className="h-4 w-4" />
          </Button>
          
          {isHost && (
            <div className="flex space-x-2">
          <Button
                onClick={() => meetingSocket?.emit('host_mute_all')}
                variant="secondary"
            size="sm"
          >
                <MicOff className="h-4 w-4" />
                Mute All
          </Button>
          <Button
                onClick={() => meetingSocket?.emit('host-end-meeting')}
                variant="destructive"
            size="sm"
          >
                <X className="h-4 w-4" />
                End Meeting
          </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

    return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Meeting Interface */}
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">InspiraNet</CardTitle>
            <CardDescription>
              Real-time video conferencing platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Your Name</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="roomId">Room ID (for joining existing meetings)</Label>
              <Input
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID to join existing meeting"
              />
            </div>
            
            <div className="flex space-x-2">
          <Button
                onClick={handleCreateMeeting}
                disabled={!username.trim()}
                className="flex-1"
                size="lg"
              >
                <Video className="h-4 w-4 mr-2" />
                Create Meeting
          </Button>
          
          <Button
                onClick={handleJoinExistingMeeting}
                disabled={isJoining || !username.trim() || !roomId.trim()}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                {isJoining ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Joining...
        </div>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Join Meeting
                  </>
                )}
          </Button>
        </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
