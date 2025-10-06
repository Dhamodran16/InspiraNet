const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const googleMeetService = require('../services/googleMeetService');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT and role
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // { id, role }
    next();
  });
};

const requireHost = (req, res, next) => {
  // Allow access if user has role 'host' or if no role is specified (for existing tokens)
  if (req.user.role && req.user.role !== 'host') {
    return res.status(403).json({ error: 'Host access required' });
  }
  next();
};

// Only faculty and alumni can create meetings
const requireCreatorType = (req, res, next) => {
  const userType = req.user.type;
  if (userType !== 'faculty' && userType !== 'alumni') {
    return res.status(403).json({ error: 'Only faculty and alumni can create meetings' });
  }
  next();
};

// Create multiple Google Meet sessions
router.post('/create-multiple-meetings', authenticateToken, requireCreatorType, async (req, res) => {
  try {
    const { sessions } = req.body;
    const userId = req.user.userId || req.user._id;
    
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({
        error: 'Sessions array is required and must not be empty'
      });
    }

    // Check if user has Google Calendar connected
    const connectionStatus = await googleMeetService.checkGoogleCalendarConnection(userId);
    
    if (!connectionStatus.connected) {
      return res.status(403).json({
        error: 'Google Calendar access required',
        message: 'Please connect your Google Calendar account first',
        action: 'connect_google_calendar',
        authUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google`
      });
    }

    // Create all Google Meet sessions in parallel
    const results = await googleMeetService.createMultipleMeetSessions(userId, sessions);

    // Save all meetings to database
    const savedMeetings = [];
    for (let i = 0; i < results.sessions.length; i++) {
      const session = sessions[i];
      const googleMeetResult = results.sessions[i];
      
      const meeting = new Meeting({
        id: uuidv4(),
        host_id: userId,
        title: session.title,
        description: session.description || '',
        start_time: new Date(session.startTime),
        end_time: new Date(session.endTime),
        meet_link: googleMeetResult.meetLink,
        event_id: googleMeetResult.eventId,
        calendar_link: googleMeetResult.calendarLink,
        attendees: googleMeetResult.attendees,
        status: 'active'
      });

      await meeting.save();
      savedMeetings.push(meeting);
    }

    res.json({
      success: true,
      message: `${results.totalCreated} Google Meet sessions created successfully`,
      meetings: savedMeetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meet_link: meeting.meet_link,
        calendar_link: meeting.calendar_link,
        event_id: meeting.event_id,
        attendees: meeting.attendees,
        status: meeting.status,
        created_at: meeting.created_at
      }))
    });
  } catch (error) {
    console.error('Create multiple meetings error:', error);
    res.status(500).json({ 
      error: 'Failed to create meetings',
      details: error.message
    });
  }
});

// List user's Google Calendar events
router.get('/calendar-events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { maxResults = 10 } = req.query;
    
    const result = await googleMeetService.listCalendarEvents(userId, parseInt(maxResults));
    
    res.json({
      success: true,
      events: result.events
    });
  } catch (error) {
    console.error('List calendar events error:', error);
    res.status(500).json({ 
      error: 'Failed to list calendar events',
      details: error.message
    });
  }
});

// Delete a Google Calendar event
router.delete('/calendar-events/:eventId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { eventId } = req.params;
    
    const result = await googleMeetService.deleteCalendarEvent(userId, eventId);
    
    // Also delete from our database if it exists
    await Meeting.findOneAndUpdate(
      { event_id: eventId },
      { status: 'cancelled' }
    );
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ 
      error: 'Failed to delete calendar event',
      details: error.message
    });
  }
});

// Check Google Calendar connection status
router.get('/google-calendar-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const connectionStatus = await googleMeetService.checkGoogleCalendarConnection(userId);
    
    res.json({
      success: true,
      connected: connectionStatus.connected,
      hasTokens: connectionStatus.hasTokens,
      authUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google`
    });
  } catch (error) {
    console.error('Check Google Calendar status error:', error);
    res.status(500).json({ 
      error: 'Failed to check Google Calendar status',
      details: error.message
    });
  }
});

// Test endpoint to verify authentication is working
router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: {
      id: req.user.userId || req.user._id,
      role: req.user.role,
      googleCalendarConnected: req.user.googleCalendarConnected
    }
  });
});

