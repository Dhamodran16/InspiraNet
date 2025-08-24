const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
// Multer moved to individual route files
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ path: './config.env' });

// Import models
const User = require('./models/User');

// Import routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const postRoutes = require('./routes/posts');
const eventRoutes = require('./routes/events');
const jobRoutes = require('./routes/jobs');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const configRoutes = require('./routes/config');
const followRoutes = require('./routes/follows');
const placementRoutes = require('./routes/placements');
const { router: meetingRoutes, rooms, roomMessages, roomMeta } = require('./routes/meetings');
const CronService = require('./services/cronService');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Import services
const SocketService = require('./services/socketService');
const studentConversionService = require('./services/studentConversionService'); // initializes schedules
const { startRealtimeWatchers } = require('./services/realtimeWatchers');

// Email validation middleware
const { checkEmailValidity, checkEmailExpiryWarning } = require('./middleware/emailValidation');

const app = express();
const ensureDb = require('./middleware/db');
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Parse frontend URLs from environment variable
const frontendUrls = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['https://inspiranet.onrender.com'];

// Add development URLs for local development
if (process.env.NODE_ENV === 'development') {
  frontendUrls.push('http://localhost:8083', 'http://localhost:8084', 'http://localhost:8085', 'http://localhost:3000', 'http://localhost:5173');
}

