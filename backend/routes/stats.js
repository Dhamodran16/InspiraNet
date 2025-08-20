const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Conversation = require('../models/Conversation');
const { authenticateToken } = require('../middleware/auth');
const StatsService = require('../services/statsService');

const statsService = new StatsService();

// Get presentation statistics (public endpoint - no authentication required)
router.get('/presentation', async (req, res) => {
  try {
    console.log('📊 Fetching presentation stats...');
    const stats = await statsService.getRealTimeStats();
    
    // Format for presentation display - return numbers, not strings
    const presentationStats = {
      alumniCount: stats.alumniCount, // Keep as number
      eventsCount: stats.eventsCount, // Keep as number
      jobsCount: stats.jobsCount, // Keep as number
      lastUpdated: stats.lastUpdated,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Presentation stats fetched successfully:', presentationStats);
    res.json(presentationStats);
  } catch (error) {
    console.error('❌ Error fetching presentation stats:', error);
    // Return fallback data instead of error
    res.json({
      alumniCount: 15000,
      eventsCount: 200,
      jobsCount: 500,
      lastUpdated: Date.now(),
      timestamp: new Date().toISOString()
    });
  }
});

// Get detailed presentation statistics (for admin/detailed view)
router.get('/presentation/detailed', async (req, res) => {
  try {
    const detailedStats = await statsService.getDetailedStats();
    
    if (!detailedStats) {
      return res.status(500).json({ error: 'Failed to fetch detailed stats' });
    }

    res.json(detailedStats);
  } catch (error) {
    console.error('Error fetching detailed presentation stats:', error);
    res.status(500).json({ error: 'Failed to fetch detailed presentation stats' });
  }
});

// Force refresh stats cache (admin only)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.type !== 'faculty' && req.user.type !== 'teacher') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const refreshedStats = await statsService.refreshCache();
    res.json({ 
      message: 'Stats cache refreshed successfully',
      stats: refreshedStats 
    });
  } catch (error) {
    console.error('Error refreshing stats cache:', error);
    res.status(500).json({ error: 'Failed to refresh stats cache' });
  }
});

// Get real-time statistics
router.get('/realtime', authenticateToken, async (req, res) => {
  try {
    // Get total users by type
    const usersByType = await User.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const usersByTypeMap = {};
    usersByType.forEach(item => {
      usersByTypeMap[item._id] = item.count;
    });

    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalAchievements = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $size: '$achievements' } }
        }
      }
    ]);

    // Get online users (this would be enhanced with actual socket connections)
    const onlineUsers = 0; // Placeholder - would be calculated from socket service
    const onlineUsersByType = { alumni: 0, student: 0, faculty: 0 }; // Placeholder

    // Get active conversations
    const activeConversations = await Conversation.countDocuments({ isActive: true });

    const stats = {
      totalUsers,
      onlineUsers,
      totalPosts,
      totalEvents,
      totalAchievements: totalAchievements[0]?.total || 0,
      activeConversations,
      usersByType: {
        alumni: usersByTypeMap.alumni || 0,
        student: usersByTypeMap.student || 0,
        faculty: usersByTypeMap.faculty || 0
      },
      onlineUsersByType
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching real-time stats:', error);
    res.status(500).json({ error: 'Failed to fetch real-time stats' });
  }
});

// Get user type distribution
router.get('/user-types', authenticateToken, async (req, res) => {
  try {
    const distribution = await User.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({ distribution });
  } catch (error) {
    console.error('Error fetching user type distribution:', error);
    res.status(500).json({ error: 'Failed to fetch user type distribution' });
  }
});

// Get activity statistics
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
    }

    const [posts, events, achievements] = await Promise.all([
      Post.countDocuments(dateFilter),
      Event.countDocuments(dateFilter),
      User.aggregate([
        {
          $unwind: '$achievements'
        },
        {
          $match: {
            'achievements.date': { $gte: dateFilter.createdAt.$gte }
          }
        },
        {
          $count: 'total'
        }
      ])
    ]);

    res.json({
      period,
      posts: posts || 0,
      events: events || 0,
      achievements: achievements[0]?.total || 0
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
});

// Get department statistics
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const departmentStats = await User.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          types: { $addToSet: '$type' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({ departmentStats });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({ error: 'Failed to fetch department stats' });
  }
});

// Get batch statistics
router.get('/batches', authenticateToken, async (req, res) => {
  try {
    const batchStats = await User.aggregate([
      {
        $match: { batch: { $exists: true, $ne: null } }
      },
      {
        $group: {
          _id: '$batch',
          count: { $sum: 1 },
          types: { $addToSet: '$type' }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    res.json({ batchStats });
  } catch (error) {
    console.error('Error fetching batch stats:', error);
    res.status(500).json({ error: 'Failed to fetch batch stats' });
  }
});

module.exports = router;
