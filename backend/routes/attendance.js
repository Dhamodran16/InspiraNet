const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const googleMeetService = require('../services/googleMeetService');
const MeetingTracker = require('../services/meetingTracker');
const PDFGenerator = require('../services/pdfGenerator');

// Reuse auth middleware from meetings route
const jwt = require('jsonwebtoken');
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Complete meeting and compute attendance
router.post('/meetings/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let { conferenceId } = req.body;

    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const requesterId = (req.user.userId || req.user._id || req.user.id || '').toString();
    if (meeting.host_id.toString() !== requesterId) {
      return res.status(403).json({ error: 'Only the host can complete the meeting' });
    }

    // Fallback to stored conference_id if client didn't supply
    if (!conferenceId) {
      conferenceId = meeting.conference_id || meeting.event_id; // best-effort fallback
    }

    const userId = req.user.userId || req.user._id || req.user.id;
    let participants = [];
    let calcPct = (d, total) => {
      if (!total || total <= 0) return 0;
      return Math.round((d / total) * 100);
    };
    let statusFor = (pct) => {
      if (pct >= 75) return { status: 'Present', colorCode: '#4CAF50' };
      if (pct >= 50) return { status: 'Partial', colorCode: '#FFC107' };
      return { status: 'Absent', colorCode: '#F44336' };
    };

    try {
      await googleMeetService.initializeClient(userId);
      const tracker = new MeetingTracker(googleMeetService.oauth2Client);
      // Prefer tracker helpers if available
      calcPct = (d, total) => tracker.calculateAttendancePercentage(d, total);
      statusFor = (pct) => tracker.getAttendanceStatus(pct);
      if (conferenceId) {
        participants = await tracker.getParticipantData(conferenceId);
      }
    } catch (fetchErr) {
      console.error('Attendance fetch warning:', fetchErr);
      participants = [];
    }

    const totalDuration = Math.max(0, Math.round((new Date(meeting.end_time) - new Date(meeting.start_time)) / (1000 * 60)) || 0);

    // If Google API returned nothing, fall back to host + attendees list so PDF has rows
    if (!participants || participants.length === 0) {
      const fallback = [];
      // Include host if we can identify
      const hostEmail = req.user?.email || '';
      const hostName = req.user?.name || (hostEmail ? hostEmail.split('@')[0] : 'Host');
      if (hostEmail) {
        fallback.push({
          email: hostEmail,
          name: hostName,
          joinTime: null,
          leaveTime: null,
          duration: totalDuration, // assume host present for full duration
          sessions: []
        });
      }
      if (Array.isArray(meeting.attendees)) {
        for (const a of meeting.attendees) {
          // Avoid duplicating host
          if (a.email && a.email === hostEmail) continue;
          fallback.push({
            email: a.email || 'Unknown',
            name: a.name || (a.email ? a.email.split('@')[0] : 'Unknown'),
            joinTime: null,
            leaveTime: null,
            duration: 0,
            sessions: []
          });
        }
      }
      // Add expected_attendees if defined
      if (Array.isArray(meeting.expected_attendees)) {
        for (const a of meeting.expected_attendees) {
          if (a.email && fallback.find(f => f.email?.toLowerCase() === a.email.toLowerCase())) continue;
          fallback.push({
            email: a.email || 'Unknown',
            name: a.name || (a.email ? a.email.split('@')[0] : 'Unknown'),
            joinTime: null,
            leaveTime: null,
            duration: 0,
            sessions: []
          });
        }
      }
      // Enrich names from user profiles when available
      try {
        const emails = fallback.filter(f => !!f.email).map(f => f.email.toLowerCase());
        if (emails.length > 0) {
          const users = await User.find({ $or: [
            { 'email.college': { $in: emails } },
            { 'email.personal': { $in: emails } }
          ]}).select('name email studentInfo');
          const emailToName = new Map();
          const emailToYear = new Map();
          users.forEach(u => {
            const e = (u.email?.college || u.email?.personal || '').toLowerCase();
            if (e) emailToName.set(e, u.name);
            if (e) emailToYear.set(e, u.studentInfo?.joinYear || null);
          });
          for (const p of fallback) {
            const key = (p.email || '').toLowerCase();
            if (emailToName.has(key)) {
              p.name = emailToName.get(key);
            }
            if (emailToYear.has(key)) {
              p.currentYear = emailToYear.get(key);
            }
          }
        }
      } catch (nameErr) {
        console.warn('Name enrichment warning:', nameErr?.message);
      }
      participants = fallback;
    }

    // Merge client-side logs to compute durations if Google API failed
    if (participants.length === 0 && Array.isArray(meeting.attendance_logs) && meeting.attendance_logs.length > 0) {
      const computed = [];
      for (const log of meeting.attendance_logs) {
        let minutes = 0;
        // Pair join/leave events in order
        const events = (log.events || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        let lastJoin = null;
        for (const ev of events) {
          if (ev.type === 'join') {
            lastJoin = new Date(ev.timestamp);
          } else if (ev.type === 'leave' && lastJoin) {
            minutes += Math.max(0, Math.round((new Date(ev.timestamp) - lastJoin) / (1000 * 60)));
            lastJoin = null;
          }
        }
        // If still joined at meeting end, close with meeting.end_time
        if (lastJoin) {
          minutes += Math.max(0, Math.round((new Date(meeting.end_time) - lastJoin) / (1000 * 60)));
        }
        computed.push({
          email: log.email,
          name: log.name,
          joinTime: null,
          leaveTime: null,
          duration: minutes,
          sessions: []
        });
      }
      participants = computed;
    }

    const processed = participants.map(p => {
      const percentage = calcPct(p.duration, totalDuration);
      const status = statusFor(percentage);
      return { ...p, attendancePercentage: percentage, attendanceStatus: status.status, statusColor: status.colorCode };
    });

    meeting.attendance = processed;
    meeting.total_duration = totalDuration;
    meeting.attendance_conference_id = conferenceId;
    meeting.attendance_processed_at = new Date();
    meeting.attendance_summary = {
      totalParticipants: processed.length,
      presentCount: processed.filter(p => p.attendanceStatus === 'Present').length,
      partialCount: processed.filter(p => p.attendanceStatus === 'Partial').length,
      absentCount: processed.filter(p => p.attendanceStatus === 'Absent').length
    };
    try {
      await meeting.save();
    } catch (saveErr) {
      console.error('Attendance save warning:', saveErr);
    }

    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        totalDuration,
        participants: processed
      }
    });
  } catch (error) {
    console.error('Error completing meeting:', error);
    // Return graceful fallback so UI can still download an empty PDF
    return res.status(200).json({ success: true, meeting: { id: req.params.id, title: 'Unknown', totalDuration: 0, participants: [] } });
  }
});

