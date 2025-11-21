const { v4: uuidv4 } = require('uuid');
const mediasoup = require('mediasoup');

class MeetingService {
    constructor() {
        this.activeMeetings = new Map();
        this.workers = [];
        this.routers = new Map();
    }

    // Initialize MediaSoup workers
    async initializeMediaSoup() {
        try {
            console.log('🔄 Initializing MediaSoup workers...');

            const worker = await mediasoup.createWorker({
                logLevel: 'warn',
                rtcMinPort: 40000,
                rtcMaxPort: 49999
            });

            worker.on('died', () => {
                console.error('❌ MediaSoup worker died, exiting...');
                process.exit(1);
            });

            this.workers.push(worker);

            const router = await worker.createRouter({
                mediaCodecs: [
                    {
                        kind: 'audio',
                        mimeType: 'audio/opus',
                        clockRate: 48000,
                        channels: 2
                    },
                    {
                        kind: 'video',
                        mimeType: 'video/VP8',
                        clockRate: 90000,
                        parameters: {
                            'x-google-start-bitrate': 1000
                        }
                    },
                    {
                        kind: 'video',
                        mimeType: 'video/H264',
                        clockRate: 90000,
                        parameters: {
                            'packetization-mode': 1,
                            'profile-level-id': '42e01f',
                            'level-asymmetry-allowed': 1
                        }
                    }
                ]
            });

            this.routers.set(worker.pid, router);
            console.log('✅ MediaSoup worker and router initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize MediaSoup:', error);
            throw error;
        }
    }

    // Create a new meeting
    async createMeeting(meetingData) {
        try {
            const meetingId = uuidv4();
            const worker = this.workers[0]; // Use first worker for now
            const router = this.routers.get(worker.pid);

            if (!router) {
                throw new Error('Router not available');
            }

            // Create WebRTC transport for the meeting
            const transport = await router.createWebRtcTransport({
                listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.SERVER_IP || 'localhost' }],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
                initialAvailableOutgoingBitrate: 1000000
            });

            const meeting = {
                id: meetingId,
                ...meetingData,
                participants: new Map(),
                producers: new Map(),
                consumers: new Map(),
                transport,
                router,
                createdAt: new Date(),
                status: 'active'
            };

            this.activeMeetings.set(meetingId, meeting);
            console.log(`✅ Created meeting ${meetingId} with MediaSoup transport`);

