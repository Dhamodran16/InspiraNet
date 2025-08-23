const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Meeting rooms storage
const rooms = {};
const roomMessages = {};
const roomMeta = {};

// Enhanced room management
const RoomManager = {
  // Add participant to room
  addParticipant: (roomId, userId, userInfo) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    
    // Check if user is already in the room
    const existingIndex = rooms[roomId].findIndex(p => p.userId === userId);
    if (existingIndex >= 0) {
      // Update existing participant info
      rooms[roomId][existingIndex] = { ...rooms[roomId][existingIndex], ...userInfo };
    } else {
      // Add new participant
      rooms[roomId].push({
        userId,
        joinedAt: new Date(),
        isHost: roomMeta[roomId]?.hostId === userId,
        ...userInfo
      });
    }
    
    return rooms[roomId];
  },

  // Remove participant from room
  removeParticipant: (roomId, userId) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(p => p.userId !== userId);
      
      // If room is empty, clean it up after 5 minutes
      if (rooms[roomId].length === 0) {
        setTimeout(() => {
          if (rooms[roomId] && rooms[roomId].length === 0) {
            delete rooms[roomId];
            delete roomMessages[roomId];
            delete roomMeta[roomId];
          }
        }, 300000); // 5 minutes
      }
    }
    
    return rooms[roomId] || [];
  },

  // Get room participants
  getParticipants: (roomId) => {
    return rooms[roomId] || [];
  },

  // Check if user is in room
  isUserInRoom: (roomId, userId) => {
    return rooms[roomId]?.some(p => p.userId === userId) || false;
  },

  // Get room info
  getRoomInfo: (roomId) => {
    return {
      roomId,
      participants: rooms[roomId] || [],
      messages: roomMessages[roomId] || [],
      meta: roomMeta[roomId] || null
    };
  }
};

// Build ICE server config
function buildIceServers() {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_PASSWORD,
    });
  }
  return iceServers;
}

// Get RTC configuration
router.get('/config', authenticateToken, (req, res) => {
  res.json({ rtcConfig: { iceServers: buildIceServers() } });
});

// Create a new meeting
router.post('/create', authenticateToken, (req, res) => {
  try {
    const { title, description, scheduledFor } = req.body;
    const userId = req.user._id;
    
    // Generate unique room ID
    const roomId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create meeting room
    rooms[roomId] = [];
    roomMessages[roomId] = [];
    roomMeta[roomId] = {
      hostId: userId,
      title: title || 'Untitled Meeting',
      description: description || '',
      scheduledFor: scheduledFor || null,
      createdAt: new Date(),
      createdBy: userId.toString()
    };

    res.json({
      success: true,
      roomId,
      message: 'Meeting created successfully'
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Get meeting info
router.get('/:roomId', authenticateToken, (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomMeta[roomId]) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meetingInfo = {
      roomId,
      ...roomMeta[roomId],
      participantCount: rooms[roomId] ? rooms[roomId].length : 0
    };

    res.json({ success: true, meeting: meetingInfo });
  } catch (error) {
    console.error('Error getting meeting info:', error);
    res.status(500).json({ error: 'Failed to get meeting info' });
  }
});

// Get all active meetings
router.get('/', authenticateToken, (req, res) => {
  try {
    const activeMeetings = Object.keys(roomMeta).map(roomId => ({
      roomId,
      ...roomMeta[roomId],
      participantCount: rooms[roomId] ? rooms[roomId].length : 0
    }));

    res.json({ success: true, meetings: activeMeetings });
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

// Delete a meeting (host only)
router.delete('/:roomId', authenticateToken, (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();
    
    if (!roomMeta[roomId]) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only host can delete the meeting
    if (roomMeta[roomId].hostId !== userId) {
      return res.status(403).json({ error: 'Only the meeting host can delete this meeting' });
    }

    // Clean up meeting data
    delete rooms[roomId];
    delete roomMessages[roomId];
    delete roomMeta[roomId];

    res.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// Delete meeting (host only)
router.delete('/:roomId', authenticateToken, (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    if (!roomMeta[roomId]) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (roomMeta[roomId].hostId !== userId) {
      return res.status(403).json({ error: 'Only the host can delete the meeting' });
    }

    // Clean up meeting data
    delete rooms[roomId];
    delete roomMessages[roomId];
    delete roomMeta[roomId];

    res.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// Join meeting room
router.post('/:roomId/join', authenticateToken, (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();
    const userInfo = {
      name: req.user.name,
      avatar: req.user.avatar,
      type: req.user.type,
      department: req.user.type === 'alumni' ? req.user.alumniInfo?.currentCompany : req.user.department
    };
    
    if (!roomMeta[roomId]) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Add participant to room
    const participants = RoomManager.addParticipant(roomId, userId, userInfo);
    
    res.json({
      success: true,
      roomId,
      participants,
      meetingInfo: roomMeta[roomId]
    });
  } catch (error) {
    console.error('Error joining meeting:', error);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

// Leave meeting room
router.post('/:roomId/leave', authenticateToken, (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();
    
    // Remove participant from room
    const participants = RoomManager.removeParticipant(roomId, userId);
    
    res.json({
      success: true,
      roomId,
      participants
    });
  } catch (error) {
    console.error('Error leaving meeting:', error);
    res.status(500).json({ error: 'Failed to leave meeting' });
  }
});

// Get meeting participants
router.get('/:roomId/participants', authenticateToken, (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomMeta[roomId]) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const participants = RoomManager.getParticipants(roomId);
    
    res.json({
      success: true,
      participants
    });
  } catch (error) {
    console.error('Error getting participants:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

// Send message to meeting
router.post('/:roomId/message', authenticateToken, (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text' } = req.body;
    const userId = req.user._id.toString();
    
    if (!roomMeta[roomId]) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Initialize messages array if not exists
    if (!roomMessages[roomId]) {
      roomMessages[roomId] = [];
    }

    const message = {
      id: Date.now().toString(),
      content: content.trim(),
      type,
      sender: {
        userId,
        name: req.user.name,
        avatar: req.user.avatar
      },
      timestamp: new Date(),
      reactions: []
    };

    roomMessages[roomId].push(message);
    
    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get meeting messages
router.get('/:roomId/messages', authenticateToken, (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomMeta[roomId]) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const messages = roomMessages[roomId] || [];
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

module.exports = { router, rooms, roomMessages, roomMeta, RoomManager };
