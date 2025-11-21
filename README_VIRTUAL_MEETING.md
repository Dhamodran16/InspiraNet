# Virtual Meeting System - Complete Implementation

A comprehensive Google Meet-like virtual meeting system built with Node.js, MediaSoup, React, and MongoDB. This implementation provides real-time video/audio communication, screen sharing, chat, and meeting management features.

## 🚀 Features

### Core Features
- ✅ **Real-time Video/Audio Communication** - WebRTC with MediaSoup SFU
- ✅ **Screen Sharing** - High-quality screen sharing with audio
- ✅ **Chat System** - Real-time messaging during meetings
- ✅ **Meeting Management** - Host controls, participant management
- ✅ **Hand Raising** - Participant interaction features
- ✅ **Emoji Reactions** - Interactive meeting engagement
- ✅ **Recording Support** - Meeting recording capabilities
- ✅ **Mobile Responsive** - Works on all devices

### Advanced Features
- ✅ **MediaSoup SFU** - Scalable Selective Forwarding Unit
- ✅ **TURN Server Support** - NAT traversal for all networks
- ✅ **Docker Deployment** - Production-ready containerization
- ✅ **Monitoring & Analytics** - Prometheus and Grafana integration
- ✅ **Security Features** - JWT authentication, rate limiting
- ✅ **Scalable Architecture** - Microservices design

## 🏗️ Architecture

```
Frontend (React/WebRTC) ↔ Nginx Proxy ↔ Backend (Node.js/MediaSoup)
                                ↕
                    WebSocket Signaling ↔ Redis Cache
                                ↕
                          MongoDB Database ↔ TURN Server
```

### Technology Stack

#### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MediaSoup** - SFU for WebRTC
- **Socket.IO** - WebSocket signaling
- **MongoDB** - NoSQL database
- **Redis** - Session management
- **JWT** - Authentication
- **Docker** - Containerization

#### Frontend
- **React** - UI framework
- **WebRTC** - Real-time communication
- **MediaSoup Client** - WebRTC client
- **Material-UI** - UI components
- **Nginx** - Reverse proxy

## 📋 Prerequisites

- Node.js 18+
- MongoDB 6.0+
- Redis 7+
- Docker & Docker Compose
- TURN server (optional but recommended)

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd virtual-meeting-system
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Environment Configuration

#### Backend (.env)
```env
NODE_ENV=production
PORT=3000
WS_PORT=8080
SERVER_IP=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/virtual_meeting

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Redis
REDIS_URL=redis://localhost:6379

# TURN Server
TURN_URL=turn:your-turn-server:3478
TURN_USERNAME=mediasoup
TURN_PASSWORD=mediasoup123

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:8080
REACT_APP_ENVIRONMENT=development
```

## 🚀 Deployment

### Development
```bash
# Backend
cd backend
npm run dev

# Frontend (new terminal)
cd frontend
npm start
```

### Production with Docker
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production with SSL
```bash
# Generate SSL certificates
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes

# Start with SSL
docker-compose -f docker-compose.ssl.yml up -d
```

## 📚 API Documentation

### Authentication
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

### Meetings
```http
GET    /api/meetings              # Get user meetings
POST   /api/meetings              # Create meeting
GET    /api/meetings/:id          # Get meeting details
PUT    /api/meetings/:id          # Update meeting
DELETE /api/meetings/:id          # Delete meeting
```

### WebSocket Events

#### Client to Server
```javascript
// Authentication
socket.emit('authenticate', { token: 'jwt-token' });

// Meeting Operations
socket.emit('create-meeting', meetingData);
socket.emit('join-meeting', { roomId, username });
socket.emit('leave-meeting');

// MediaSoup Signaling
socket.emit('connect_producer', { dtlsParameters });
socket.emit('connect_consumer', { dtlsParameters });
socket.emit('produce', { kind, rtpParameters });
socket.emit('consume', { producerId, rtpCapabilities });

// Meeting Controls
socket.emit('meeting-message', { content, messageType });
socket.emit('media-state-update', { audioEnabled, videoEnabled });
socket.emit('raise-hand', { raised: true });
socket.emit('host-mute-all');
```

#### Server to Client
```javascript
// Meeting Events
socket.on('meeting-joined', meetingData);
socket.on('user-joined', participantData);
socket.on('user-left', participantData);
socket.on('meeting-message', messageData);

// MediaSoup Events
socket.on('mediasoup-params', connectionParams);
socket.on('producer-created', { producerId });
socket.on('consumer-created', consumerData);
socket.on('new-producer', producerData);
```

## 🔧 Configuration

### MediaSoup Settings
```javascript
// mediasoup.config.js
module.exports = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: 'warn'
  },
  router: {
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
        clockRate: 90000
      }
    ]
  },
  webRtcTransport: {
    listenIps: [{ ip: '0.0.0.0' }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true
  }
};
```

### TURN Server Setup
```bash
# Install coturn
sudo apt install coturn

# Configure coturn
sudo nano /etc/turnserver.conf

# Add to configuration
realm=your-domain.com
user=mediasoup:mediasoup123
```

## 🔒 Security Features

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Session management with Redis
- Rate limiting on API endpoints

### Authorization
- Role-based access control (Host/Participant)
- Meeting password protection
- Participant permissions

### Network Security
- CORS configuration
- Helmet security headers
- Input validation and sanitization
- DDoS protection with rate limiting

## 📊 Monitoring

### Prometheus Metrics
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

### Grafana Dashboards
- System performance metrics
- Meeting analytics
- User engagement statistics
- Error tracking and alerts

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test

# Test coverage
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Add more backend instances
docker-compose scale backend=3

# Load balancing
docker-compose -f docker-compose.swarm.yml up
```

### Database Scaling
```yaml
# MongoDB sharding
sharding:
  enabled: true
  configServerReplicaSet:
    name: cfgrs
  shards:
    - name: shard1
    - name: shard2
```

## 🚨 Troubleshooting

### Common Issues

#### WebRTC Connection Issues
```bash
# Check MediaSoup logs
docker-compose logs mediasoup

# Verify TURN server
telnet your-turn-server 3478

# Check firewall settings
sudo ufw allow 40000:49999/udp
```

#### Audio/Video Issues
```bash
# Check browser permissions
# Verify MediaSoup codecs
# Test network connectivity
```

#### Performance Issues
```bash
# Monitor system resources
docker stats

# Check Redis performance
redis-cli info

# Optimize MongoDB queries
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@virtualmeeting.com or join our Slack channel.

## 🔄 Changelog

### v1.0.0 (Latest)
- ✅ Complete MediaSoup SFU implementation
- ✅ Enhanced UI with Material Design
- ✅ Docker production deployment
- ✅ Monitoring and analytics
- ✅ Security enhancements

### v0.9.0
- ✅ Basic WebRTC implementation
- ✅ Meeting management features
- ✅ Chat system
- ✅ Screen sharing

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Meeting recording and playback
- [ ] Advanced analytics dashboard
- [ ] Integration with calendar systems
- [ ] AI-powered meeting insights
- [ ] Virtual backgrounds
- [ ] Breakout rooms
- [ ] Live streaming
- [ ] Internationalization (i18n)
- [ ] Advanced moderation tools

---

**Made with ❤️ for the developer community**

For more information, visit our [documentation](docs/) or [API reference](api-docs/).