// Client-side join log
router.post('/meetings/:id/log-join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name } = req.body || {};
    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const logEmail = (email || req.user?.email || '').toLowerCase();
    const logName = name || req.user?.name || (logEmail ? logEmail.split('@')[0] : 'Unknown');
    if (!logEmail) return res.status(400).json({ error: 'Email required to log attendance' });

    const logs = meeting.attendance_logs || [];
    let entry = logs.find(l => (l.email || '').toLowerCase() === logEmail);
    if (!entry) {
      entry = { email: logEmail, name: logName, events: [] };
      logs.push(entry);
    }
    entry.name = entry.name || logName;
    entry.events.push({ type: 'join', timestamp: new Date() });
    meeting.attendance_logs = logs;
    await meeting.save();
    res.json({ success: true });
  } catch (e) {
    console.error('log-join error:', e);
    res.status(500).json({ error: 'Failed to log join' });
  }
});

// Client-side leave log
router.post('/meetings/:id/log-leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name } = req.body || {};
    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const logEmail = (email || req.user?.email || '').toLowerCase();
    const logName = name || req.user?.name || (logEmail ? logEmail.split('@')[0] : 'Unknown');
    if (!logEmail) return res.status(400).json({ error: 'Email required to log attendance' });

    const logs = meeting.attendance_logs || [];
    let entry = logs.find(l => (l.email || '').toLowerCase() === logEmail);
    if (!entry) {
      entry = { email: logEmail, name: logName, events: [] };
      logs.push(entry);
    }
    entry.name = entry.name || logName;
    entry.events.push({ type: 'leave', timestamp: new Date() });
    meeting.attendance_logs = logs;
    await meeting.save();
    res.json({ success: true });
  } catch (e) {
    console.error('log-leave error:', e);
    res.status(500).json({ error: 'Failed to log leave' });
  }
});

