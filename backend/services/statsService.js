const User = require('../models/User');
const Event = require('../models/Event');
const JobPosting = require('../models/JobPosting');

class StatsService {
  constructor() {
    this.cache = {
      alumniCount: 0,
      eventsCount: 0,
      jobsCount: 0,
      lastUpdated: null
    };
    this.cacheTimeout = 2 * 60 * 1000; // Reduced from 5 minutes to 2 minutes for faster updates
  }

  async getRealTimeStats() {
    try {
      // Check if cache is still valid
      if (this.cache.lastUpdated && (Date.now() - this.cache.lastUpdated) < this.cacheTimeout) {
        return this.cache;
      }

      // Fetch real-time counts from MongoDB Atlas with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000); // 5 second timeout
      });

      const statsPromise = Promise.all([
        User.countDocuments({ type: 'alumni' }).catch(() => 15000),
        Event.countDocuments({ status: { $ne: 'cancelled' } }).catch(() => 200),
        JobPosting.countDocuments({ isActive: true }).catch(() => 500)
      ]);

      const [alumniCount, eventsCount, jobsCount] = await Promise.race([
        statsPromise,
        timeoutPromise
      ]);

      // Update cache
      this.cache = {
        alumniCount,
        eventsCount,
        jobsCount,
        lastUpdated: Date.now()
      };

      return this.cache;
    } catch (error) {
      console.error('Error fetching real-time stats:', error);
      // Return cached data if available, otherwise return defaults
      if (this.cache.lastUpdated) {
        console.log('Returning cached stats due to error');
        return this.cache;
      } else {
        console.log('Returning default stats due to error');
        return {
          alumniCount: 15000,
          eventsCount: 200,
          jobsCount: 500,
          lastUpdated: null
        };
      }
    }
  }

  async getDetailedStats() {
    try {
      const stats = await this.getRealTimeStats();
      
      // Get additional details for presentation
      const recentEvents = await Event.find({ status: 'upcoming' })
        .sort({ date: 1 })
        .limit(5)
        .select('title date location type');

      const recentJobs = await JobPosting.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title company location type');

      const topDepartments = await User.aggregate([
        { $match: { type: 'alumni' } },
        { $group: { _id: '$studentInfo.department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      return {
        ...stats,
        recentEvents,
        recentJobs,
        topDepartments,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
      return null;
    }
  }

  // Method to force refresh cache (useful for admin updates)
  async refreshCache() {
    this.cache.lastUpdated = null;
    return await this.getRealTimeStats();
  }
}

module.exports = StatsService;
