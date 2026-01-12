const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const PDFDocument = require('pdfkit');
const googleMeetService = require('../services/googleMeetService');
const attendanceTrackingService = require('../services/attendanceTrackingService');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

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
    const userId = req.user._id;
    
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
        roomId: `google-meet-${uuidv4()}`,
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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

// Check Google Calendar connection status - MUST be before /meetings route to avoid route conflicts
router.get('/google-calendar-status', authenticateToken, async (req, res) => {
  try {
    console.log('Google Calendar status endpoint hit');
    const userId = req.user._id;
    console.log('Checking connection for userId:', userId);
    const connectionStatus = await googleMeetService.checkGoogleCalendarConnection(userId);
    
    console.log('Connection status:', connectionStatus);
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

// Simple meeting creation for testing (without Google Calendar)
router.post('/create-simple-meeting', authenticateToken, requireCreatorType, async (req, res) => {
  try {
    const { title, description, start_time, end_time } = req.body;
    
    if (!title || !start_time || !end_time) {
      return res.status(400).json({
        error: 'Title, start_time, and end_time are required'
      });
    }

    const meeting = {
      id: `meeting-${Date.now()}`,
      title,
      description: description || '',
      start_time,
      end_time,
      meetLink: `https://meet.google.com/test-${Math.random().toString(36).substr(2, 9)}`,
      createdBy: req.user._id,
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

// Create a Google Meet session using Google Calendar API
router.post('/create-meeting', authenticateToken, requireCreatorType, async (req, res) => {
  try {
    const { title, description, startTime, endTime, attendees = [] } = req.body;
    const userId = req.user._id;
    
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
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Title, startTime, and endTime are required'
      });
    }

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

    const meetingData = {
      title,
      description,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      attendees
    };

    const googleMeetResult = await googleMeetService.createGoogleMeetSession(userId, meetingData);

    // Calculate link expiration (1 hour after start time)
    const linkExpiresAt = new Date(startDate.getTime() + (60 * 60 * 1000));

    const meeting = new Meeting({
      id: uuidv4(),
      roomId: `google-meet-${uuidv4()}`,
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
      status: 'active',
      isPermanent: true, // Meeting records are permanent
      linkExpiresAt: linkExpiresAt // Link expires 1 hour after start
    });

    await meeting.save();

    res.json({
      success: true,
      message: 'Google Meet session created successfully',
      roomId: meeting.roomId || meeting.id,
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
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    
    // Handle specific error types - check for invalid_grant in various places
    const isInvalidGrantError = 
      error.message?.includes('revoked') ||
      error.message?.includes('invalid_grant') ||
      error.code === 'invalid_grant' ||
      error.response?.data?.error === 'invalid_grant' ||
      error.details === 'invalid_grant';
    
    if (isInvalidGrantError) {
      return res.status(401).json({ 
        error: 'Google Calendar access revoked',
        message: 'Your Google Calendar access has been revoked. Please reconnect your Google Calendar account.',
        action: 'reconnect_google_calendar',
        code: 'invalid_grant',
        details: 'invalid_grant'
      });
    }
    
    if (error.message && error.message.includes('Google Calendar not connected')) {
      return res.status(403).json({ 
        error: 'Google Calendar not connected',
        message: 'Please connect your Google Calendar account first',
        action: 'connect_google_calendar'
      });
    }
    
    if (error.message && error.message.includes('authentication failed')) {
      return res.status(401).json({ 
        error: 'Google Calendar authentication failed',
        message: 'Please reconnect your Google Calendar account'
      });
    }
    
    if (error.code === 401 || error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Google Calendar authentication failed. Please re-authenticate.' 
      });
    }
    
    if (error.code === 403 || error.response?.status === 403) {
      return res.status(403).json({ 
        error: 'Insufficient permissions for Google Calendar' 
      });
    }
    
    // Return more detailed error information
    res.status(500).json({ 
      error: 'Failed to create meeting',
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// List all meetings (including completed - permanent storage)
router.get('/meetings', async (req, res) => {
  try {
    const { status, includeExpired } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    } else {
      // By default, show active and completed (permanent records)
      query.status = { $in: ['active', 'completed'] };
    }
    
    const meetings = await Meeting.find(query)
      .sort({ start_time: -1 }); // Most recent first
    
    res.json({
      success: true,
      meetings: meetings.map(meeting => {
        const meetingObj = meeting.toObject();
        const linkExpired = attendanceTrackingService.isMeetingLinkExpired(meeting);
        const shouldHideLink = linkExpired || meetingObj.status === 'cancelled';
        
        return {
          id: meetingObj.id,
          title: meetingObj.title,
          description: meetingObj.description,
          start_time: meetingObj.start_time,
          end_time: meetingObj.end_time,
          meet_link: shouldHideLink ? null : meetingObj.meet_link, // Hide link if expired or cancelled
          calendar_link: meetingObj.calendar_link,
          event_id: meetingObj.event_id,
          attendees: meetingObj.attendees || [],
          host_id: meetingObj.host_id,
          status: meetingObj.status,
          created_at: meetingObj.created_at,
          linkExpired: linkExpired,
          linkExpiresAt: meetingObj.linkExpiresAt,
          isPermanent: meetingObj.isPermanent || true
        };
      })
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch meetings',
      details: error.message
    });
  }
});

// /delete-meeting/:id - Cancel meeting (mark as cancelled, but keep record permanent)
// Note: Meeting records are permanent and never actually deleted
router.delete('/delete-meeting/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await Meeting.findOne({ id });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const requesterId = req.user._id.toString();
    if (meeting.host_id.toString() !== requesterId) {
      return res.status(403).json({ error: 'You can only cancel your own meetings' });
    }

    // Delete from Google Calendar using service (handles OAuth client)
    const userId = req.user._id;
    try {
      await googleMeetService.deleteCalendarEvent(userId, meeting.event_id);
      console.log('Meeting deleted from Google Calendar:', meeting.event_id);
    } catch (googleError) {
      console.error('Error deleting event from Google Calendar:', googleError);
      const status = googleError?.code || googleError?.response?.status;
      if (status !== 404 && status !== 410) {
        console.warn('Proceeding with marking meeting cancelled in DB despite Google error');
      }
    }

    // Mark as cancelled but keep the record (permanent storage)
    await Meeting.updateOne(
      { id },
      {
        $set: {
          status: 'cancelled',
          linkExpiresAt: new Date(),
          meet_link: meeting.meet_link || 'Meeting link disabled'
        }
      }
    );

    res.json({ 
      success: true, 
      message: 'Meeting cancelled successfully. Record kept for permanent storage.',
      note: 'Meeting records are permanent and cannot be deleted'
    });
  } catch (error) {
    console.error('Cancel meeting error:', error);
    
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
      error: 'Failed to cancel meeting',
      details: error.message
    });
  }
});

// Complete meeting and process attendance using real Google Calendar data
router.post('/:meetingId/complete', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { conferenceId } = req.body;
    const userId = req.user._id;

    const meeting = await Meeting.findOne({ id: meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user is the host
    if (meeting.host_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the meeting host can complete meetings' });
    }

    // Use the attendance tracking service to get real attendance data
    const result = await attendanceTrackingService.processMeetingAttendance(meetingId, userId);

    // Update conference ID if provided
    if (conferenceId) {
      meeting.attendance_conference_id = conferenceId;
      await meeting.save();
    }

    res.json({
      success: true,
      message: 'Meeting completed and attendance processed from Google Calendar',
      meeting: {
        id: meeting.id,
        status: meeting.status,
        attendance_processed_at: meeting.attendance_processed_at,
        attendance_count: result.attendance.length,
        summary: result.summary
      }
    });
  } catch (error) {
    console.error('Error completing meeting:', error);
    
    // If Google Calendar fetch fails, fall back to manual processing
    if (error.message && error.message.includes('Google Calendar')) {
      console.log('Falling back to manual attendance processing...');
      
      try {
        const meetingId = req.params.meetingId;
        const userId = req.user._id;
        const meeting = await Meeting.findOne({ id: meetingId });
        
        if (!meeting) {
          return res.status(404).json({ error: 'Meeting not found' });
        }

        // Fallback to old method
        const meetingDuration = meeting.end_time && meeting.start_time
          ? Math.round((new Date(meeting.end_time) - new Date(meeting.start_time)) / (1000 * 60))
          : 0;

        let attendance = [];
        if (meeting.attendance_logs && meeting.attendance_logs.length > 0) {
          const meetingStartTime = meeting.start_time ? new Date(meeting.start_time) : null;
          const meetingEndTime = meeting.end_time ? new Date(meeting.end_time) : null;
          
          attendance = meeting.attendance_logs.map(log => {
            const joinEvents = log.events.filter(e => e.type === 'join');
            const leaveEvents = log.events.filter(e => e.type === 'leave');
            
            // Get join time: use first join event, or infer from meeting start if only leave events exist
            let joinTime = joinEvents.length > 0 ? new Date(joinEvents[0].timestamp) : null;
            const leaveTime = leaveEvents.length > 0 ? new Date(leaveEvents[leaveEvents.length - 1].timestamp) : null;
            
            // If we have a leave time but no join time, infer join time from meeting start
            if (!joinTime && leaveTime) {
              if (meetingStartTime && meetingStartTime <= leaveTime) {
                joinTime = meetingStartTime;
              } else {
                joinTime = leaveTime;
              }
            }
            
            // Calculate duration
            let duration = 0;
            if (joinTime && leaveTime) {
              duration = Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60));
            } else if (joinTime && meetingEndTime) {
              duration = Math.round((meetingEndTime.getTime() - joinTime.getTime()) / (1000 * 60));
            } else if (joinTime && !meetingEndTime) {
              duration = meetingDuration;
            } else if (leaveTime && meetingStartTime) {
              duration = Math.round((leaveTime.getTime() - meetingStartTime.getTime()) / (1000 * 60));
            }

            duration = Math.max(0, duration);

            const attendancePercentage = meetingDuration > 0 
              ? Math.round((duration / meetingDuration) * 100) 
              : (duration > 0 ? 100 : 0);

            let attendanceStatus = 'Absent';
            if (attendancePercentage >= 80) {
              attendanceStatus = 'Present';
            } else if (attendancePercentage >= 30) {
              attendanceStatus = 'Partial';
            } else if (duration > 0) {
              attendanceStatus = 'Partial';
            }

            return {
              email: log.email,
              name: log.name || log.email.split('@')[0],
              joinTime: joinTime ? joinTime.toISOString() : null,
              leaveTime: leaveTime ? leaveTime.toISOString() : null,
              duration: duration,
              sessions: joinEvents.map((join, idx) => ({
                joinedAt: join.timestamp,
                leftAt: leaveEvents[idx]?.timestamp || null,
                duration: leaveEvents[idx] 
                  ? Math.round((new Date(leaveEvents[idx].timestamp) - new Date(join.timestamp)) / (1000 * 60))
                  : 0
              })),
              attendancePercentage: attendancePercentage,
              attendanceStatus: attendanceStatus,
              statusColor: attendanceStatus === 'Present' ? 'green' : attendanceStatus === 'Partial' ? 'yellow' : 'red'
            };
          });
        } else if (meeting.expected_attendees && meeting.expected_attendees.length > 0) {
          attendance = meeting.expected_attendees.map(attendee => ({
            email: attendee.email,
            name: attendee.name || attendee.email.split('@')[0],
            joinTime: null,
            leaveTime: null,
            duration: 0,
            sessions: [],
            attendancePercentage: 0,
            attendanceStatus: 'Absent',
            statusColor: 'red'
          }));
        }

        const summary = {
          totalParticipants: attendance.length,
          presentCount: attendance.filter(a => a.attendanceStatus === 'Present').length,
          partialCount: attendance.filter(a => a.attendanceStatus === 'Partial').length,
          absentCount: attendance.filter(a => a.attendanceStatus === 'Absent').length
        };

        meeting.status = 'completed';
        meeting.total_duration = meetingDuration;
        if (req.body.conferenceId) {
          meeting.attendance_conference_id = req.body.conferenceId;
        }
        meeting.attendance = attendance;
        meeting.attendance_summary = summary;
        meeting.attendance_processed_at = new Date();
        await meeting.save();

        return res.json({
          success: true,
          message: 'Meeting completed and attendance processed (fallback method)',
          meeting: {
            id: meeting.id,
            status: meeting.status,
            attendance_processed_at: meeting.attendance_processed_at,
            attendance_count: attendance.length
          }
        });
      } catch (fallbackError) {
        console.error('Fallback processing also failed:', fallbackError);
        return res.status(500).json({
          error: 'Failed to process attendance',
          details: fallbackError.message
        });
      }
    }
    
    return res.status(500).json({
      error: 'Failed to complete meeting',
      details: error.message
    });
  }
});

// Get attendance data (with option to refresh from Google Calendar)
router.get('/:meetingId/attendance', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { refresh } = req.query; // ?refresh=true to fetch latest from Google Calendar
    const userId = req.user._id;

    const meeting = await Meeting.findOne({ id: meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user is the host
    if (meeting.host_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the meeting host can view attendance' });
    }

    // If refresh is requested, fetch latest from Google Calendar
    if (refresh === 'true') {
      try {
        await attendanceTrackingService.processMeetingAttendance(meetingId, userId);
        // Reload meeting to get updated attendance
        await meeting.populate();
        const updatedMeeting = await Meeting.findOne({ id: meetingId });
        return res.json({
          success: true,
          attendance: updatedMeeting.attendance || [],
          summary: updatedMeeting.attendance_summary || {
            totalParticipants: 0,
            presentCount: 0,
            partialCount: 0,
            absentCount: 0
          },
          refreshed: true
        });
      } catch (refreshError) {
        console.warn('Could not refresh from Google Calendar, returning stored data:', refreshError.message);
        // Continue to return stored data
      }
    }

    res.json({
      success: true,
      attendance: meeting.attendance || [],
      summary: meeting.attendance_summary || {
        totalParticipants: 0,
        presentCount: 0,
        partialCount: 0,
        absentCount: 0
      },
      refreshed: false
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      error: 'Failed to fetch attendance',
      details: error.message
    });
  }
});

// Download attendance PDF
// IMPORTANT: This route must come before other routes with :meetingId to avoid conflicts
router.get('/:meetingId/attendance/pdf', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user._id;

    console.log('📥 Attendance PDF download request:', { meetingId, userId });

    const meeting = await Meeting.findOne({ id: meetingId });
    if (!meeting) {
      console.log('❌ Meeting not found:', meetingId);
      return res.status(404).json({ error: 'Meeting not found' });
    }

    console.log('✅ Meeting found:', {
      id: meeting.id,
      title: meeting.title,
      host_id: meeting.host_id,
      hasAttendance: !!meeting.attendance,
      attendanceLength: meeting.attendance?.length || 0,
      hasLogs: !!meeting.attendance_logs,
      logsLength: meeting.attendance_logs?.length || 0,
      hasExpectedAttendees: !!meeting.expected_attendees,
      expectedAttendeesLength: meeting.expected_attendees?.length || 0,
      hasAttendees: !!meeting.attendees,
      attendeesLength: meeting.attendees?.length || 0
    });

    // Verify user is the host
    if (meeting.host_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the meeting host can download attendance PDF' });
    }

    // Generate attendance from logs if not already processed
    let attendance = meeting.attendance || [];
    let meetingDuration = 0;
    
    try {
      if (meeting.end_time && meeting.start_time) {
        const start = new Date(meeting.start_time);
        const end = new Date(meeting.end_time);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          meetingDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        }
      }
    } catch (error) {
      console.error('Error calculating meeting duration:', error);
      meetingDuration = 0;
    }
    
    if (attendance.length === 0) {

      // First, try to generate from attendance_logs
      if (meeting.attendance_logs && meeting.attendance_logs.length > 0) {
        const meetingStartTime = meeting.start_time ? new Date(meeting.start_time) : null;
        const meetingEndTime = meeting.end_time ? new Date(meeting.end_time) : null;
        
        attendance = meeting.attendance_logs.map(log => {
          const joinEvents = log.events.filter(e => e.type === 'join');
          const leaveEvents = log.events.filter(e => e.type === 'leave');
          
          // Get join time: use first join event, or infer from meeting start if only leave events exist
          let joinTime = joinEvents.length > 0 ? new Date(joinEvents[0].timestamp) : null;
          const leaveTime = leaveEvents.length > 0 ? new Date(leaveEvents[leaveEvents.length - 1].timestamp) : null;
          
          // If we have a leave time but no join time, infer join time from meeting start
          // If meeting start is not available, use the leave time itself (they were present at least at that moment)
          if (!joinTime && leaveTime) {
            if (meetingStartTime && meetingStartTime <= leaveTime) {
              joinTime = meetingStartTime;
            } else {
              // If meeting start is after leave time (shouldn't happen), use leave time as join time
              joinTime = leaveTime;
            }
          }
          
          // Calculate duration
          let duration = 0;
          if (joinTime && leaveTime) {
            duration = Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60));
          } else if (joinTime && meetingEndTime) {
            // If they joined but didn't leave, calculate from join to meeting end
            duration = Math.round((meetingEndTime.getTime() - joinTime.getTime()) / (1000 * 60));
          } else if (joinTime && !meetingEndTime) {
            // If meeting hasn't ended, use full duration if they joined
            duration = meetingDuration;
          } else if (leaveTime && meetingStartTime) {
            // If they left but we inferred join time from meeting start
            duration = Math.round((leaveTime.getTime() - meetingStartTime.getTime()) / (1000 * 60));
          }

          // Ensure duration is not negative
          duration = Math.max(0, duration);

          const attendancePercentage = meetingDuration > 0 
            ? Math.round((duration / meetingDuration) * 100) 
            : (duration > 0 ? 100 : 0); // If meeting duration is 0 but they have duration, mark as 100%

          let attendanceStatus = 'Absent';
          if (attendancePercentage >= 80) {
            attendanceStatus = 'Present';
          } else if (attendancePercentage >= 30) {
            attendanceStatus = 'Partial';
          } else if (duration > 0) {
            // If they have any duration, mark as Partial (at least they were there)
            attendanceStatus = 'Partial';
          }

          return {
            email: log.email,
            name: log.name || log.email.split('@')[0],
            joinTime: joinTime ? joinTime.toISOString() : null,
            leaveTime: leaveTime ? leaveTime.toISOString() : null,
            duration: duration,
            sessions: joinEvents.map((join, idx) => ({
              joinedAt: join.timestamp,
              leftAt: leaveEvents[idx]?.timestamp || null,
              duration: leaveEvents[idx] 
                ? Math.round((new Date(leaveEvents[idx].timestamp) - new Date(join.timestamp)) / (1000 * 60))
                : 0
            })),
            attendancePercentage: attendancePercentage,
            attendanceStatus: attendanceStatus,
            statusColor: attendanceStatus === 'Present' ? 'green' : attendanceStatus === 'Partial' ? 'yellow' : 'red'
          };
        });
      } 
      // If no logs, try to generate from expected_attendees
      else if (meeting.expected_attendees && meeting.expected_attendees.length > 0) {
        attendance = meeting.expected_attendees.map(attendee => ({
          email: attendee.email,
          name: attendee.name || attendee.email.split('@')[0],
          joinTime: null,
          leaveTime: null,
          duration: 0,
          sessions: [],
          attendancePercentage: 0,
          attendanceStatus: 'Absent',
          statusColor: 'red'
        }));
      }
      // If no logs and no expected attendees, try from attendees (invited list)
      else if (meeting.attendees && meeting.attendees.length > 0) {
        attendance = meeting.attendees.map(attendee => ({
          email: attendee.email,
          name: attendee.name || attendee.email.split('@')[0],
          joinTime: null,
          leaveTime: null,
          duration: 0,
          sessions: [],
          attendancePercentage: 0,
          attendanceStatus: 'Absent',
          statusColor: 'red'
        }));
      }
    }

    // Always allow download, even if attendance is empty (return empty attendance)
    // This prevents 400 errors and allows users to download the meeting structure

    // Always recalculate summary from current attendance array to ensure accuracy
    const summary = {
      totalParticipants: attendance.length,
      presentCount: attendance.filter(a => a.attendanceStatus === 'Present').length,
      partialCount: attendance.filter(a => a.attendanceStatus === 'Partial').length,
      absentCount: attendance.filter(a => a.attendanceStatus === 'Absent').length
    };

    // Generate PDF response using pdfkit
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${meetingId}.pdf"`);
    doc.pipe(res);

    const formatDate = (value) => {
      if (!value) return 'Not recorded';
      try {
        return new Date(value).toLocaleString();
      } catch {
        return value;
      }
    };

    doc.fontSize(20).text('Google Meeting Attendance', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Title: ${meeting.title}`);
    doc.text(`Start Time: ${formatDate(meeting.start_time)}`);
    doc.text(`End Time: ${formatDate(meeting.end_time)}`);
    doc.text(`Total Duration: ${meeting.total_duration || meetingDuration || 0} mins`);
    doc.text(`Generated At: ${formatDate(new Date())}`);
    doc.moveDown();

    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12).text(`Total Participants: ${summary.totalParticipants}`);
    doc.text(`Present: ${summary.presentCount}`);
    doc.text(`Partial: ${summary.partialCount}`);
    doc.text(`Absent: ${summary.absentCount}`);
    doc.moveDown();

    doc.fontSize(14).text('Attendance Details', { underline: true });
    doc.moveDown(0.5);

    if (attendance.length === 0) {
      doc.fontSize(12).text('No attendance records available.');
    } else {
      attendance.forEach((record, index) => {
        doc.fontSize(12).text(`${index + 1}. ${record.name || record.email}`);
        doc.fontSize(10)
          .text(`Email: ${record.email}`)
          .text(`Status: ${record.attendanceStatus || 'Unknown'}`)
          .text(`Join Time: ${formatDate(record.joinTime)}`)
          .text(`Leave Time: ${formatDate(record.leaveTime)}`)
          .text(`Duration: ${record.duration || 0} mins`)
          .text(`Attendance %: ${record.attendancePercentage ?? 0}%`);
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (error) {
    console.error('Error downloading attendance PDF:', error);
    res.status(500).json({
      error: 'Failed to download attendance PDF',
      details: error.message
    });
  }
});

// Log join event
router.post('/:meetingId/log-join', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { email, name } = req.body;
    const userId = req.user._id;

    const meeting = await Meeting.findOne({ id: meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Add join event to attendance logs
    if (!meeting.attendance_logs) {
      meeting.attendance_logs = [];
    }

    let participantLog = meeting.attendance_logs.find(
      log => log.email === email
    );

    if (!participantLog) {
      participantLog = {
        email,
        name: name || email.split('@')[0],
        events: []
      };
      meeting.attendance_logs.push(participantLog);
    }

    participantLog.events.push({
      type: 'join',
      timestamp: new Date()
    });

    await meeting.save();

    res.json({
      success: true,
      message: 'Join event logged'
    });
  } catch (error) {
    console.error('Error logging join:', error);
    res.status(500).json({
      error: 'Failed to log join event',
      details: error.message
    });
  }
});

// Log leave event
router.post('/:meetingId/log-leave', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { email, name } = req.body;
    const userId = req.user._id;

    const meeting = await Meeting.findOne({ id: meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Add leave event to attendance logs
    if (!meeting.attendance_logs) {
      meeting.attendance_logs = [];
    }

    let participantLog = meeting.attendance_logs.find(
      log => log.email === email
    );

    if (!participantLog) {
      participantLog = {
        email,
        name: name || email.split('@')[0],
        events: []
      };
      meeting.attendance_logs.push(participantLog);
    }

    participantLog.events.push({
      type: 'leave',
      timestamp: new Date()
    });

    await meeting.save();

    res.json({
      success: true,
      message: 'Leave event logged'
    });
  } catch (error) {
    console.error('Error logging leave:', error);
    res.status(500).json({
      error: 'Failed to log leave event',
      details: error.message
    });
  }
});

module.exports = router;

