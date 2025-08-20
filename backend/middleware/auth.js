const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth middleware - Path:', req.path);
    console.log('Auth middleware - Token present:', !!token);

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    console.log('Auth middleware - JWT_SECRET present:', !!process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token decoded, userId:', decoded.userId);
    
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
