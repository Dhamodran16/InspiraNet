const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const GoogleCalendarService = require('../services/googleCalendarService');
const { body, validationResult } = require('express-validator');

// Initialize Google Calendar service
const googleCalendarService = new GoogleCalendarService();

// Validation middleware for creating meetings
const validateCreateMeeting = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('start_time')
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date'),
  body('end_time')
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date'),
  body('attendees')
    .optional()
    .isArray()
    .withMessage('Attendees must be an array'),
  body('attendees.*.email')
    .optional()
    .isEmail()
    .withMessage('Each attendee must have a valid email'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
];

// OAuth 2.0 Routes

// Get Google OAuth authorization URL
router.get('/auth/google', authenticateToken, (req, res) => {
  try {
    const userId = req.user._id;
    const authUrl = googleCalendarService.getAuthUrl(userId);
    res.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
});

// Handle Google OAuth callback
router.post('/auth/google/callback', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const tokens = await googleCalendarService.getTokens(code);
    
    // Save tokens to user's record
    await User.findByIdAndUpdate(userId, {
      googleCalendarConnected: true,
      googleCalendarTokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope
      }
    });
    
    res.json({
      success: true,
      message: 'Authorization successful',
      connected: true
    });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process authorization'
    });
  }
});

// Meeting Management Routes

// Create a new meeting
router.post('/create-meeting', authenticateToken, validateCreateMeeting, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description, start_time, end_time, attendees = [], settings = {} } = req.body;
    const host_id = req.user._id || req.user.id;

    const startTime = new Date(start_time);
    const endTime = new Date(end_time);
    const now = new Date();

    if (startTime <= now) {
      return res.status(400).json({
        success: false,
        error: 'Meeting start time must be in the future'
      });
    }

    if (endTime <= startTime) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time'
      });
    }

    const userTokens = req.user.googleTokens;
    if (!userTokens) {
      return res.status(401).json({
        success: false,
        error: 'Google Calendar authorization required. Please authorize your Google account first.'
      });
    }

    googleCalendarService.setCredentials(userTokens);

    const meetingData = {
      title,
      description,
      start_time,
      end_time,
      attendees
    };

    const googleMeeting = await googleCalendarService.createMeeting(meetingData);

    const meeting = new Meeting({
      id: `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      host_id,
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      meet_link: googleMeeting.meetLink,
      event_id: googleMeeting.eventId,
      calendar_link: googleMeeting.eventLink,
      attendees,
      status: 'active'
    });

    await meeting.save();

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meet_link: meeting.meet_link,
        event_id: meeting.event_id,
        calendar_link: meeting.calendar_link,
        status: meeting.status,
        created_at: meeting.created_at
      }
    });

  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meeting'
    });
  }
});

// Get all meetings
router.get('/meetings', async (req, res) => {
  try {
    const { status = 'active', host_id, upcoming_only = false } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (host_id) {
      query.host_id = host_id;
    }

    let meetings = await Meeting.find(query)
      .populate('host_id', 'name email')
      .sort({ start_time: 1 });

    if (upcoming_only === 'true') {
      const now = new Date();
      meetings = meetings.filter(meeting => meeting.start_time > now);
    }

    res.json({
      success: true,
      meetings: meetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meet_link: meeting.meet_link,
        calendar_link: meeting.calendar_link,
        host_name: meeting.host_id?.name || 'Unknown Host',
        host_email: meeting.host_id?.email || '',
        status: meeting.status,
        attendees: meeting.attendees,
        created_at: meeting.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meetings'
    });
  }
});

// Get a specific meeting
router.get('/meetings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const meeting = await Meeting.findOne({ id })
      .populate('host_id', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meet_link: meeting.meet_link,
        calendar_link: meeting.calendar_link,
        host_name: meeting.host_id?.name || 'Unknown Host',
        host_email: meeting.host_id?.email || '',
        status: meeting.status,
        attendees: meeting.attendees,
        created_at: meeting.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting'
    });
  }
});

// Delete a meeting
router.delete('/delete-meeting/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user._id || req.user.id;

    const meeting = await Meeting.findOne({ id, host_id: user_id });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found or you do not have permission to delete it'
      });
    }

    try {
      const userTokens = req.user.googleTokens;
      if (userTokens) {
        googleCalendarService.setCredentials(userTokens);
        await googleCalendarService.deleteMeeting(meeting.event_id);
      }
    } catch (googleError) {
      console.error('Error deleting from Google Calendar:', googleError);
    }

    meeting.status = 'deleted';
    await meeting.save();
    
    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meeting'
    });
  }
});

// Update meeting status
router.patch('/meetings/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.user._id || req.user.id;

    if (!['active', 'cancelled', 'deleted'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be active, cancelled, or deleted'
      });
    }

    const meeting = await Meeting.findOne({ id, host_id: user_id });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found or you do not have permission to update it'
      });
    }

    meeting.status = status;
    await meeting.save();
    
    res.json({
      success: true,
      message: 'Meeting status updated successfully',
      meeting: {
        id: meeting.id,
        status: meeting.status
      }
    });

  } catch (error) {
    console.error('Error updating meeting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meeting status'
    });
  }
});

// Refresh Google Calendar tokens
router.post('/auth/refresh-token', authenticateToken, async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const newTokens = await googleCalendarService.refreshAccessToken(refresh_token);
    
    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      tokens: newTokens
    });

  } catch (error) {
    console.error('Error refreshing tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh tokens'
    });
  }
});

// Validate Google Calendar connection
router.get('/auth/validate', authenticateToken, async (req, res) => {
  try {
    const userTokens = req.user.googleTokens;
    
    if (!userTokens) {
      return res.status(401).json({
        success: false,
        error: 'Google Calendar not connected'
      });
    }

    googleCalendarService.setCredentials(userTokens);
    const isValid = await googleCalendarService.validateToken();
    
    res.json({
      success: true,
      connected: isValid,
      message: isValid ? 'Google Calendar connection is valid' : 'Google Calendar connection is invalid'
    });

  } catch (error) {
    console.error('Error validating connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate Google Calendar connection'
    });
  }
});

module.exports = router;

