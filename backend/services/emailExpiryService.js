const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');
const {
  isEmailExpired,
  isEmailExpiringSoon,
  getDaysUntilExpiration,
  getExpirationDate
} = require('../utils/emailExpiration');
const { migrateUserEmail, checkMigrationNeeded } = require('./emailMigrationService');
const emailService = require('./emailService');

/**
 * Email Expiry Service
 * Handles automatic checking and migration of expiring Kongu emails
 */

/**
 * Check and notify users with expiring emails
 */
async function checkAndNotifyExpiringEmails() {
  try {
    console.log('🔍 Checking for expiring Kongu emails...');

    const users = await User.find({
      'email.college': { $exists: true, $ne: null },
      'emailMigration.migrated': { $ne: true },
      type: 'student'
    });

    let notifiedCount = 0;
    let expiredCount = 0;

    for (const user of users) {
      const collegeEmail = user.email.college;

      if (!collegeEmail) continue;

      const isExpired = isEmailExpired(collegeEmail);
      const daysUntilExpiry = getDaysUntilExpiration(collegeEmail);
      const expirationDate = getExpirationDate(collegeEmail);

      if (isExpired) {
        expiredCount++;
        console.log(`⚠️ User ${user._id} (${collegeEmail}) has expired email`);

        // Create urgent notification
        await Notification.create({
          userId: user._id,
          type: 'email_expired',
          title: 'Kongu Email Expired',
          message: `Your Kongu email (${collegeEmail}) has expired. Please add a personal email in Settings to continue using your account.`,
          priority: 'urgent',
          read: false
        });

        // Send email notification if personal email exists
        if (user.email.personal) {
          try {
            await emailService.sendEmail({
              to: user.email.personal,
              subject: 'Urgent: Kongu Email Expired - Action Required',
              html: `
                <h2>Your Kongu Email Has Expired</h2>
                <p>Dear ${user.name},</p>
                <p>Your Kongu email address (${collegeEmail}) has expired.</p>
                <p>Your account has been automatically migrated to use your personal email (${user.email.personal}).</p>
                <p>You can now log in using your personal email address.</p>
                <p>If you have any questions, please contact support.</p>
              `
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${user.email.personal}:`, emailError);
          }
        }
      } else if (daysUntilExpiry && daysUntilExpiry <= 30) {
        // Email expiring within 30 days
        notifiedCount++;
        console.log(`📧 User ${user._id} (${collegeEmail}) email expiring in ${daysUntilExpiry} days`);

        // Create warning notification
        await Notification.create({
          userId: user._id,
          type: 'email_expiring_soon',
          title: 'Kongu Email Expiring Soon',
          message: `Your Kongu email (${collegeEmail}) will expire on ${expirationDate.toLocaleDateString()} (${daysUntilExpiry} days). Please add a personal email in Settings.`,
          priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
          read: false
        });

        // Send email notification if personal email exists
        if (user.email.personal) {
          try {
            await emailService.sendEmail({
              to: user.email.personal,
              subject: `Warning: Kongu Email Expiring in ${daysUntilExpiry} Days`,
              html: `
                <h2>Your Kongu Email is Expiring Soon</h2>
                <p>Dear ${user.name},</p>
                <p>Your Kongu email address (${collegeEmail}) will expire on ${expirationDate.toLocaleDateString()}.</p>
                <p>Please ensure you have added a personal email address in your Settings to avoid account access issues.</p>
                <p>Your account will be automatically migrated to use your personal email before expiration.</p>
              `
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${user.email.personal}:`, emailError);
          }
        }
      }
    }

    console.log(`✅ Email expiry check completed: ${notifiedCount} users notified, ${expiredCount} expired`);

  } catch (error) {
    console.error('❌ Error checking expiring emails:', error);
  }
}

/**
 * Automatically migrate users with expired emails who have personal email set
 */
async function autoMigrateExpiredEmails() {
  try {
    console.log('🔄 Starting automatic email migration for expired emails...');

    const users = await User.find({
      'email.college': { $exists: true, $ne: null },
      'email.personal': { $exists: true, $ne: null },
      'emailMigration.migrated': { $ne: true }
    });

    let migratedCount = 0;
    let failedCount = 0;

    for (const user of users) {
      const collegeEmail = user.email.college;

      if (!collegeEmail) continue;

      const isExpired = isEmailExpired(collegeEmail);
      const daysUntilExpiry = getDaysUntilExpiration(collegeEmail);

      // Migrate if expired OR 1 day before expiry (per user requirement)
      if ((isExpired || (daysUntilExpiry !== null && daysUntilExpiry <= 1)) && user.email.personal) {
        try {
          console.log(`🔄 Migrating user ${user._id} from ${collegeEmail} to ${user.email.personal} (${isExpired ? 'Expired' : '1 day before expiry'})`);
          await migrateUserEmail(user._id.toString(), user.email.personal);
          migratedCount++;
        } catch (error) {
          console.error(`❌ Failed to migrate user ${user._id}:`, error.message);
          failedCount++;
        }
      }
    }

    console.log(`✅ Auto-migration completed: ${migratedCount} migrated, ${failedCount} failed`);

  } catch (error) {
    console.error('❌ Error in auto-migration:', error);
  }
}

/**
 * Start email expiry monitoring cron jobs
 */
function startEmailExpiryMonitoring() {
  // Check for expiring emails daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    await checkAndNotifyExpiringEmails();
  });

  // Auto-migrate expired emails daily at 10 AM
  cron.schedule('0 10 * * *', async () => {
    await autoMigrateExpiredEmails();
  });

  console.log('✅ Email expiry monitoring started');
}

module.exports = {
  checkAndNotifyExpiringEmails,
  autoMigrateExpiredEmails,
  startEmailExpiryMonitoring
};
