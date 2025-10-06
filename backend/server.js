const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8083'],
  credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json());

// Session middleware - MUST be before routes
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Google Calendar API server running',
    timestamp: new Date().toISOString(),
    features: [
      'Real Google Calendar API integration',
      'OAuth 2.0 authentication',
      'Automatic Google Meet link generation',
      'Meeting CRUD operations'
    ]
  });
});

// Database Connection
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB Atlas');
    } else {
      console.log('⚠️  MONGODB_URI not set, using local MongoDB');
      await mongoose.connect('mongodb://localhost:27017/inspiranet');
      console.log('✅ Connected to local MongoDB');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('🔄 Continuing without database connection...');
  }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/meetings'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/follows', require('./routes/follows'));
app.use('/api/events', require('./routes/events'));
app.use('/api/placements', require('./routes/placements'));
app.use('/api/google-meet', require('./routes/googleMeet'));
app.use('/api', require('./routes/attendance'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/config', require('./routes/config'));

// Fix the follows endpoint (for existing frontend compatibility)
app.get('/api/follows/users', (req, res) => {
  res.json({
    success: true,
    users: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /api/health',
      'GET /api/auth/google',
      'GET /api/auth/callback',
      'GET /api/auth/validate',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/verify',
      'POST /api/auth/refresh',
      'POST /api/create-meeting',
      'GET /api/meetings',
      'DELETE /api/delete-meeting/:id',
      'GET /api/posts',
      'GET /api/conversations',
      'GET /api/notifications',
      'GET /api/users',
      'GET /api/follows/users',
      'GET /api/events',
      'GET /api/placements',
      'GET /api/google-meet/rooms',
      'GET /api/stats'
    ]
  });
});

// Start server with port conflict handling
const startServer = async () => {
  try {
    await connectDB();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Google Calendar API server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 OAuth 2.0: http://localhost:${PORT}/api/auth/google`);
      console.log(`📅 Create Meeting: http://localhost:${PORT}/api/create-meeting`);
      console.log(`📋 List Meetings: http://localhost:${PORT}/api/meetings`);
      console.log(`🗑️  Delete Meeting: http://localhost:${PORT}/api/delete-meeting/:id`);
      console.log('');
      console.log('🔧 Required Environment Variables:');
      console.log('   GOOGLE_CLIENT_ID=your_google_client_id');
      console.log('   GOOGLE_CLIENT_SECRET=your_google_client_secret');
      console.log('   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback');
      console.log('   JWT_SECRET=your_jwt_secret');
      console.log('');
      console.log('📖 Google Calendar API Integration:');
      console.log('   ✅ Real Google Meet link generation');
      console.log('   ✅ OAuth 2.0 authentication');
      console.log('   ✅ conferenceData.createRequest');
      console.log('   ✅ hangoutLink extraction');
      console.log('   ✅ Event deletion from Google Calendar');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error('💡 Solutions:');
        console.error('   1. Kill the process using port 5000:');
        console.error('      netstat -ano | findstr :5000');
        console.error('      taskkill /PID <PID_NUMBER> /F');
        console.error('   2. Or kill all Node.js processes:');
        console.error('      taskkill /IM node.exe /F');
        console.error('   3. Then restart the server');
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();