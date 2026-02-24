const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
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
const meetingRoutes = require('./routes/meetings');
const calendarMeetingRoutes = require('./routes/calendarMeetings');
const googleMeetRoutes = require('./routes/googleMeet');
const CronService = require('./services/cronService');
const { ensureDemoUser } = require('./services/demoUserService');
const { startEmailExpiryMonitoring } = require('./services/emailExpiryService');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Import services
const SocketService = require('./services/socketService');
const { startRealtimeWatchers } = require('./services/realtimeWatchers');

// Email validation middleware
const { checkEmailValidity, checkEmailExpiryWarning } = require('./middleware/emailValidation');

const app = express();
app.set('trust proxy', 1);
const ensureDb = require('./middleware/db');
const server = createServer(app);
const getBasePort = () => (process.env.PORT ? Number(process.env.PORT) : 5000);
let currentPort = getBasePort();

// Parse frontend URLs from environment variable, default to local SPA if nothing provided
const defaultFrontendOrigins = ['http://localhost:8083'];
const frontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : process.env.CORS_ORIGIN
    ? [process.env.CORS_ORIGIN]
    : defaultFrontendOrigins;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.cloudinary.com", "wss:", "ws:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (frontendUrls.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // For development, allow all localhost origins (any port)
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Additional check: if CORS_ORIGIN is set and matches, allow it
    if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
      return callback(null, true);
    }

    // Log rejected origins for debugging
    console.log('CORS: Rejected origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware BEFORE other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Initialize Socket.io for real-time messaging and notifications
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (frontendUrls.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      // For development, allow all localhost origins (any port)
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }

      // Allow any explicitly configured frontend origins (e.g., for staging)
      if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.split(',').map(url => url.trim()).includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  },
  transports: ["websocket", "polling"], // Prioritize websocket
  allowUpgrades: true,
  pingTimeout: 30000,
  pingInterval: 10000, // Faster heartbeat to keep connection alive on Render/Cloud proxies
});

// Initialize Socket Service for real-time messaging
const socketService = new SocketService(io);
startRealtimeWatchers(io);

// Make io available to routes
app.set('io', io);

// Socket.IO connection handling for real-time messaging and notifications
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

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        socket.emit('auth_error', { message: 'User not found' });
        return;
      }

      // Store user info in socket
      socket.userId = user._id.toString();
      socket.user = user;

      // Join user-specific room for notifications
      socket.join(`user_${user._id}`);

      // Emit authentication success
      socket.emit('authenticated', {
        userId: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      });

      console.log(`✅ Socket authenticated: ${user.name} (${socket.id})`);
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
    // Clean up any room memberships or other state
  });

  // Real-time messaging events (not Google meetings)
  socket.on('join-conversation', (conversationId) => {
    if (socket.userId) {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    }
  });

  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} left conversation ${conversationId}`);
  });

  socket.on('typing', (data) => {
    if (socket.userId && data.conversationId) {
      socket.to(`conversation_${data.conversationId}`).emit('user-typing', {
        userId: socket.userId,
        userName: socket.user?.name,
        isTyping: data.isTyping
      });
    }
  });

  socket.on('stop-typing', (data) => {
    if (socket.userId && data.conversationId) {
      socket.to(`conversation_${data.conversationId}`).emit('user-stop-typing', {
        userId: socket.userId,
        userName: socket.user?.name
      });
    }
  });
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload middleware
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

// Make upload middleware available to routes
app.set('upload', upload);

// Database connection with retry logic
const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });

    console.log('✅ MongoDB connection established');
    console.log(`📊 Connected to: ${conn.connection.host}`);

    // Test the connection
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database ping successful - connection stable');

    await ensureDemoUser();

    // Realtime watchers are started once socket.io is ready (see below)

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Connect to database
connectDB();

// Routes
// Add logging middleware to debug route matching
app.use((req, res, next) => {
  // Log all API requests for debugging
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Original URL: ${req.originalUrl}`);
  }
  next();
});

app.use('/api/auth', authRoutes);
console.log('✅ Auth routes mounted at /api/auth - callback route should be at /api/auth/callback');
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
console.log('✅ User routes mounted at /api/users');
console.log('   Available routes: GET /profile, PUT /profile, GET /:userId, etc.');
app.use('/api/email-migration', require('./routes/emailMigration'));
app.use('/api/stats', statsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/placements', placementRoutes);

// Group routes (protected)
app.use('/api/groups', require('./routes/groups'));

// Meeting routes (protected)
app.use('/api/meetings', meetingRoutes);
app.use('/api', calendarMeetingRoutes);
app.use('/api/google-meet', googleMeetRoutes);

// Health check endpoint
// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'InspiraNet API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      events: '/api/events',
      messages: '/api/messages'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 🚨 ADMIN ENDPOINT: System Capacity Monitoring
app.get('/admin/system-stats', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        system: {
          status: 'operational',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          platform: process.platform
        },
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          host: mongoose.connection.host,
          name: mongoose.connection.name
        },
        limits: {
          concurrentUsers: '1000 users max',
          concurrentRooms: '100 rooms max',
          fileUploadSize: '10MB max',
          rateLimit: '1000 requests per 15min'
        },
        recommendations: {
          optimalConcurrentUsers: '500-800 users',
          optimalTotalRooms: '50-80 rooms',
          recommendedFileSize: '5MB or less'
        }
      }
    });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system statistics'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Don't interfere with CORS errors - let CORS middleware handle them
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation: Origin not allowed'
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler - catch all unmatched routes
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   Base URL: ${req.baseUrl}`);

  // Return 400 for API routes that don't exist (bad request)
  // Return 404 for non-API routes (not found)
  const statusCode = req.path.startsWith('/api') ? 400 : 404;

  res.status(statusCode).json({
    success: false,
    error: 'Route not found',
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
});

// Initialize cron jobs
CronService.init();

// Start email expiry monitoring
startEmailExpiryMonitoring();

// Start server with automatic port fallback when PORT is not explicitly set
const startServer = (port) => {
  server.listen(port, () => {
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
    console.log(`🚀 KEC Alumni Network API server running on port ${port}`);
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

    console.log(`🔒 Security: Helmet, CORS, Rate limiting enabled`);
    console.log(`📁 File uploads: Enabled (max 10MB)`);
    console.log(`🔄 Auto-retry: Enabled for failed connections`);
  });
};

// Start server with port fallback
const startWithFallback = async () => {
  try {
    startServer(currentPort);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${currentPort} is in use, trying port ${currentPort + 1}`);
      currentPort += 1;
      setTimeout(() => startWithFallback(), 1000);
    } else {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.log('🔄 Attempting to recover from uncaught exception...');
  // Don't exit the process, let it continue running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('🔄 Attempting to recover from unhandled rejection...');
  // Don't exit the process, let it continue running
});

// Start the server
startWithFallback();
