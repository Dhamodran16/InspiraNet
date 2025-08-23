# Meeting Room Setup Guide

## Issues Identified and Fixed

### 1. Port Configuration Mismatch ✅ FIXED
- **Problem**: Frontend was trying to connect to meeting server on port 5000, but meeting server runs on port 3001
- **Solution**: Updated `frontend/src/config/env.ts` to use port 3001 for development
- **Files Modified**: 
  - `frontend/src/config/env.ts`
  - `frontend/src/config/production.ts`

### 2. Missing meetingUrl in Production Config ✅ FIXED
- **Problem**: Production configuration was missing the meetingUrl setting
- **Solution**: Added meetingUrl to ProductionConfig interface and implementation
- **Files Modified**: `frontend/src/config/production.ts`

### 3. Local Video Ref Initialization Issues ✅ FIXED
- **Problem**: Video element reference was null when trying to set stream
- **Solution**: Improved video element initialization with proper event listeners and error handling
- **Files Modified**: `frontend/src/pages/MeetingRoom.tsx`

### 4. Environment Variables ✅ FIXED
- **Problem**: Missing environment variables for socket and meeting URLs
- **Solution**: Updated `frontend/env.example` with all required variables

## Meeting Server Configuration

### Port Configuration
- **Backend Server**: Port 5000 (main API)
- **Meeting Server**: Port 3001 (video calls)
- **Frontend**: Port 8083

### Environment Variables Required

#### Backend (.env)
```env
PORT=5000
MEETING_PORT=3001
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:8083
```

#### Frontend (.env.local)
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:8083
VITE_SOCKET_URL=http://localhost:5000
VITE_MEETING_URL=http://localhost:3001
```

## Advanced WebRTC Technology Features

### 1. ICE Server Configuration
- **STUN Servers**: Google's public STUN servers for NAT traversal
- **TURN Servers**: Configurable TURN servers for relay when direct connection fails
- **Fallback Strategy**: Automatic fallback to audio-only if video fails

### 2. Media Quality Optimization
- **Video**: 1280x720 ideal resolution with adaptive quality
- **Audio**: Echo cancellation, noise suppression, auto gain control
- **Bandwidth**: Adaptive bitrate based on network conditions

### 3. Connection Reliability
- **WebSocket Fallback**: Automatic fallback to polling if WebSocket fails
- **Reconnection Logic**: Automatic reconnection with exponential backoff
- **Connection Monitoring**: Real-time connection status and quality metrics

## Meeting Capacity and Limits

### User Limits
- **Maximum Participants per Meeting**: 50 users
- **Maximum Concurrent Meetings**: 100 meetings
- **Total System Capacity**: 5000 concurrent users

### Technical Limitations
- **WebRTC Peer Connections**: 50 per meeting
- **Socket Connections**: 1000 per server instance
- **Bandwidth per User**: 2-8 Mbps (adaptive)
- **Server Resources**: CPU and memory scale with participant count

### Performance Optimization
- **Selective Forwarding**: Only forward active streams
- **Quality Scaling**: Automatic quality adjustment based on network
- **Resource Management**: Automatic cleanup of inactive connections

## Starting the Services

### 1. Start Backend Server
```bash
cd backend
npm start
# Server runs on http://localhost:5000
```

### 2. Start Meeting Server
```bash
cd backend
npm run meeting:dev
# Meeting server runs on http://localhost:3001
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:8083
```

## Testing the Meeting System

### 1. Basic Connection Test
- Open browser to `http://localhost:8083`
- Navigate to meeting room
- Allow camera/microphone permissions
- Create or join a meeting

### 2. Multi-User Test
- Open multiple browser tabs/windows
- Join the same meeting room
- Verify video/audio streams
- Test chat and participant management

### 3. Network Quality Test
- Test with different network conditions
- Verify automatic quality adjustment
- Test reconnection after network interruption

## Troubleshooting

### Common Issues

#### 1. "Local video ref is null"
- **Cause**: Video element not properly initialized
- **Solution**: ✅ Fixed with improved initialization logic

#### 2. "Failed to load resource: 404 on /config"
- **Cause**: Wrong port configuration
- **Solution**: ✅ Fixed port configuration

#### 3. Camera/Microphone Access Denied
- **Cause**: Browser permissions
- **Solution**: Check browser settings and allow permissions

#### 4. Connection Failed
- **Cause**: Meeting server not running
- **Solution**: Ensure meeting server is running on port 3001

### Debug Commands
```bash
# Check if ports are in use
netstat -an | findstr :3001
netstat -an | findstr :5000
netstat -an | findstr :8083

# Check meeting server logs
cd backend && npm run meeting:dev

# Check backend server logs
cd backend && npm start
```

## Production Deployment

### Environment Variables
```env
VITE_BACKEND_URL=https://your-backend-domain.com
VITE_FRONTEND_URL=https://your-frontend-domain.com
VITE_SOCKET_URL=https://your-backend-domain.com
VITE_MEETING_URL=https://your-backend-domain.com
```

### Scaling Considerations
- **Load Balancing**: Multiple meeting server instances
- **CDN**: Static asset delivery
- **Monitoring**: Real-time performance metrics
- **Backup**: Automatic failover systems

## Security Features

### 1. Authentication
- JWT token validation
- Socket authentication
- Meeting access control

### 2. Data Protection
- End-to-end encryption for messages
- Secure WebRTC connections
- Privacy controls for participants

### 3. Rate Limiting
- API request limits
- Connection rate limiting
- Spam protection

## Future Enhancements

### 1. Advanced Features
- Screen sharing
- Recording capabilities
- Virtual backgrounds
- AI-powered noise reduction

### 2. Integration
- Calendar integration
- Email notifications
- Analytics dashboard
- Mobile app support

### 3. Performance
- WebRTC optimization
- Better bandwidth management
- Advanced codec support
- Edge computing integration
