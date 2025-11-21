const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const Follow = require('../models/Follow');
const FollowRequest = require('../models/FollowRequest');
const { isEmailExpired, getExpirationDate } = require('../utils/emailExpiration');

/**
 * Email Migration Service
 * Handles migration of user data from Kongu email to personal email
 * before Kongu email expires
 */

/**
 * Migrate user account from Kongu email to personal email
 * @param {string} userId - User ID to migrate
 * @param {string} personalEmail - Personal email to migrate to
 * @returns {Promise<Object>} - Migration result
 */
async function migrateUserEmail(userId, personalEmail) {
  const session = await User.startSession();
  session.startTransaction();
  
  try {
    const user = await User.findById(userId).session(session);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.email?.college) {
      throw new Error('User does not have a Kongu email to migrate from');
    }
    
    if (!personalEmail || !personalEmail.trim()) {
      throw new Error('Personal email is required for migration');
    }
    
    // Validate personal email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personalEmail)) {
      throw new Error('Invalid personal email format');
    }
    
    const personalEmailLower = personalEmail.toLowerCase().trim();
    
    // Check if personal email is already in use
    const existingUser = await User.findOne({
      $or: [
        { 'email.college': personalEmailLower },
        { 'email.personal': personalEmailLower },
        { 'email.professional': personalEmailLower }
      ]
    }).session(session);
    
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new Error('Personal email is already in use by another account');
    }
    
    const oldCollegeEmail = user.email.college;
    
    // Step 1: Update user email structure
    // Move college email to personal email, remove college email
    user.email = {
      personal: personalEmailLower,
      professional: user.email.professional || null,
      // Remove college email completely
      college: null
    };
    
    // Step 2: Update user type to alumni if student
    if (user.type === 'student') {
      user.type = 'alumni';
      // Preserve student info for reference
      if (!user.alumniInfo) {
        user.alumniInfo = {
          previousStudentInfo: user.studentInfo
        };
      }
    }
    
    // Step 3: Mark migration as completed
    user.emailMigration = {
      migrated: true,
      migratedAt: new Date(),
      oldCollegeEmail: oldCollegeEmail,
      newPersonalEmail: personalEmailLower
    };
    
    await user.save({ session });
    
    // Step 4: Update all posts authored by this user
    await Post.updateMany(
      { author: userId },
      { $set: { 'authorEmail': personalEmailLower } },
      { session }
    );
    
    // Step 5: Update all events created by this user
    await Event.updateMany(
      { createdBy: userId },
      { $set: { 'creatorEmail': personalEmailLower } },
      { session }
    );
    
    // Step 6: Update conversations (participants)
    await Conversation.updateMany(
      { participants: userId },
      { $set: { 'lastUpdated': new Date() } },
      { session }
    );
    
    // Step 7: Update messages
    await Message.updateMany(
      { sender: userId },
      { $set: { 'senderEmail': personalEmailLower } },
      { session }
    );
    
    // Step 8: Update notifications
    await Notification.updateMany(
      { userId: userId },
      { $set: { 'userEmail': personalEmailLower } },
      { session }
    );
    
    // Step 9: Update follow relationships (follower)
    await Follow.updateMany(
      { followerId: userId },
      { $set: { 'lastUpdated': new Date() } },
      { session }
    );
    
    // Step 10: Update follow relationships (followee)
    await Follow.updateMany(
      { followeeId: userId },
      { $set: { 'lastUpdated': new Date() } },
      { session }
    );
    
    // Step 11: Update follow requests
    await FollowRequest.updateMany(
      { $or: [{ requesterId: userId }, { targetId: userId }] },
      { $set: { 'lastUpdated': new Date() } },
      { session }
    );
    
    await session.commitTransaction();
    
    console.log(`✅ Successfully migrated user ${userId} from ${oldCollegeEmail} to ${personalEmailLower}`);
    
    return {
      success: true,
      userId: userId,
      oldEmail: oldCollegeEmail,
      newEmail: personalEmailLower,
      migratedAt: new Date()
    };
    
  } catch (error) {
    await session.abortTransaction();
    console.error(`❌ Error migrating user ${userId}:`, error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Check if user needs email migration
 * @param {Object} user - User object
 * @returns {Object} - Migration status
 */
function checkMigrationNeeded(user) {
  if (!user.email?.college) {
    return {
      needed: false,
      reason: 'No Kongu email to migrate'
    };
  }
  
  const isExpired = isEmailExpired(user.email.college);
  const expirationDate = getExpirationDate(user.email.college);
  
  if (isExpired) {
    return {
      needed: true,
      urgent: true,
      reason: 'Email has expired',
      expirationDate: expirationDate,
      canLogin: false
    };
  }
  
  // Check if expiring soon (within 30 days)
  const daysUntilExpiry = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  const expiringSoon = daysUntilExpiry <= 30;
  
  return {
    needed: expiringSoon || !user.email.personal,
    urgent: isExpired,
    reason: expiringSoon ? 'Email expiring soon' : 'Personal email not set',
    expirationDate: expirationDate,
    daysUntilExpiry: daysUntilExpiry,
    canLogin: !isExpired
  };
}

/**
 * Get all users that need email migration
 * @returns {Promise<Array>} - Array of users needing migration
 */
async function getUsersNeedingMigration() {
  const users = await User.find({
    'email.college': { $exists: true, $ne: null },
    'emailMigration.migrated': { $ne: true }
  });
  
  const usersNeedingMigration = [];
  
  for (const user of users) {
    const migrationStatus = checkMigrationNeeded(user);
    if (migrationStatus.needed) {
      usersNeedingMigration.push({
        user: user,
        migrationStatus: migrationStatus
      });
    }
  }
  
  return usersNeedingMigration;
}

module.exports = {
  migrateUserEmail,
  checkMigrationNeeded,
  getUsersNeedingMigration
};

