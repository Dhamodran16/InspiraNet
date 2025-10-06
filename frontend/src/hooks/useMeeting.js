import { useState, useRef, useEffect, useCallback } from 'react';

export const useMeeting = () => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);

    const ws = useRef(null);
    const localVideoRef = useRef();
    const screenStream = useRef(null);
    const device = useRef(null);
    const sendTransport = useRef(null);
    const recvTransport = useRef(null);
    const producers = useRef(new Map());
    const consumers = useRef(new Map());

    // Initialize MediaSoup device
    const initializeDevice = useCallback(async () => {
        try {
            device.current = new mediasoup.Device();
            console.log('✅ MediaSoup device created');
        } catch (error) {
            console.error('❌ Failed to create MediaSoup device:', error);
            setError('Failed to initialize media device');
        }
    }, []);

    // Connect to WebSocket
    const connectWebSocket = useCallback(async (meetingId, userData) => {
        try {
            ws.current = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:8080');

            await new Promise((resolve, reject) => {
                ws.current.onopen = resolve;
                ws.current.onerror = reject;
                ws.current.onclose = () => {
                    console.log('🔌 WebSocket disconnected');
                    setIsConnected(false);
                };
            });

            // Authenticate
            ws.current.send(JSON.stringify({
                type: 'authenticate',
                token: localStorage.getItem('token')
            }));

            // Join meeting
            ws.current.send(JSON.stringify({
                type: 'join_meeting',
                roomId: meetingId,
                username: userData.username
            }));

            // Set up message handlers
            ws.current.onmessage = handleSignalingMessage;

            setIsConnected(true);
            console.log('✅ WebSocket connected and meeting joined');
        } catch (error) {
            console.error('❌ Failed to connect WebSocket:', error);
            setError('Failed to connect to meeting server');
        }
    }, []);

    // Handle signaling messages
    const handleSignalingMessage = useCallback(async (event) => {
        try {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'mediasoup_params':
                    await handleMediaSoupParams(message.data);
                    break;
                case 'room_info':
                    setParticipants(message.data.participants);
                    setMessages(message.data.messages);
                    break;
                case 'user_joined':
                    setParticipants(prev => [...prev, message.data]);
                    break;
                case 'user_left':
                    setParticipants(prev => prev.filter(p => p.userId !== message.data.userId));
                    break;
                case 'new_producer':
                    await handleNewProducer(message.data);
                    break;
                case 'meeting_message':
                    setMessages(prev => [...prev, message.data]);
                    break;
                case 'participant_media_update':
                    setParticipants(prev =>
                        prev.map(p =>
                            p.userId === message.data.userId
                                ? { ...p, ...message.data }
                                : p
                        )
                    );
                    break;
                case 'meeting_error':
                    setError(message.data.message);
                    break;
                default:
                    console.log('Unhandled message type:', message.type);
            }
        } catch (error) {
            console.error('❌ Error handling signaling message:', error);
        }
    }, []);

    // Handle MediaSoup parameters
    const handleMediaSoupParams = useCallback(async (params) => {
        try {
            await device.current.load({
                routerRtpCapabilities: params.routerRtpCapabilities
            });

            // Create send transport
            sendTransport.current = device.current.createSendTransport({
                id: params.transport.id,
                iceParameters: params.transport.iceParameters,
                iceCandidates: params.transport.iceCandidates,
                dtlsParameters: params.transport.dtlsParameters
            });

            sendTransport.current.on('connect', ({ dtlsParameters }, callback, errback) => {
                ws.current.send(JSON.stringify({
                    type: 'connect_producer',
                    dtlsParameters
                }));

                sendTransport.current.on('connectionstatechange', (state) => {
                    console.log('Send transport state:', state);
                });

                callback();
            });

            sendTransport.current.on('produce', async (parameters, callback, errback) => {
                try {
                    ws.current.send(JSON.stringify({
                        type: 'produce',
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters
                    }));

                    // Wait for response
                    const response = await new Promise((resolve) => {
                        const handler = (event) => {
                            const msg = JSON.parse(event.data);
                            if (msg.type === 'producer_created') {
                                ws.current.removeEventListener('message', handler);
                                resolve(msg.data);
                            }
                        };
                        ws.current.addEventListener('message', handler);
                    });

                    callback({ id: response.producerId });
                } catch (error) {
                    errback(error);
                }
            });

            // Create receive transport
            recvTransport.current = device.current.createRecvTransport({
                id: params.transport.id,
                iceParameters: params.transport.iceParameters,
                iceCandidates: params.transport.iceCandidates,
                dtlsParameters: params.transport.dtlsParameters
            });

            recvTransport.current.on('connect', ({ dtlsParameters }, callback, errback) => {
                ws.current.send(JSON.stringify({
                    type: 'connect_consumer',
                    dtlsParameters
                }));

                recvTransport.current.on('connectionstatechange', (state) => {
                    console.log('Receive transport state:', state);
                });

                callback();
            });

            console.log('✅ MediaSoup transports created');
        } catch (error) {
            console.error('❌ Failed to handle MediaSoup params:', error);
            setError('Failed to initialize media transport');
        }
    }, []);

    // Handle new producer
    const handleNewProducer = useCallback(async (producerData) => {
        try {
            if (!recvTransport.current) return;

            ws.current.send(JSON.stringify({
                type: 'consume',
                producerId: producerData.producerId,
                rtpCapabilities: device.current.rtpCapabilities
            }));

            // Wait for consumer creation response
            const response = await new Promise((resolve) => {
                const handler = (event) => {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'consumer_created') {
                        ws.current.removeEventListener('message', handler);
                        resolve(msg.data);
                    }
                };
                ws.current.addEventListener('message', handler);
            });

            const consumer = await recvTransport.current.consume({
                id: response.consumerId,
                producerId: response.producerId,
                kind: response.kind,
                rtpParameters: response.rtpParameters
            });

            consumers.current.set(response.consumerId, consumer);

            // Resume consumer
            await consumer.resume();

            // Get stream from consumer
            const stream = new MediaStream();
            stream.addTrack(consumer.track);

            setRemoteStreams(prev => new Map(prev.set(producerData.userId, stream)));

            console.log(`✅ Consumer created for producer ${producerData.producerId}`);
        } catch (error) {
            console.error('❌ Failed to handle new producer:', error);
        }
    }, []);

    // Get user media
    const getUserMedia = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            console.log('✅ Local media stream obtained');
            return stream;
        } catch (error) {
            console.error('❌ Failed to get user media:', error);
            setError('Failed to access camera and microphone');
            throw error;
        }
    }, []);

    // Start producing media
    const startProducing = useCallback(async (stream) => {
        try {
            if (!sendTransport.current) {
                throw new Error('Send transport not available');
            }

            // Produce audio
            if (stream.getAudioTracks().length > 0) {
                const audioProducer = await sendTransport.current.produce({
                    track: stream.getAudioTracks()[0]
                });

                producers.current.set('audio', audioProducer);
                console.log('✅ Audio producer created');
            }

            // Produce video
            if (stream.getVideoTracks().length > 0) {
                const videoProducer = await sendTransport.current.produce({
                    track: stream.getVideoTracks()[0]
                });

                producers.current.set('video', videoProducer);
                console.log('✅ Video producer created');
            }
        } catch (error) {
            console.error('❌ Failed to start producing:', error);
            setError('Failed to start media production');
        }
    }, []);

    // Toggle audio
    const toggleAudio = useCallback(async () => {
        try {
            if (localStream) {
                const audioTrack = localStream.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = !audioTrack.enabled;
                    setIsAudioEnabled(audioTrack.enabled);

                    // Update server
                    ws.current?.send(JSON.stringify({
                        type: 'media_state_update',
                        audioEnabled: audioTrack.enabled,
                        videoEnabled: isVideoEnabled
                    }));
                }
            }
        } catch (error) {
            console.error('❌ Failed to toggle audio:', error);
        }
    }, [localStream, isVideoEnabled]);

    // Toggle video
    const toggleVideo = useCallback(async () => {
        try {
            if (localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = !videoTrack.enabled;
                    setIsVideoEnabled(videoTrack.enabled);

                    // Update server
                    ws.current?.send(JSON.stringify({
                        type: 'media_state_update',
                        audioEnabled: isAudioEnabled,
                        videoEnabled: videoTrack.enabled
                    }));
                }
            }
        } catch (error) {
            console.error('❌ Failed to toggle video:', error);
        }
    }, [localStream, isAudioEnabled]);

    // Start screen sharing
    const startScreenShare = useCallback(async () => {
        try {
            if (isScreenSharing) return;

            screenStream.current = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            setIsScreenSharing(true);

            // Replace video track in existing producers
            if (producers.current.has('video')) {
                const videoProducer = producers.current.get('video');
                await videoProducer.replaceTrack(screenStream.current.getVideoTracks()[0]);
            }

            // Handle screen share end
            screenStream.current.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

            console.log('✅ Screen sharing started');
        } catch (error) {
            console.error('❌ Failed to start screen sharing:', error);
            setError('Failed to start screen sharing');
        }
    }, [isScreenSharing]);

    // Stop screen sharing
    const stopScreenShare = useCallback(async () => {
        try {
            if (!screenStream.current) return;

            screenStream.current.getTracks().forEach(track => track.stop());
            screenStream.current = null;

            // Switch back to camera
            if (localStream && producers.current.has('video')) {
                const videoProducer = producers.current.get('video');
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) {
                    await videoProducer.replaceTrack(videoTrack);
                }
            }

            setIsScreenSharing(false);
            console.log('✅ Screen sharing stopped');
        } catch (error) {
            console.error('❌ Failed to stop screen sharing:', error);
        }
    }, [localStream]);

    // Send chat message
    const sendMessage = useCallback((content, messageType = 'text') => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'meeting_message',
                content,
                messageType
            }));
        }
    }, []);

    // Raise hand
    const raiseHand = useCallback((raised = true) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'raise_hand',
                raised
            }));
        }
    }, []);

    // Initialize meeting
    const initializeMeeting = useCallback(async (meetingId, userData) => {
        try {
            setError(null);

            // Initialize MediaSoup device
            await initializeDevice();

            // Connect WebSocket
            await connectWebSocket(meetingId, userData);

            // Get user media
            const stream = await getUserMedia();

            // Wait for MediaSoup parameters
            await new Promise((resolve) => {
                const handler = (event) => {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'mediasoup_params') {
                        ws.current.removeEventListener('message', handler);
                        resolve();
                    }
                };
                ws.current.addEventListener('message', handler);
            });

            // Start producing media
            await startProducing(stream);

            console.log('✅ Meeting initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize meeting:', error);
            setError('Failed to initialize meeting');
        }
    }, [initializeDevice, connectWebSocket, getUserMedia, startProducing]);

    // Leave meeting
    const leaveMeeting = useCallback(() => {
        try {
            if (ws.current) {
                ws.current.send(JSON.stringify({ type: 'leave_meeting' }));
                ws.current.close();
            }

            // Stop all tracks
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            if (screenStream.current) {
                screenStream.current.getTracks().forEach(track => track.stop());
            }

            // Close transports
            if (sendTransport.current) {
                sendTransport.current.close();
            }

            if (recvTransport.current) {
                recvTransport.current.close();
            }

            // Clean up
            producers.current.clear();
            consumers.current.clear();
            setLocalStream(null);
            setRemoteStreams(new Map());
            setParticipants([]);
            setMessages([]);
            setIsConnected(false);
            setIsScreenSharing(false);

            console.log('✅ Left meeting successfully');
        } catch (error) {
            console.error('❌ Error leaving meeting:', error);
        }
    }, [localStream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            leaveMeeting();
        };
    }, [leaveMeeting]);

    return {
        // State
        localStream,
        remoteStreams,
        participants,
        messages,
        isConnected,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        error,

        // Refs
        localVideoRef,

        // Methods
        initializeMeeting,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        sendMessage,
        raiseHand,
        leaveMeeting
    };
};
