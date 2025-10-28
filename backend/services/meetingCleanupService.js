const Meeting = require('../models/Meeting');
const googleMeetService = require('./googleMeetService');
const cron = require('node-cron');

class MeetingCleanupService {
  constructor() {
    this.isRunning = false;
  }

  // Start the cleanup service
  start() {
    if (this.isRunning) {
      console.log('⚠️ Meeting cleanup service is already running');
      return;
    }

    // Run cleanup every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.cleanupExpiredMeetings();
    });

    // Run cleanup every hour for more thorough cleanup
    cron.schedule('0 * * * *', async () => {
      await this.deepCleanup();
    });

    this.isRunning = true;
    console.log('✅ Meeting cleanup service started');
  }

  // Stop the cleanup service
  stop() {
    cron.destroy();
    this.isRunning = false;
    console.log('🛑 Meeting cleanup service stopped');
  }

  // Cleanup meetings that ended more than 10 minutes ago
  async cleanupExpiredMeetings() {
    try {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      console.log('🧹 Starting expired meeting cleanup...');

      // Find meetings that ended more than 10 minutes ago and are still active
      const expiredMeetings = await Meeting.find({
        end_time: { $lt: tenMinutesAgo },
        status: 'active'
      });

      console.log(`📊 Found ${expiredMeetings.length} expired meetings to cleanup`);

      for (const meeting of expiredMeetings) {
        try {
          // Update status to completed
          meeting.status = 'completed';
          await meeting.save();

          console.log(`✅ Marked meeting as completed: ${meeting.title} (${meeting.id})`);

          // Optional: Delete from Google Calendar (uncomment if needed)
          // if (meeting.event_id) {
          //   try {
          //     await googleMeetService.deleteCalendarEvent(meeting.host_id, meeting.event_id);
          //     console.log(`🗑️ Deleted Google Calendar event: ${meeting.event_id}`);
          //   } catch (error) {
          //     console.error(`❌ Failed to delete Google Calendar event ${meeting.event_id}:`, error.message);
          //   }
          // }

        } catch (error) {
          console.error(`❌ Error cleaning up meeting ${meeting.id}:`, error.message);
        }
      }

      console.log(`✅ Cleanup completed. Processed ${expiredMeetings.length} meetings.`);

    } catch (error) {
      console.error('❌ Error during meeting cleanup:', error);
    }
  }

  // Deep cleanup - remove old completed meetings (older than 7 days)
  async deepCleanup() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      console.log('🧹 Starting deep cleanup of old meetings...');

      const oldMeetings = await Meeting.find({
        status: 'completed',
        updated_at: { $lt: sevenDaysAgo }
      });

      console.log(`📊 Found ${oldMeetings.length} old meetings to remove`);

      for (const meeting of oldMeetings) {
        try {
          // Delete from Google Calendar first
          if (meeting.event_id) {
            try {
              await googleMeetService.deleteCalendarEvent(meeting.host_id, meeting.event_id);
              console.log(`🗑️ Deleted Google Calendar event: ${meeting.event_id}`);
            } catch (error) {
              console.error(`❌ Failed to delete Google Calendar event ${meeting.event_id}:`, error.message);
            }
          }

          // Remove from database
          await Meeting.findByIdAndDelete(meeting._id);
          console.log(`🗑️ Removed old meeting from database: ${meeting.title}`);

        } catch (error) {
          console.error(`❌ Error removing old meeting ${meeting.id}:`, error.message);
        }
      }

      console.log(`✅ Deep cleanup completed. Removed ${oldMeetings.length} old meetings.`);

    } catch (error) {
      console.error('❌ Error during deep cleanup:', error);
    }
  }

  // Manual cleanup trigger
  async manualCleanup() {
    console.log('🔧 Manual cleanup triggered');
    await this.cleanupExpiredMeetings();
    await this.deepCleanup();
  }

  // Get cleanup statistics
  async getCleanupStats() {
    try {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        activeMeetings: await Meeting.countDocuments({ status: 'active' }),
        expiredMeetings: await Meeting.countDocuments({
          end_time: { $lt: tenMinutesAgo },
          status: 'active'
        }),
        completedMeetings: await Meeting.countDocuments({ status: 'completed' }),
        oldCompletedMeetings: await Meeting.countDocuments({
          status: 'completed',
          updated_at: { $lt: sevenDaysAgo }
        }),
        totalMeetings: await Meeting.countDocuments()
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting cleanup stats:', error);
      return null;
    }
  }
}

module.exports = new MeetingCleanupService();