            return meeting;
        } catch (error) {
            console.error('❌ Failed to create meeting:', error);
            throw error;
        }
    }

    // Join a meeting
    async joinMeeting(meetingId, userData) {
        try {
            const meeting = this.activeMeetings.get(meetingId);
            if (!meeting) {
                throw new Error('Meeting not found');
            }

            const participantId = uuidv4();
            const participant = {
                id: participantId,
                ...userData,
                joinTime: new Date(),
                streams: new Map(),
                producers: new Map(),
                consumers: new Map()
            };

            meeting.participants.set(participantId, participant);
            console.log(`✅ Participant ${participantId} joined meeting ${meetingId}`);

            return {
                meeting: this.sanitizeMeeting(meeting),
                participant,
                connectionParams: await this.generateConnectionParams(meeting, participant)
            };
        } catch (error) {
            console.error('❌ Failed to join meeting:', error);
            throw error;
        }
    }

    // Generate connection parameters for client
    async generateConnectionParams(meeting, participant) {
        try {
            const transport = meeting.transport;

            // Create producer transport for the participant
            const producerTransport = await meeting.router.createWebRtcTransport({
                listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.SERVER_IP || 'localhost' }],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true
            });

            // Create consumer transport for the participant
            const consumerTransport = await meeting.router.createWebRtcTransport({
                listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.SERVER_IP || 'localhost' }],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true
            });

            return {
                producerTransport: {
                    id: producerTransport.id,
                    iceParameters: producerTransport.iceParameters,
                    iceCandidates: producerTransport.iceCandidates,
                    dtlsParameters: producerTransport.dtlsParameters
                },
                consumerTransport: {
                    id: consumerTransport.id,
                    iceParameters: consumerTransport.iceParameters,
                    iceCandidates: consumerTransport.iceCandidates,
                    dtlsParameters: consumerTransport.dtlsParameters
                },
                routerRtpCapabilities: meeting.router.rtpCapabilities
            };
        } catch (error) {
            console.error('❌ Failed to generate connection params:', error);
            throw error;
        }
    }

    // Handle WebRTC signaling
    async handleSignaling(participantId, meetingId, message) {
        try {
            const meeting = this.activeMeetings.get(meetingId);
            const participant = meeting.participants.get(participantId);

            if (!participant) {
                throw new Error('Participant not found');
            }

            switch (message.type) {
                case 'connect_producer':
                    return await this.handleConnectProducer(participant, meeting, message);
                case 'connect_consumer':
                    return await this.handleConnectConsumer(participant, meeting, message);
                case 'produce':
                    return await this.handleProduce(participant, meeting, message);
                case 'consume':
                    return await this.handleConsume(participant, meeting, message);
                case 'pause_producer':
                    return await this.handlePauseProducer(participant, message);
                case 'resume_producer':
                    return await this.handleResumeProducer(participant, message);
                case 'close_producer':
                    return await this.handleCloseProducer(participant, message);
                default:
                    throw new Error(`Unknown signaling type: ${message.type}`);
            }
        } catch (error) {
            console.error('❌ Signaling error:', error);
            throw error;
        }
    }

    // Handle producer connection
    async handleConnectProducer(participant, meeting, message) {
        try {
            const transport = meeting.transport;
            await transport.connect({
                dtlsParameters: message.dtlsParameters
            });

            participant.producerTransport = transport;
            console.log(`✅ Producer transport connected for participant ${participant.id}`);
        } catch (error) {
            console.error('❌ Failed to connect producer transport:', error);
            throw error;
        }
    }

    // Handle consumer connection
    async handleConnectConsumer(participant, meeting, message) {
        try {
            // In a real implementation, you'd have separate consumer transports
            // For simplicity, we're using the same transport
            const transport = meeting.transport;
            await transport.connect({
                dtlsParameters: message.dtlsParameters
            });

            participant.consumerTransport = transport;
            console.log(`✅ Consumer transport connected for participant ${participant.id}`);
        } catch (error) {
            console.error('❌ Failed to connect consumer transport:', error);
            throw error;
        }
    }

    // Handle produce (start producing media)
    async handleProduce(participant, meeting, message) {
        try {
            const transport = meeting.transport;
            const producer = await transport.produce({
                kind: message.kind,
                rtpParameters: message.rtpParameters
            });

            participant.producers.set(producer.id, producer);
            meeting.producers.set(producer.id, producer);

            // Notify other participants about new producer
            this.notifyParticipants(meeting.id, {
                action: 'new_producer',
                data: {
                    producerId: producer.id,
                    participantId: participant.id,
                    kind: message.kind
                }
            }, participant.id);

            console.log(`✅ Producer created: ${producer.id} for participant ${participant.id}`);
            return { id: producer.id };
        } catch (error) {
            console.error('❌ Failed to create producer:', error);
            throw error;
        }
    }

    // Handle consume (start consuming media)
    async handleConsume(participant, meeting, message) {
        try {
            const producer = meeting.producers.get(message.producerId);
            if (!producer) {
                throw new Error('Producer not found');
            }

            const transport = meeting.transport;
            const consumer = await transport.consume({
                producerId: producer.id,
                rtpCapabilities: message.rtpCapabilities
            });

            participant.consumers.set(consumer.id, consumer);
            meeting.consumers.set(consumer.id, consumer);

            console.log(`✅ Consumer created: ${consumer.id} for participant ${participant.id}`);
            return {
                id: consumer.id,
                producerId: producer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters
            };
        } catch (error) {
            console.error('❌ Failed to create consumer:', error);
            throw error;
        }
    }

    // Handle pause producer
    async handlePauseProducer(participant, message) {
        try {
            const producer = participant.producers.get(message.producerId);
            if (producer) {
                await producer.pause();
                console.log(`⏸️ Producer paused: ${message.producerId}`);
            }
        } catch (error) {
            console.error('❌ Failed to pause producer:', error);
            throw error;
        }
    }

    // Handle resume producer
    async handleResumeProducer(participant, message) {
        try {
            const producer = participant.producers.get(message.producerId);
            if (producer) {
                await producer.resume();
                console.log(`▶️ Producer resumed: ${message.producerId}`);
            }
        } catch (error) {
            console.error('❌ Failed to resume producer:', error);
            throw error;
        }
    }

    // Handle close producer
    async handleCloseProducer(participant, message) {
        try {
            const producer = participant.producers.get(message.producerId);
            if (producer) {
                await producer.close();
                participant.producers.delete(message.producerId);
                console.log(`🗑️ Producer closed: ${message.producerId}`);
            }
        } catch (error) {
            console.error('❌ Failed to close producer:', error);
            throw error;
        }
    }

    // Get ICE servers configuration
    getIceServers() {
        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ];

        // Add TURN servers if configured
        if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
            iceServers.push({
                urls: process.env.TURN_URL,
                username: process.env.TURN_USERNAME,
                credential: process.env.TURN_PASSWORD
            });
        }

        return iceServers;
    }

    // Notify participants about events
    notifyParticipants(meetingId, message, excludeParticipantId = null) {
        const meeting = this.activeMeetings.get(meetingId);
        if (!meeting) return;

        meeting.participants.forEach((participant, participantId) => {
            if (participantId !== excludeParticipantId) {
                // In a real implementation, you'd send this through WebSocket
                // For now, we'll just log it
                console.log(`📢 Notifying participant ${participantId}:`, message);
            }
        });
    }

    // Sanitize meeting data for client
    sanitizeMeeting(meeting) {
        return {
            id: meeting.id,
            title: meeting.title,
            hostId: meeting.hostId,
            status: meeting.status,
            participantCount: meeting.participants.size,
            createdAt: meeting.createdAt
        };
    }

    // Clean up meeting
    async cleanupMeeting(meetingId) {
        try {
            const meeting = this.activeMeetings.get(meetingId);
            if (!meeting) return;

            // Close all transports
            if (meeting.transport) {
                await meeting.transport.close();
            }

            // Close all producers
            for (const producer of meeting.producers.values()) {
                await producer.close();
            }

            // Close all consumers
            for (const consumer of meeting.consumers.values()) {
                await consumer.close();
            }

            this.activeMeetings.delete(meetingId);
            console.log(`🧹 Cleaned up meeting ${meetingId}`);
        } catch (error) {
            console.error(`❌ Failed to cleanup meeting ${meetingId}:`, error);
        }
    }

    // Get meeting statistics
    getMeetingStats(meetingId) {
        const meeting = this.activeMeetings.get(meetingId);
        if (!meeting) return null;

        return {
            id: meeting.id,
            participantCount: meeting.participants.size,
            producerCount: meeting.producers.size,
            consumerCount: meeting.consumers.size,
            status: meeting.status,
            createdAt: meeting.createdAt
        };
    }
}

module.exports = MeetingService;
