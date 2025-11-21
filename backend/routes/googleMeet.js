const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const GoogleMeetRoom = require('../models/GoogleMeetRoom');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateCreateRoom = [
  body('room_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be between 1 and 100 characters'),
  body('meet_link')
    .optional()
    .isURL()
    .withMessage('Must be a valid Google Meet URL')
    .custom((value) => {
      if (value && !value.includes('meet.google.com') && !value.includes('meet.google.com/')) {
        throw new Error('Must be a valid Google Meet URL');
      }
      return true;
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('scheduled_for')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('is_public must be a boolean')
];

// Generate Google Meet link
const generateGoogleMeetLink = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  
  let part1 = '';
  for (let i = 0; i < 3; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  let part3 = '';
  for (let i = 0; i < 3; i++) {
    part3 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const meetingCode = `${part1}-${part2}-${part3}`;
  return `https://meet.google.com/${meetingCode}`;
};

// Create a new Google Meet room
router.post('/create-room', authenticateToken, validateCreateRoom, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      room_name,
      meet_link,
      description,
      scheduled_for,
      tags = [],
      is_public = true
    } = req.body;

    const googleMeetLink = meet_link || generateGoogleMeetLink();

    const userId = req.user._id;
    const hostName = req.user.name;

    const room_id = `gm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newRoom = new GoogleMeetRoom({
      room_id,
      room_name,
      meet_link: googleMeetLink,
      host_id: userId,
      host_name: hostName,
      description,
      scheduled_for: scheduled_for ? new Date(scheduled_for) : null,
      tags,
      is_public
    });

    await newRoom.save();

    res.status(201).json({
      success: true,
      message: 'Google Meet room created successfully',
      room: {
        room_id: newRoom.room_id,
        room_name: newRoom.room_name,
        meet_link: newRoom.meet_link,
        host_name: newRoom.host_name,
        description: newRoom.description,
        scheduled_for: newRoom.scheduled_for,
        tags: newRoom.tags,
        is_public: newRoom.is_public,
        created_at: newRoom.created_at,
        room_url: newRoom.room_url
      }
    });
  } catch (error) {
    console.error('Error creating Google Meet room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Google Meet room'
    });
  }
});

// Get all active Google Meet rooms
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const { search, host_only, limit = 20, page = 1 } = req.query;
    const userId = req.user._id;

    let query = { status: 'active' };

    if (host_only === 'true') {
      query.host_id = userId;
    }

    if (search) {
      query.$or = [
        { room_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const rooms = await GoogleMeetRoom.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const totalRooms = await GoogleMeetRoom.countDocuments(query);

    res.json({
      success: true,
      rooms: rooms.map(room => ({
        room_id: room.room_id,
        room_name: room.room_name,
        meet_link: room.meet_link,
        host_name: room.host_name,
        description: room.description,
        scheduled_for: room.scheduled_for,
        tags: room.tags,
        is_public: room.is_public,
        created_at: room.created_at,
        current_participants: room.current_participants,
        max_participants: room.max_participants,
        room_url: room.room_url,
        is_host: room.isHost(userId)
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalRooms / limitNum),
        total_rooms: totalRooms,
        has_next: skip + limitNum < totalRooms,
        has_prev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching Google Meet rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Google Meet rooms'
    });
  }
});

// Get a specific Google Meet room
router.get('/rooms/:room_id', authenticateToken, async (req, res) => {
  try {
    const { room_id } = req.params;
    const userId = req.user._id;

    const room = await GoogleMeetRoom.findOne({ 
      room_id, 
      status: 'active' 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Google Meet room not found'
      });
    }

    res.json({
      success: true,
      room: {
        room_id: room.room_id,
        room_name: room.room_name,
        meet_link: room.meet_link,
        host_name: room.host_name,
        description: room.description,
        scheduled_for: room.scheduled_for,
        tags: room.tags,
        is_public: room.is_public,
        created_at: room.created_at,
        current_participants: room.current_participants,
        max_participants: room.max_participants,
        room_url: room.room_url,
        is_host: room.isHost(userId)
      }
    });
  } catch (error) {
    console.error('Error fetching Google Meet room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Google Meet room'
    });
  }
});

// Update a Google Meet room (host only)
router.put('/rooms/:room_id', authenticateToken, validateCreateRoom, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { room_id } = req.params;
    const userId = req.user._id;
    const {
      room_name,
      meet_link,
      description,
      scheduled_for,
      tags,
      is_public
    } = req.body;

    const room = await GoogleMeetRoom.findOne({ 
      room_id, 
      status: 'active' 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Google Meet room not found'
      });
    }

    if (!room.isHost(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the room host can update this room'
      });
    }

    if (room_name !== undefined) room.room_name = room_name;
    if (meet_link !== undefined) room.meet_link = meet_link;
    if (description !== undefined) room.description = description;
    if (scheduled_for !== undefined) room.scheduled_for = scheduled_for ? new Date(scheduled_for) : null;
    if (tags !== undefined) room.tags = tags;
    if (is_public !== undefined) room.is_public = is_public;

    await room.save();

    res.json({
      success: true,
      message: 'Google Meet room updated successfully',
      room: {
        room_id: room.room_id,
        room_name: room.room_name,
        meet_link: room.meet_link,
        host_name: room.host_name,
        description: room.description,
        scheduled_for: room.scheduled_for,
        tags: room.tags,
        is_public: room.is_public,
        created_at: room.created_at,
        current_participants: room.current_participants,
        max_participants: room.max_participants,
        room_url: room.room_url,
        is_host: true
      }
    });
  } catch (error) {
    console.error('Error updating Google Meet room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Google Meet room'
    });
  }
});

// Delete a Google Meet room (host only)
router.delete('/rooms/:room_id', authenticateToken, async (req, res) => {
  try {
    const { room_id } = req.params;
    const userId = req.user._id;

    const room = await GoogleMeetRoom.findOne({ 
      room_id, 
      status: 'active' 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Google Meet room not found'
      });
    }

    if (!room.isHost(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the room host can delete this room'
      });
    }

    await room.deleteRoom();

    res.json({
      success: true,
      message: 'Google Meet room deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Google Meet room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete Google Meet room'
    });
  }
});

// Join a Google Meet room
router.post('/rooms/:room_id/join', authenticateToken, async (req, res) => {
  try {
    const { room_id } = req.params;

    const room = await GoogleMeetRoom.findOne({ 
      room_id, 
      status: 'active' 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Google Meet room not found'
      });
    }

    if (room.current_participants >= room.max_participants) {
      return res.status(400).json({
        success: false,
        error: 'Room is at maximum capacity'
      });
    }

    room.current_participants += 1;
    await room.save();

    res.json({
      success: true,
      message: 'Successfully joined Google Meet room',
      room: {
        room_id: room.room_id,
        room_name: room.room_name,
        meet_link: room.meet_link,
        host_name: room.host_name,
        description: room.description,
        scheduled_for: room.scheduled_for,
        tags: room.tags,
        current_participants: room.current_participants,
        max_participants: room.max_participants,
        room_url: room.room_url
      }
    });
  } catch (error) {
    console.error('Error joining Google Meet room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join Google Meet room'
    });
  }
});

// Leave a Google Meet room
router.post('/rooms/:room_id/leave', authenticateToken, async (req, res) => {
  try {
    const { room_id } = req.params;

    const room = await GoogleMeetRoom.findOne({ 
      room_id, 
      status: 'active' 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Google Meet room not found'
      });
    }

    room.current_participants = Math.max(0, room.current_participants - 1);
    await room.save();

    res.json({
      success: true,
      message: 'Successfully left Google Meet room'
    });
  } catch (error) {
    console.error('Error leaving Google Meet room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave Google Meet room'
    });
  }
});

// Get room statistics
router.get('/rooms/:room_id/stats', authenticateToken, async (req, res) => {
  try {
    const { room_id } = req.params;
    const userId = req.user._id;

    const room = await GoogleMeetRoom.findOne({ 
      room_id, 
      status: 'active' 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Google Meet room not found'
      });
    }

    if (!room.isHost(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Only the room host can view statistics'
      });
    }

    res.json({
      success: true,
      stats: {
        room_id: room.room_id,
        room_name: room.room_name,
        current_participants: room.current_participants,
        max_participants: room.max_participants,
        created_at: room.created_at,
        total_views: room.current_participants,
        is_active: room.status === 'active'
      }
    });
  } catch (error) {
    console.error('Error fetching room statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room statistics'
    });
  }
});

module.exports = router;

