const cron = require('node-cron');
const EmailExpiryService = require('./emailExpiryService');
const MessageDeletionService = require('./messageDeletionService');

class CronService {
  static init() {
    // Process expiring emails daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🕐 Running daily email expiry check...');
      try {
        const results = await EmailExpiryService.processExpiringEmails();
        console.log('✅ Email expiry processing completed:', {
          processed: results.processed,
          migrated: results.migrated,
          deleted: results.deleted,
          errors: results.errors.length
        });
        
        if (results.errors.length > 0) {
          console.error('❌ Email expiry processing errors:', results.errors);
        }
      } catch (error) {
        console.error('❌ Email expiry processing failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Check for expiring emails weekly (for reporting)
    cron.schedule('0 9 * * 1', async () => {
      console.log('📊 Running weekly email expiry report...');
      try {
        const expiringUsers = await EmailExpiryService.getExpiringEmails();
        console.log(`📈 Found ${expiringUsers.length} users with expiring emails`);
        
        expiringUsers.forEach(({ user, expiryInfo }) => {
          console.log(`- ${user.email?.college}: ${expiryInfo.daysUntilExpiry} days until expiry`);
        });
      } catch (error) {
        console.error('❌ Weekly email expiry report failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Process auto-delete/disappearing messages every hour
    cron.schedule('0 * * * *', async () => {
      console.log('🕐 Running auto-delete message processing...');
      try {
        const result = await MessageDeletionService.processAutoDelete();
        console.log('✅ Auto-delete processing completed:', {
          deletedCount: result.deletedCount
        });
      } catch (error) {
        console.error('❌ Auto-delete processing failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    // Server cleanup - daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
      console.log('🕐 Running server cleanup...');
      try {
        const result = await MessageDeletionService.serverCleanup({
          deleteOrphaned: true,
          deleteExpiredAutoDelete: true,
          deleteOldSoftDeleted: true,
          softDeleteRetentionDays: 30
        });
        console.log('✅ Server cleanup completed:', {
          deletedCount: result.deletedCount,
          orphaned: result.results.orphaned,
          expiredAutoDelete: result.results.expiredAutoDelete,
          oldSoftDeleted: result.results.oldSoftDeleted
        });
      } catch (error) {
        console.error('❌ Server cleanup failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    console.log('🕐 Cron jobs initialized successfully');
  }

  static async runManualEmailExpiryCheck() {
    console.log('🔄 Running manual email expiry check...');
    try {
      const results = await EmailExpiryService.processExpiringEmails();
      console.log('✅ Manual email expiry processing completed:', results);
      return results;
    } catch (error) {
      console.error('❌ Manual email expiry processing failed:', error);
      throw error;
    }
  }
}

module.exports = CronService;



