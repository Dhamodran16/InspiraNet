const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all events with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, date, search } = req.query;
    
    let query = {};
    
    // Add filters
    if (type) query.type = type;
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: targetDate, $lt: nextDay };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query)
      .sort({ date: 1, time: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalEvents = await Event.countDocuments(query);

    res.json({
      events,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      totalEvents
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get a specific event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create a new event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, date, time, location, type, description, attendees } = req.body;
    
    const newEvent = new Event({
      title,
      date,
      time,
      location,
      type,
      description,
      attendees: attendees || 0,
      createdBy: req.user.name
    });
    
    const savedEvent = await newEvent.save();

    // realtime broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('event_update', { event: savedEvent, timestamp: new Date() });
    }
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update an event (creator only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, date, time, location, type, description, attendees } = req.body;
    
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.createdBy !== req.user.name) {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    event.title = title || event.title;
    event.date = date || event.date;
    event.time = time || event.time;
    event.location = location || event.location;
    event.type = type || event.type;
    event.description = description || event.description;
    event.attendees = attendees || event.attendees;
    event.updatedAt = new Date();
    
    const updatedEvent = await event.save();
    const io = req.app.get('io');
    if (io) {
      io.emit('event_update', { event: updatedEvent, timestamp: new Date() });
    }
    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete an event (creator only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.createdBy !== req.user.name) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// RSVP to an event
router.post('/:id/rsvp', authenticateToken, async (req, res) => {
  try {
    const { action } = req.body; // 'join' or 'leave'
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (action === 'join') {
      if (!event.attendees.includes(req.user._id)) {
        event.attendees.push(req.user._id);
      }
    } else if (action === 'leave') {
      event.attendees = event.attendees.filter(id => id.toString() !== req.user._id.toString());
    }

    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({ error: 'Failed to update RSVP' });
  }
});

// Get upcoming events
router.get('/upcoming/events', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = await Event.find({
      date: { $gte: today }
    })
    .sort({ date: 1, time: 1 })
    .limit(5);

    res.json(upcomingEvents);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Get events by type
router.get('/type/:eventType', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const events = await Event.find({ type: req.params.eventType })
      .sort({ date: 1, time: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalEvents = await Event.countDocuments({ type: req.params.eventType });

    res.json({
      events,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      totalEvents
    });
  } catch (error) {
    console.error('Error fetching events by type:', error);
    res.status(500).json({ error: 'Failed to fetch events by type' });
  }
});

module.exports = router;
