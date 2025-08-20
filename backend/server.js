const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
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
  : ['http://localhost:8084', 'http://localhost:8085', 'http://localhost:3000'];

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: frontendUrls,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket Service
const socketService = new SocketService(io);
startRealtimeWatchers(io);

// Make io available to routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: frontendUrls,
  credentials: true
}));
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
      serverSelectionTimeoutMS: 60000,        // Increased to 60s
      socketTimeoutMS: 120000,                // Increased to 120s
      connectTimeoutMS: 60000,                // Increased to 60s
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 5,                         // Reduced for stability
      minPoolSize: 1,                         // Reduced for stability
      maxIdleTimeMS: 60000,                   // Increased to 60s
      family: 4,                              // Force IPv4
      heartbeatFrequencyMS: 30000,           // Heartbeat every 30 seconds
      retryReads: true
      // Removed unsupported options: keepAlive, keepAliveInitialDelay, autoReconnect, reconnectTries, reconnectInterval
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Connected to MongoDB Atlas successfully');
    
    // Wait longer for connection to fully stabilize
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
    }, 5000); // Wait 5 seconds instead of 2
    
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
    
    console.log('🔄 Retrying connection in 15 seconds...');
    setTimeout(connectDB, 15000);
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
  server.close(() => {
    console.log('✅ HTTP server closed gracefully');
    
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close(() => {
        console.log('✅ MongoDB connection closed gracefully');
        
        // Stop health monitoring
        if (connectionHealthCheck) {
          clearInterval(connectionHealthCheck);
          console.log('✅ Health monitoring stopped');
        }
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });
    } else {
      console.log('✅ MongoDB connection already closed');
      process.exit(0);
    }
  });
  
  // Force exit after 30 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased significantly)
  message: {
    error: 'Too many requests. Please wait a moment and try again.',
    retryAfter: Math.ceil(15 * 60 / 60) // minutes
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Specific rate limiting for health checks (more lenient)
const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // limit each IP to 100 health checks per minute (increased)
});

// Specific rate limiting for stats (very lenient for real-time updates)
const statsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200 // limit each IP to 200 stats requests per minute
});

app.use('/api/health', healthLimiter);
app.use('/api/stats', statsLimiter);
app.use('/api/', limiter);

// Multer configuration moved to individual route files

// Routes

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

// Posts API routes are now handled in /routes/posts.js

// Events API routes are now handled in /routes/events.js

// Job routes are now handled in /routes/jobs.js

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  console.log(`🚀 KEC Alumni Network API server running on port ${PORT}`);
  console.log(`📊 Health check: ${backendUrl}/api/health`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8083'}`);
  console.log(`🔌 WebSocket server ready for real-time messaging`);
  
  // Email service status
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log(`📧 Email service: Configured (${process.env.SMTP_HOST || 'smtp.gmail.com'})`);
  } else {
    console.log(`📧 Email service: Not configured (using console logging)`);
  }
});