// Simple meeting creation for testing (without Google Calendar)
router.post('/create-simple-meeting', authenticateToken, requireCreatorType, async (req, res) => {
  try {
    const { title, description, start_time, end_time } = req.body;
    
    // Validate required fields
    if (!title || !start_time || !end_time) {
      return res.status(400).json({
        error: 'Title, start_time, and end_time are required'
      });
    }

    // Create a simple meeting object
    const meeting = {
      id: `meeting-${Date.now()}`,
      title,
      description: description || '',
      start_time,
      end_time,
      meetLink: `https://meet.google.com/test-${Math.random().toString(36).substr(2, 9)}`,
      createdBy: req.user.userId || req.user._id,
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Simple meeting created successfully (for testing)',
      meeting
    });
  } catch (error) {
    console.error('Error creating simple meeting:', error);
    res.status(500).json({
      error: 'Failed to create meeting',
      details: error.message
    });
  }
});

// /create-meeting - Creates meeting with REAL Google Meet link
// Create a Google Meet session using Google Calendar API
router.post('/create-meeting', authenticateToken, requireCreatorType, async (req, res) => {
  try {
    const { title, description, startTime, endTime, attendees = [] } = req.body;
    const userId = req.user.userId || req.user._id;
    
    // Check if user has Google Calendar connected
    const connectionStatus = await googleMeetService.checkGoogleCalendarConnection(userId);
    
    if (!connectionStatus.connected) {
      return res.status(403).json({
        error: 'Google Calendar access required',
        message: 'Please connect your Google Calendar account first',
        action: 'connect_google_calendar',
        authUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google`
      });
    }
    
    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Title, startTime, and endTime are required'
      });
    }

    // Validate date format
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Use ISO 8601 format (e.g., 2025-09-28T10:00:00Z)'
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        error: 'End time must be after start time'
      });
    }

    // Create Google Meet session
    const meetingData = {
      title,
      description,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      attendees
    };

    const googleMeetResult = await googleMeetService.createGoogleMeetSession(userId, meetingData);

    // Save to database
    const meeting = new Meeting({
      id: uuidv4(),
      host_id: userId,
      title,
      description: description || '',
      start_time: startDate,
      end_time: endDate,
      meet_link: googleMeetResult.meetLink,
      event_id: googleMeetResult.eventId,
      calendar_link: googleMeetResult.calendarLink,
      conference_id: googleMeetResult.conferenceId || null,
      attendees: googleMeetResult.attendees,
      expected_attendees: attendees?.map(a => ({ email: a.email, name: a.name || (a.email?.split('@')[0] || 'Unknown'), status: 'invited' })) || [],
      status: 'active'
    });

    await meeting.save();

    res.json({
      success: true,
      message: 'Google Meet session created successfully',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meet_link: meeting.meet_link,
        calendar_link: meeting.calendar_link,
        event_id: meeting.event_id,
        conference_id: meeting.conference_id,
        host_id: meeting.host_id,
        attendees: meeting.attendees,
        status: meeting.status,
        created_at: meeting.created_at
      }
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Google Calendar authentication failed. Please re-authenticate.' 
      });
    }
    
    if (error.code === 403) {
      return res.status(403).json({ 
        error: 'Insufficient permissions for Google Calendar' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create meeting',
      details: error.message
    });
  }
});

// /meetings - List all active meetings (public endpoint)
router.get('/meetings', async (req, res) => {
  try {
    const meetings = await Meeting.find({ status: 'active' })
      .select('-event_id -status -created_at')
      .sort({ start_time: 1 });
    
    res.json({
      success: true,
      meetings: meetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meet_link: meeting.meet_link,
        host_id: meeting.host_id // include host to authorize delete client-side
      }))
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch meetings',
      details: error.message
    });
  }
});

// /delete-meeting/:id - Delete meeting from Google Calendar and mark as deleted
router.delete('/delete-meeting/:id', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await Meeting.findOne({ id });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const requesterId = (req.user.userId || req.user._id || req.user.id || '').toString();
    if (meeting.host_id.toString() !== requesterId) {
      return res.status(403).json({ error: 'You can only delete your own meetings' });
    }

    // Delete from Google Calendar using service (handles OAuth client)
    const userId = req.user.userId || req.user._id || req.user.id;
    try {
      await googleMeetService.deleteCalendarEvent(userId, meeting.event_id);
      console.log('Meeting deleted from Google Calendar:', meeting.event_id);
    } catch (googleError) {
      console.error('Error deleting event from Google Calendar:', googleError);
      // If Google reports already deleted (410) or not found (404), continue
      const status = googleError?.code || googleError?.response?.status;
      if (status !== 404 && status !== 410) {
        // Proceed with DB delete anyway to unblock user action
        console.warn('Proceeding with marking meeting deleted in DB despite Google error');
      }
    }

    // Permanently remove from database
    await Meeting.deleteOne({ id });

    res.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Google Calendar authentication failed' 
      });
    }
    
    if (error.code === 410) {
      return res.status(410).json({ 
        error: 'Event already deleted from Google Calendar' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete meeting',
      details: error.message
    });
  }
});

module.exports = router;