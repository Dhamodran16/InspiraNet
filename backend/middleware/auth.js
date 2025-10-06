const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token or session
const authenticateToken = async (req, res, next) => {
  try {
    console.log('Auth middleware - Path:', req.path);
    
    // First check for session-based authentication (Google OAuth users)
    if (req.session && req.session.user && req.session.isAuthenticated) {
      console.log('Auth middleware - Session-based authentication found');
      req.user = req.session.user;
      next();
      return;
    }

    // Fallback to JWT token authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth middleware - Token present:', !!token);

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    console.log('Auth middleware - JWT_SECRET present:', !!process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token decoded, userId:', decoded.userId);
    
    // Check if this is a Google OAuth user (string ID)
    if (decoded.userId && decoded.userId.startsWith('google-user-')) {
      console.log('Auth middleware - Google OAuth user detected, using session data');
      // For Google OAuth users, use the decoded token data directly
      req.user = {
        _id: decoded._id || decoded.userId,
        name: decoded.name,
        email: decoded.email,
        type: decoded.type,
        avatar: decoded.avatar,
        department: decoded.department,
        batch: decoded.batch,
        isVerified: decoded.isVerified,
        isProfileComplete: decoded.isProfileComplete,
        role: decoded.role,
        googleCalendarConnected: decoded.googleCalendarConnected
      };
      console.log('Auth middleware - Google OAuth user authenticated:', req.user.name);
      next();
      return;
    }
    
    // For regular users, look up in database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('Auth middleware - User not found for userId:', decoded.userId);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Auth middleware - User authenticated:', user.name);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to check if user is verified
const requireVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ error: 'Account verification required' });
  }
  next();
};

// Middleware to check user type
const requireUserType = (allowedTypes) => {
  return (req, res, next) => {
    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({ 
        error: `Access denied. Required user types: ${allowedTypes.join(', ')}` 
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireVerification,
  requireUserType
};
