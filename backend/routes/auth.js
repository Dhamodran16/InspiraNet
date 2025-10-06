const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateAuthUrl, getTokensFromCode } = require('../auth/googleAuth');
const User = require('../models/User');

// /auth/google (start OAuth) - redirect directly to Google
router.get('/google', (req, res) => {
  try {
    // If a user is already logged in via JWT, pass their userId in state to link accounts
    const bearer = req.headers['authorization'] || (req.query?.token ? `Bearer ${req.query.token}` : undefined);
    let state = undefined;
    if (bearer && bearer.startsWith('Bearer ')) {
      try {
        const token = bearer.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.userId || decoded?._id) {
          state = JSON.stringify({ linkUserId: decoded.userId || decoded._id });
        }
      } catch (_) {}
    }

    const authUrl = generateAuthUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate auth URL' 
    });
  }
});

// /auth/callback (OAuth callback)
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ 
        success: false,
        error: 'Authorization code is required' 
      });
    }

    const tokens = await getTokensFromCode(code);

    // If we have a state with linkUserId, attach calendar tokens to that user
    let finalUser;
    if (state) {
      try {
        const parsed = JSON.parse(state);
        const linkId = parsed?.linkUserId;
        if (linkId) {
          // Try to link to an existing DB user
          const existing = await User.findById(linkId);
          if (existing) {
            existing.googleCalendarConnected = true;
            existing.googleCalendarTokens = tokens;
            await existing.save();
            finalUser = {
              userId: existing._id,
              _id: existing._id,
              name: existing.name,
              email: existing.email,
              type: existing.type,
              avatar: existing.avatar,
              department: existing.department,
              batch: existing.batch,
              isVerified: existing.isVerified,
              isProfileComplete: existing.isProfileComplete,
              role: 'host',
              googleCalendarConnected: true
            };
          }
        }
      } catch (_) {}
    }

    // If we could not link, create an in-memory Google-only session user (no DB)
    if (!finalUser) {
      finalUser = {
        userId: 'google-user-' + Date.now(),
        _id: 'google-user-' + Date.now(),
        name: 'Google User',
        email: { college: 'google@inspiranet.com', personal: 'google@example.com' },
        type: 'student',
        avatar: '',
        department: '',
        batch: '',
        isVerified: true,
        isProfileComplete: true,
        role: 'host',
        googleCalendarConnected: true
      };
    }

    // Store user in session
    req.session.user = finalUser;
    req.session.isAuthenticated = true;
    
    const token = jwt.sign(finalUser, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?token=${token}&google_auth=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Authorization failed',
      details: error.message
    });
  }
});

// /auth/validate (validate connection)
router.get('/validate', (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        connected: false,
        error: 'No token provided'
      });
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({
          success: false,
          connected: false,
          error: 'Invalid token'
        });
      }

      res.json({
        success: true,
        connected: true,
        message: 'Connection is valid',
        user: {
          id: user.id,
          role: user.role,
          email: user.email
        }
      });
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: 'Validation failed'
    });
  }
});

// /auth/login (standard login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email (check both college and personal email fields)
    const user = await User.findOne({
      $or: [
        { 'email.college': email },
        { 'email.personal': email }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user has a password (some users might only have Google auth)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: 'Please use Google Sign-In for this account'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        _id: user._id,
        email: user.email.college || user.email.personal,
        type: user.type,
        role: 'host' // Allow all authenticated users to create meetings
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
        avatar: user.avatar,
        department: user.department,
        batch: user.batch,
        isVerified: user.isVerified,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error.message
    });
  }
});

// /auth/register (user registration)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, type, department, batch } = req.body;

    if (!name || !email || !password || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, password, and type are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { 'email.college': email },
        { 'email.personal': email }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const userData = {
      name,
      email: { college: email },
      password: hashedPassword,
      type,
      department: department || '',
      batch: batch || '',
      isVerified: false,
      isProfileComplete: false
    };

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        _id: user._id,
        email: user.email.college,
        type: user.type,
        role: 'host' // Allow all authenticated users to create meetings
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
        avatar: user.avatar,
        department: user.department,
        batch: user.batch,
        isVerified: user.isVerified,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message
    });
  }
});

// /auth/verify (verify session or JWT token and get user info)
router.get('/verify', async (req, res) => {
  try {
    // First check session-based authentication
    if (req.session.user && req.session.isAuthenticated) {
      console.log('Session-based authentication found:', req.session.user);
      return res.json({
        success: true,
        message: 'Session is valid',
        user: req.session.user
      });
    }

    // Fallback to JWT token authentication
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication found'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if this is a Google OAuth user (string ID)
    if (decoded.userId && decoded.userId.startsWith('google-user-')) {
      console.log('Auth verify - Google OAuth user detected, using token data');
      // For Google OAuth users, use the decoded token data directly
      return res.json({
        success: true,
        message: 'Token is valid',
        user: {
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
        }
      });
    }
    
    // For regular users, get from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
        avatar: user.avatar,
        department: user.department,
        batch: user.batch,
        isVerified: user.isVerified,
        isProfileComplete: user.isProfileComplete,
        role: user.role,
        googleCalendarConnected: user.googleCalendarConnected
      }
    });
  } catch (error) {
    console.error('Authentication verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid authentication',
      details: error.message
    });
  }
});

// /auth/refresh (refresh JWT token)
router.post('/refresh', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Verify current token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if this is a Google OAuth user (string ID)
    if (decoded.userId && decoded.userId.startsWith('google-user-')) {
      console.log('Auth refresh - Google OAuth user detected, using token data');
      // For Google OAuth users, generate new token with existing data
      const newToken = jwt.sign(decoded, process.env.JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({
        success: true,
        message: 'Token refreshed successfully',
        token: newToken,
        user: {
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
        }
      });
    }
    
    // For regular users, get from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new token
    const newToken = jwt.sign(
      { 
        userId: user._id,
        _id: user._id,
        email: user.email.college || user.email.personal,
        type: user.type,
        role: 'host' // Allow all authenticated users to create meetings
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
        avatar: user.avatar,
        department: user.department,
        batch: user.batch,
        isVerified: user.isVerified,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed',
      details: error.message
    });
  }
});

// /auth/logout (logout and clear session)
router.post('/logout', (req, res) => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          success: false,
          error: 'Logout failed'
        });
      }
      
      // Clear session cookie
      res.clearCookie('connect.sid');
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      details: error.message
    });
  }
});

module.exports = router;