// Public (unauthenticated) join log for attendees joining without login
router.post('/meetings/:id/public-log-join', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email required' });
    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    const logs = meeting.attendance_logs || [];
    const key = String(email).toLowerCase();
    let entry = logs.find(l => (l.email || '').toLowerCase() === key);
    if (!entry) {
      entry = { email: key, name: name || (key.split('@')[0]), events: [] };
      logs.push(entry);
    }
    entry.name = entry.name || name || (key.split('@')[0]);
    entry.events.push({ type: 'join', timestamp: new Date() });
    meeting.attendance_logs = logs;
    await meeting.save();
    res.json({ success: true });
  } catch (e) {
    console.error('public-log-join error:', e);
    res.status(500).json({ error: 'Failed to log join' });
  }
});

// Public (unauthenticated) leave log
router.post('/meetings/:id/public-log-leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email required' });
    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    const logs = meeting.attendance_logs || [];
    const key = String(email).toLowerCase();
    let entry = logs.find(l => (l.email || '').toLowerCase() === key);
    if (!entry) {
      entry = { email: key, name: name || (key.split('@')[0]), events: [] };
      logs.push(entry);
    }
    entry.name = entry.name || name || (key.split('@')[0]);
    entry.events.push({ type: 'leave', timestamp: new Date() });
    meeting.attendance_logs = logs;
    await meeting.save();
    res.json({ success: true });
  } catch (e) {
    console.error('public-log-leave error:', e);
    res.status(500).json({ error: 'Failed to log leave' });
  }
});

// One-click join redirect (no prior attendee list required)
// Usage: GET /api/meetings/:id/join-redirect?email=someone@example.com&name=Someone
// Logs a join event, then redirects to the meeting's Google Meet URL
router.get('/meetings/:id/join-redirect', async (req, res) => {
  try {
    const { id } = req.params;
    let { email, name } = req.query || {};
    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).send('Meeting not found');

    // Build identifier even if email is missing
    const now = Date.now();
    const lowerEmail = (typeof email === 'string' && email) ? email.toLowerCase() : `anon+${now}@inspiranet.local`;
    const displayName = (typeof name === 'string' && name) ? name : (typeof email === 'string' && email ? email.split('@')[0] : 'Guest');

    const logs = meeting.attendance_logs || [];
    let entry = logs.find(l => (l.email || '').toLowerCase() === lowerEmail);
    if (!entry) {
      entry = { email: lowerEmail, name: displayName, events: [] };
      logs.push(entry);
    }
    entry.name = entry.name || displayName;
    entry.events.push({ type: 'join', timestamp: new Date() });
    meeting.attendance_logs = logs;
    await meeting.save();

    const url = meeting.meet_link || meeting.calendar_link || 'https://meet.google.com';
    res.redirect(url);
  } catch (e) {
    console.error('join-redirect error:', e);
    res.status(500).send('Failed to redirect to meeting');
  }
});

// Get attendance (host only)
router.get('/meetings/:id/attendance', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const requesterId = (req.user.userId || req.user._id || req.user.id || '').toString();
    if (meeting.host_id.toString() !== requesterId) {
      return res.status(403).json({ error: 'Only the host can view attendance' });
    }

    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.start_time,
        endTime: meeting.end_time,
        totalDuration: meeting.total_duration || 0,
        status: 'completed',
        participants: meeting.attendance || [],
        totalParticipants: (meeting.attendance || []).length,
        presentCount: (meeting.attendance || []).filter(p => p.attendanceStatus === 'Present').length,
        partialCount: (meeting.attendance || []).filter(p => p.attendanceStatus === 'Partial').length,
        absentCount: (meeting.attendance || []).filter(p => p.attendanceStatus === 'Absent').length
      }
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Download attendance PDF (host only)
router.get('/meetings/:id/attendance/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const requesterId = (req.user.userId || req.user._id || req.user.id || '').toString();
    if (meeting.host_id.toString() !== requesterId) {
      return res.status(403).json({ error: 'Only the host can download attendance' });
    }

    const pdfGenerator = new PDFGenerator();
    const pdfBuffer = await pdfGenerator.generateAttendanceReport(meeting);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;