// Simplified CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (frontendUrls.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, allow all localhost origins
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Allow the production frontend URL
    if (origin === 'https://inspiranet.onrender.com') {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// Trust proxy for rate limiting behind load balancers
app.set('trust proxy', 1);

// Apply CORS middleware
app.use(cors(corsOptions));

// Initialize Socket.io with simplified CORS
const io = new Server(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize Socket Service
const socketService = new SocketService(io);
startRealtimeWatchers(io);

// Make io available to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);
  
  // Handle user authentication
  socket.on('authenticate', async (data) => {
    try {
      const token = data.token;
      if (!token) {
        socket.emit('auth_error', { message: 'No token provided' });
        return;
      }
      
      // Verify token and get user
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('name email type department batch');
      
      if (!user) {
        socket.emit('auth_error', { message: 'User not found' });
        return;
      }
      
      // Store user info in socket
      socket.userId = user._id.toString();
      socket.user = user;
      
      // Join user to personal room
      socket.join(`user_${user._id}`);
      console.log(`✅ User ${user.name} authenticated and joined room user_${user._id}`);
      
      // Emit successful authentication
      socket.emit('authenticated', { 
        userId: user._id, 
        userName: user.name,
        userType: user.type 
      });
      
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });

  // Meeting room functionality
  socket.on('join-room', (roomId, username) => {
    console.log(`User ${username} (${socket.id}) joining room: ${roomId}`);
    
    // Join the room
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    
    // Notify others in the room
    socket.to(roomId).emit('user-connected', socket.id, username);
    
    // Send existing users to the new user
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
      const users = Array.from(room).filter(id => id !== socket.id);
      socket.emit('room-users', users.map(id => ({
        id,
        username: io.sockets.sockets.get(id)?.username || 'Unknown'
      })));
    }
  });

  // Handle room leaving
  socket.on('leave-room', (roomId) => {
    console.log(`User ${socket.username} (${socket.id}) leaving room: ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-disconnected', socket.id, socket.username);
    
    // Leave the room
    socket.leave(roomId);
    socket.roomId = null;
    socket.username = null;
  });

  // WebRTC signaling
  socket.on('offer', (offer, targetId) => {
    console.log(`Offer from ${socket.id} to ${targetId}`);
    socket.to(targetId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, targetId) => {
    console.log(`Answer from ${socket.id} to ${targetId}`);
    socket.to(targetId).emit('answer', answer, socket.id);
  });

  socket.on('ice-candidate', (candidate, targetId) => {
    console.log(`ICE candidate from ${socket.id} to ${targetId}`);
    socket.to(targetId).emit('ice-candidate', candidate, socket.id);
  });

  // Chat functionality
  socket.on('send-message', (messageData) => {
    const roomId = socket.roomId;
    if (roomId) {
      const message = {
        id: Date.now().toString(),
        user: socket.username,
        text: messageData.text,
        senderId: socket.id,
        timestamp: Date.now(),
        replyTo: messageData.replyTo || null
      };
      
      console.log(`Message in room ${roomId} from ${socket.username}: ${messageData.text}`);
      
      // Broadcast to all users in the room (including sender for consistency)
      io.to(roomId).emit('receive-message', message);
    }
  });

  // Typing indicators
  socket.on('typing', (isTyping) => {
    const roomId = socket.roomId;
    if (roomId) {
      // Broadcast to all users in the room (including sender for consistency)
      io.to(roomId).emit('user-typing', socket.id, isTyping, socket.username);
    }
  });

  // Hand raise functionality
  socket.on('raise-hand', (raised) => {
    const roomId = socket.roomId;
    if (roomId) {
      console.log(`Hand raise from ${socket.username} (${socket.id}): ${raised ? 'raised' : 'lowered'}`);
      // Broadcast to all users in the room (including sender for consistency)
      io.to(roomId).emit('user-raised-hand', socket.id, raised, socket.username);
    }
  });

  // Media state updates
  socket.on('update-media-state', (state) => {
    const roomId = socket.roomId;
    if (roomId) {
      console.log(`Media state update from ${socket.username} (${socket.id}):`, state);
      // Broadcast to all users in the room (including sender for consistency)
      io.to(roomId).emit('media-state-update', socket.id, state);
    }
  });

  // Host controls
  socket.on('host-mute-all', () => {
    const roomId = socket.roomId;
    if (roomId) {
      console.log(`Host ${socket.username} (${socket.id}) muted all in room ${roomId}`);
      // Broadcast to all users in the room (including sender for consistency)
      io.to(roomId).emit('host-mute-all');
    }
  });

  // Host ends meeting - disconnect all participants
  socket.on('host-end-meeting', () => {
    const roomId = socket.roomId;
    if (roomId) {
      console.log(`Host ${socket.username} (${socket.id}) ended meeting in room ${roomId}`);
      
      // Get all users in the room
      const room = io.sockets.adapter.rooms.get(roomId);
      if (room) {
        const userIds = Array.from(room);
        
        // Disconnect all participants
        userIds.forEach(userId => {
          const userSocket = io.sockets.sockets.get(userId);
          if (userSocket) {
            userSocket.emit('meeting-ended-by-host');
            userSocket.leave(roomId);
            userSocket.roomId = null;
            userSocket.username = null;
          }
        });
        
        // Delete the room
        io.sockets.adapter.rooms.delete(roomId);
        console.log(`Room ${roomId} deleted and all participants disconnected`);
      }
    }
  });

  // Emoji reactions
  socket.on('emoji-reaction', (data) => {
    const roomId = socket.roomId;
    if (roomId) {
      // Broadcast to all users in the room (including sender for consistency)
      io.to(roomId).emit('emoji-reaction', data.messageId, data.emoji, socket.id);
    }
  });
});

// Middleware
app.use(helmet());
// CORS is already applied above
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB with robust connection handling
const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    
    // Close any existing connection first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('🔄 Closed existing connection');
    }
    
    const options = {
      serverSelectionTimeoutMS: 30000,        // Reduced to 30s for faster failure detection
      socketTimeoutMS: 60000,                 // Reduced to 60s
      connectTimeoutMS: 30000,                // Reduced to 30s
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,                        // Increased for better performance
      minPoolSize: 2,                         // Increased for better performance
      maxIdleTimeMS: 30000,                   // Reduced to 30s
      family: 4,                              // Force IPv4
      heartbeatFrequencyMS: 10000,           // Heartbeat every 10 seconds
      retryReads: true,
      bufferCommands: false                   // Disable mongoose buffering
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Connected to MongoDB Atlas successfully');
    
    // Wait for connection to stabilize
    setTimeout(async () => {
      try {
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
          await mongoose.connection.db.admin().ping();
          console.log('✅ Database ping successful - connection stable');
        } else {
          console.log('⚠️ Connection not ready for ping test (state:', mongoose.connection.readyState, ')');
        }
      } catch (pingError) {
        console.log('⚠️ Ping test failed:', pingError.message);
      }
    }, 2000); // Wait 2 seconds
    
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    
    // Log specific error details
    if (err.name === 'MongoServerSelectionError') {
      console.error('🔍 Server selection failed. This usually means:');
      console.error('   - IP address not whitelisted in Atlas');
      console.error('   - Network connectivity issues');
      console.error('   - Atlas cluster is down or paused');
    }
    
    if (err.code === 'ENOTFOUND') {
      console.error('🔍 DNS resolution failed. Check your internet connection.');
    }
    
    if (err.code === 'ETIMEDOUT') {
      console.error('🔍 Connection timeout. This usually means:');
      console.error('   - IP address not whitelisted');
      console.error('   - Firewall blocking connection');
      console.error('   - Network issues');
    }
    
    console.log('🔄 Retrying connection in 10 seconds...');
    setTimeout(connectDB, 10000);
  }
};

// Improved MongoDB connection event handlers with connection state management
let isReconnecting = false;
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  
  // Don't retry immediately on error, let the disconnect handler handle it
  if (err.name === 'MongoServerSelectionError') {
    console.log('⚠️ Server selection error detected. Will attempt reconnection...');
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected. Current state:', mongoose.connection.readyState);
  
  // Only attempt reconnection if we're not already reconnecting
  if (!isReconnecting && connectionAttempts < maxConnectionAttempts) {
    isReconnecting = true;
    connectionAttempts++;
    
    // Use exponential backoff for reconnection attempts
    const reconnectDelay = Math.min(15000 * Math.pow(2, Math.min(connectionAttempts - 1, 4)), 120000);
    console.log(`🔄 Reconnection attempt ${connectionAttempts}/${maxConnectionAttempts} in ${reconnectDelay/1000} seconds...`);
    
    setTimeout(async () => {
      try {
        if (mongoose.connection.readyState === 0) { // Only reconnect if still disconnected
          await connectDB();
        }
      } catch (error) {
        console.error('❌ Reconnection attempt failed:', error.message);
      } finally {
        isReconnecting = false;
      }
    }, reconnectDelay);
  } else if (connectionAttempts >= maxConnectionAttempts) {
    console.error('❌ Maximum reconnection attempts reached. Please check your MongoDB Atlas configuration.');
    console.error('📋 Troubleshooting steps:');
    console.error('   1. Verify your IP is whitelisted in MongoDB Atlas');
    console.error('   2. Check if your Atlas cluster is running');
    console.error('   3. Verify your MONGODB_URI in config.env');
    console.error('   4. Try connecting from a different network');
  }
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
  // Track connection start time for health monitoring
  mongoose.connection.startTime = Date.now();
  // Reset reconnection state on successful connection
  isReconnecting = false;
  connectionAttempts = 0;
  mongoose.connection.reconnectAttempts = 0;
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
  // Reset reconnection state
  isReconnecting = false;
  connectionAttempts = 0;
});

mongoose.connection.on('close', () => {
  console.log('🔌 MongoDB connection closed');
});

mongoose.connection.on('fullsetup', () => {
  console.log('✅ MongoDB connection fully established with all replica set members');
});

mongoose.connection.on('all', () => {
  console.log('✅ MongoDB connection established with all replica set members');
});

// Add connection health monitoring with improved stability
let connectionHealthCheck;
const startHealthMonitoring = () => {
  connectionHealthCheck = setInterval(async () => {
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        // Only ping if connection has been stable for a while
        const connectionTime = Date.now() - (mongoose.connection.startTime || Date.now());
        if (connectionTime > 10000) { // Only ping after 10 seconds of connection
          await mongoose.connection.db.admin().ping();
          console.log('💓 Database health check: OK');
        } else {
          console.log('💓 Database health check: Connection still stabilizing');
        }
      } else {
        console.log('⚠️ Database health check: Connection not ready (state:', mongoose.connection.readyState, ')');
      }
    } catch (error) {
      console.error('❌ Database health check failed:', error.message);
      // Don't force reconnection on health check failure - let natural reconnection handle it
      console.log('⚠️ Health check failed, but connection may still be valid');
    }
  }, 60000); // Check every 60 seconds instead of 30
};

// Initialize connection and health monitoring
connectDB().then(() => {
  startHealthMonitoring();
}).catch(err => {
  console.error('❌ Initial connection failed:', err.message);
});

// Add process error handling to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
  
  // Log specific MongoDB-related errors
  if (err.name === 'MongoError' || err.name === 'MongoServerSelectionError') {
    console.error('🔍 MongoDB-related error detected. This might indicate connection issues.');
  }
  
  // Don't exit immediately, try to recover
  console.log('🔄 Attempting to recover from uncaught exception...');
  
  // Try to close MongoDB connection gracefully
  if (mongoose.connection.readyState === 1) {
    mongoose.connection.close(() => {
      console.log('✅ MongoDB connection closed due to uncaught exception');
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log specific MongoDB-related rejections
  if (reason && reason.name === 'MongoError') {
    console.error('🔍 MongoDB-related rejection detected. This might indicate connection issues.');
  }
  
  // Don't exit immediately, try to recover
  console.log('🔄 Attempting to recover from unhandled rejection...');
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`🔄 ${signal} received, shutting down gracefully...`);
  
  // Stop accepting new requests
  server.close(async () => {
    console.log('✅ HTTP server closed gracefully');
    
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed gracefully');
      } catch (error) {
        console.log('⚠️ Error closing MongoDB connection:', error.message);
      }
    } else {
      console.log('✅ MongoDB connection already closed');
    }
    
    // Stop health monitoring
    if (connectionHealthCheck) {
      clearInterval(connectionHealthCheck);
      console.log('✅ Health monitoring stopped');
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force exit after 30 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Rate limiting - More reasonable limits for a social network
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs (increased for social network usage)
  message: {
    error: 'Too many requests. Please wait a moment and try again.',
    retryAfter: Math.ceil(15 * 60 / 60) // minutes
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Specific rate limiting for health checks (very lenient)
const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300 // limit each IP to 300 health checks per minute
});

// Specific rate limiting for stats (lenient for real-time updates)
const statsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500 // limit each IP to 500 stats requests per minute
});

// Specific rate limiting for auth endpoints (more restrictive)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 auth requests per 15 minutes
  message: {
    error: 'Too many authentication attempts. Please wait a moment and try again.',
    retryAfter: Math.ceil(15 * 60 / 60)
  }
});

app.use('/api/health', healthLimiter);
app.use('/api/stats', statsLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/', limiter);

// Multer configuration moved to individual route files

// Routes

// WebRTC configuration for meetings
app.get('/api/config', (req, res) => {
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };
  
  // Add TURN servers if configured
  if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
    rtcConfig.iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_PASSWORD
    });
  }
  
  res.json({ rtcConfig });
});

// Health check with detailed database status
app.get('/api/health', (req, res) => {
  const dbStatus = {
    readyState: mongoose.connection.readyState,
    readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    collections: Object.keys(mongoose.connection.collections).length
  };

  const systemStatus = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString()
  };

  const healthStatus = {
    status: dbStatus.readyState === 1 ? 'OK' : 'UNHEALTHY',
    database: dbStatus,
    system: systemStatus,
    message: dbStatus.readyState === 1 
      ? 'KEC Alumni Network API is running with healthy database connection'
      : 'KEC Alumni Network API is running but database connection is not ready'
  };

  res.status(dbStatus.readyState === 1 ? 200 : 503).json(healthStatus);
});

// Simple health check for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Database-specific health check
app.get('/api/health/db', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        status: 'UNHEALTHY',
        message: 'Database connection is not ready',
        readyState: mongoose.connection.readyState,
        readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
      });
    }

    // Test database connectivity with a ping
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - startTime;

    res.json({
      status: 'OK',
      message: 'Database connection is healthy',
      readyState: mongoose.connection.readyState,
      readyStateText: 'connected',
      responseTime: `${responseTime}ms`,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'UNHEALTHY',
      message: 'Database health check failed',
      error: error.message,
      readyState: mongoose.connection.readyState,
      readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
});

// Auth routes (ensure DB is ready so login/register won't 500 on DB timeouts)
app.use('/api/auth', ensureDb, authRoutes);

// Attach email expiry warning headers for authenticated routes
app.use(checkEmailExpiryWarning);

// Short-circuit requests if DB is not ready yet
app.use('/api', ensureDb);

// Configuration routes (public for reading, protected for admin operations)
app.use('/api/config', configRoutes);

// Messaging routes (protected)
app.use('/api/messages', messageRoutes);

// Conversation routes (protected)
app.use('/api/conversations', conversationRoutes);

// Post routes (protected)
app.use('/api/posts', postRoutes);

// Event routes (protected)
app.use('/api/events', eventRoutes);

// Job routes (protected)
app.use('/api/jobs', jobRoutes);

// Placement routes (protected)
app.use('/api/placements', placementRoutes);

// Notification routes (protected)
app.use('/api/notifications', notificationRoutes);

// User routes (protected)
app.use('/api/users', userRoutes);

// Stats routes (protected)
app.use('/api/stats', statsRoutes);

// Follow routes (protected)
app.use('/api/follows', followRoutes);

// Group routes (protected)
app.use('/api/groups', require('./routes/groups'));

// Meetings routes (protected)
app.use('/api/meetings', meetingRoutes);

// Meeting configuration endpoint (public for RTC config)
app.get('/config', (req, res) => {
  // Build ICE server config
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];
  
  // Add TURN servers if configured
  if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_PASSWORD,
    });
  }
  
  res.json({
    rtcConfig: {
      iceServers: iceServers
    }
  });
});

// 🚨 ADMIN ENDPOINT: System Capacity Monitoring
app.get('/admin/system-stats', (req, res) => {
  try {
    // Get system stats from socket service
    const socketService = require('./services/socketService');
    const stats = socketService.getSystemStats ? socketService.getSystemStats() : null;
    
    if (!stats) {
      return res.json({
        status: 'Service not available',
        message: 'Socket service not initialized'
      });
    }
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      system: {
        totalUsers: stats.totalUsers,
        totalRooms: stats.totalRooms,
        maxUsers: stats.maxUsers,
        maxRooms: stats.maxRooms,
        maxParticipantsPerRoom: stats.maxParticipantsPerRoom,
        systemLoad: stats.systemLoad
      },
      limits: {
        participantsPerRoom: '50 users max',
        concurrentRooms: '100 rooms max',
        totalUsers: '5,000 users max',
        videoStreams: '25 HD streams max',
        audioStreams: '50 audio streams max'
      },
      recommendations: {
        optimalRoomSize: '20-30 participants',
        optimalTotalRooms: '50-80 rooms',
        optimalTotalUsers: '2,000-4,000 users'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get system stats',
      error: error.message
    });
  }
});

// Posts API routes are now handled in /routes/posts.js

// Events API routes are now handled in /routes/events.js

// Job routes are now handled in /routes/jobs.js

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate Error',
        message: 'A record with this information already exists'
      });
    }
    return res.status(500).json({
      error: 'Database Error',
      message: 'A database error occurred'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Token has expired'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize cron jobs
CronService.init();

// Start server
server.listen(PORT, () => {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  console.log(`🚀 KEC Alumni Network API server running on port ${PORT}`);
  console.log(`📊 Health check: ${backendUrl}/api/health`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8083'}`);
  console.log(`🔌 WebSocket server ready for real-time messaging`);
  console.log(`🕐 Cron jobs: Initialized for email expiry processing`);
  
  // Email service status
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log(`📧 Email service: Configured (${process.env.SMTP_HOST || 'smtp.gmail.com'})`);
  } else {
    console.log(`📧 Email service: Not configured (using console logging)`);
  }
});

