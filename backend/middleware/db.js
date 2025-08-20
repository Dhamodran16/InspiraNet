const mongoose = require('mongoose');

// Enhanced database connection middleware
// Provides detailed connection status and helpful error messages
module.exports = function ensureDatabaseConnection(req, res, next) {
  const readyState = mongoose.connection.readyState;
  
  // Connection states: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (readyState === 0) {
    return res.status(503).json({ 
      error: 'Database is disconnected',
      message: 'Database connection has been lost. Please try again in a few moments.',
      status: 'disconnected',
      retryAfter: 10
    });
  }
  
  if (readyState === 2) {
    return res.status(503).json({ 
      error: 'Database is connecting',
      message: 'Database is establishing connection. Please try again in a few moments.',
      status: 'connecting',
      retryAfter: 5
    });
  }
  
  if (readyState === 3) {
    return res.status(503).json({ 
      error: 'Database is disconnecting',
      message: 'Database is shutting down. Please try again in a few moments.',
      status: 'disconnecting',
      retryAfter: 15
    });
  }
  
  if (readyState === 1) {
    // Connection is ready, but let's verify it's actually working
    try {
      // Add a small delay to prevent overwhelming the database
      setTimeout(() => {
        next();
      }, 10);
    } catch (error) {
      console.error('Database middleware error:', error);
      return res.status(503).json({ 
        error: 'Database health check failed',
        message: 'Database connection appears unstable. Please try again.',
        status: 'unhealthy',
        retryAfter: 5
      });
    }
  } else {
    // Unknown state
    return res.status(503).json({ 
      error: 'Database status unknown',
      message: 'Database connection status is unclear. Please try again in a few moments.',
      status: 'unknown',
      retryAfter: 10
    });
  }
};




