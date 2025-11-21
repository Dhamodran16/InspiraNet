const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:8083',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Working server running',
    timestamp: new Date().toISOString()
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  console.log('Login endpoint hit');
  res.json({
    success: true,
    token: 'demo-token-123',
    user: {
      id: 'demo-user',
      name: 'Demo User',
      email: 'demo@example.com'
    }
  });
});

// Google Calendar OAuth endpoints
app.get('/api/calendar-meetings/auth/google', (req, res) => {
  console.log('Google auth URL endpoint hit');
  // Generate a mock Google OAuth URL
  const authUrl = 'https://accounts.google.com/oauth/authorize?client_id=demo&redirect_uri=http://localhost:5000/auth/google/callback&scope=https://www.googleapis.com/auth/calendar&response_type=code';
  res.json({
    success: true,
    authUrl: authUrl
  });
});

app.post('/api/calendar-meetings/auth/google/callback', (req, res) => {
  console.log('Google auth callback endpoint hit');
  res.json({
    success: true,
    message: 'Authorization successful',
    tokens: {
      access_token: 'demo-access-token',
      refresh_token: 'demo-refresh-token',
      expiry_date: Date.now() + 3600000
    }
  });
});

app.get('/api/calendar-meetings/auth/validate', (req, res) => {
  console.log('Google auth validate endpoint hit');
  res.json({
    success: true,
    connected: true,
    message: 'Google Calendar connection is valid'
  });
});

// Generate Google Meet link with proper format
const generateGoogleMeetLink = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  
  // Generate 3 letters for first part
  let part1 = '';
  for (let i = 0; i < 3; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Generate 4 letters for second part
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Generate 3 letters for third part
  let part3 = '';
  for (let i = 0; i < 3; i++) {
    part3 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const meetingCode = `${part1}-${part2}-${part3}`;
  return `https://meet.google.com/${meetingCode}`;
};

// Google Calendar meeting endpoints
app.post('/api/calendar-meetings/create-meeting', (req, res) => {
  console.log('Create meeting endpoint hit');
  const { title, description, start_time, end_time } = req.body;
  
  const newMeeting = {
    id: `meeting_${Date.now()}`,
    title: title || 'Test Meeting',
    description: description || 'Test meeting created',
    start_time: start_time || new Date().toISOString(),
    end_time: end_time || new Date(Date.now() + 3600000).toISOString(),
    meet_link: generateGoogleMeetLink(),
    event_link: `https://calendar.google.com/calendar/event?eid=demo_${Date.now()}`,
    host_name: 'Demo Host',
    host_email: 'demo@example.com',
    status: 'active',
    meeting_status: 'upcoming',
    attendees: [],
    created_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Meeting created successfully',
    meeting: newMeeting
  });
});

app.get('/api/calendar-meetings/meetings', (req, res) => {
  console.log('Get meetings endpoint hit');
  const { status = 'active', host_id, upcoming_only = false } = req.query;
  
  // Generate some demo meetings
  const demoMeetings = [
    {
      id: 'meeting_1',
      title: 'Math Class Discussion',
      description: 'Weekly math class discussion and problem solving',
      start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      end_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      meet_link: 'https://meet.google.com/abc-defg-hij',
      event_link: 'https://calendar.google.com/calendar/event?eid=demo_1',
      host_name: 'Dr. Smith',
      host_email: 'dr.smith@example.com',
      status: 'active',
      meeting_status: 'upcoming',
      attendees: [],
      created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: 'meeting_2',
      title: 'Project Review Meeting',
      description: 'Review progress on the current project',
      start_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      end_time: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now
      meet_link: 'https://meet.google.com/xyz-wqrs-mno',
      event_link: 'https://calendar.google.com/calendar/event?eid=demo_2',
      host_name: 'Prof. Johnson',
      host_email: 'prof.johnson@example.com',
      status: 'active',
      meeting_status: 'upcoming',
      attendees: [],
      created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    }
  ];
  
  res.json({
    success: true,
    meetings: demoMeetings
  });
});

app.get('/api/calendar-meetings/meetings/:id', (req, res) => {
  console.log('Get specific meeting endpoint hit');
  const { id } = req.params;
  
  const meeting = {
    id: id,
    title: 'Sample Meeting',
    description: 'This is a sample meeting',
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    meet_link: 'https://meet.google.com/sample-meeting',
    event_link: 'https://calendar.google.com/calendar/event?eid=sample',
    host_name: 'Demo Host',
    host_email: 'demo@example.com',
    status: 'active',
    meeting_status: 'upcoming',
    attendees: [],
    created_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    meeting: meeting
  });
});

app.delete('/api/calendar-meetings/delete-meeting/:id', (req, res) => {
  console.log('Delete meeting endpoint hit');
  const { id } = req.params;
  
  res.json({
    success: true,
    message: 'Meeting deleted successfully'
  });
});

app.patch('/api/calendar-meetings/meetings/:id/status', (req, res) => {
  console.log('Update meeting status endpoint hit');
  const { id } = req.params;
  const { status } = req.body;
  
  res.json({
    success: true,
    message: 'Meeting status updated successfully',
    meeting: {
      id: id,
      status: status
    }
  });
});

app.post('/api/calendar-meetings/auth/refresh-token', (req, res) => {
  console.log('Refresh token endpoint hit');
  res.json({
    success: true,
    message: 'Tokens refreshed successfully',
    tokens: {
      access_token: 'new-demo-access-token',
      refresh_token: 'new-demo-refresh-token',
      expiry_date: Date.now() + 3600000
    }
  });
});

// Google Meet endpoints (for backward compatibility)
app.get('/api/google-meet/rooms', (req, res) => {
  console.log('Google Meet rooms endpoint hit');
  res.json({
    success: true,
    rooms: [
      {
        room_id: 'demo_1',
        room_name: 'Demo Math Class',
        meet_link: 'https://meet.google.com/fiz-riuc-vtg',
        host_name: 'Demo Host',
        description: 'This is a demo room',
        created_at: new Date().toISOString(),
        current_participants: 0,
        max_participants: 100,
        room_url: 'https://meet.google.com/fiz-riuc-vtg',
        is_host: false,
        tags: ['math', 'education'],
        is_public: true
      }
    ],
    pagination: {
      page: 1,
      limit: 12,
      total: 1,
      totalPages: 1
    }
  });
});

app.post('/api/google-meet/create-room', (req, res) => {
  console.log('Google Meet create room endpoint hit');
  const { room_name, meet_link } = req.body;
  
  const newRoom = {
    room_id: `demo_${Date.now()}`,
    room_name: room_name || 'Test Room',
    meet_link: meet_link || generateGoogleMeetLink(),
    host_name: 'Demo Host',
    description: 'Test room created',
    created_at: new Date().toISOString(),
    current_participants: 0,
    max_participants: 100,
    room_url: meet_link || generateGoogleMeetLink(),
    is_host: true,
    tags: [],
    is_public: true
  };
  
  res.json({
    success: true,
    room: newRoom
  });
});

app.post('/api/google-meet/rooms/:id/join', (req, res) => {
  console.log('Google Meet join room endpoint hit');
  res.json({
    success: true,
    message: 'Joined room successfully'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Working server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Google Calendar API: http://localhost:${PORT}/api/calendar-meetings/`);
  console.log(`🔗 Google Meet API: http://localhost:${PORT}/api/google-meet/`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth/`);
});
