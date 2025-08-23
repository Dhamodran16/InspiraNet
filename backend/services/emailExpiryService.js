const User = require('../models/User');
const Post = require('../models/Post');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

class EmailExpiryService {
  /**
   * Check if a student's Kongu email is expired or about to expire
   * @param {Object} user - User object
   * @returns {Object} - Expiry status
   */
  static checkEmailExpiry(user) {
    if (user.type !== 'student' || !user.email?.college) {
      return { isExpired: false, daysUntilExpiry: null, shouldMigrate: false };
    }

    const joinYear = user.studentInfo?.joinYear;
    if (!joinYear) {
      return { isExpired: false, daysUntilExpiry: null, shouldMigrate: false };
    }

    const expiryYear = joinYear + 4;
    const expiryDate = new Date(expiryYear, 11, 31); // December 31st of expiry year
    const currentDate = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));

    const isExpired = daysUntilExpiry <= 0;
    const shouldMigrate = daysUntilExpiry <= 30; // Start migration 30 days before expiry

    return {
      isExpired,
      daysUntilExpiry,
      shouldMigrate,
      expiryDate: expiryDate.toISOString(),
      joinYear,
      expiryYear
    };
  }

  /**
   * Get all students whose emails are expired or about to expire
   * @returns {Array} - Array of users with expiry info
   */
  static async getExpiringEmails() {
    const students = await User.find({ type: 'student' });
    const expiringUsers = [];

    for (const student of students) {
      const expiryInfo = this.checkEmailExpiry(student);
      if (expiryInfo.shouldMigrate || expiryInfo.isExpired) {
        expiringUsers.push({
          user: student,
          expiryInfo
        });
      }
    }

    return expiringUsers;
  }

  /**
   * Migrate student data from Kongu email to personal email
   * @param {String} studentId - Student's ObjectId
   * @returns {Object} - Migration result
   */
  static async migrateStudentData(studentId) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      const student = await User.findById(studentId).session(session);
      if (!student || student.type !== 'student') {
        throw new Error('Student not found');
      }

      if (!student.email?.personal) {
        throw new Error('Personal email not found for migration');
      }

      const personalEmail = student.email.personal;
      
      // Check if personal email is already used by another account
      const existingPersonalEmailUser = await User.findOne({
        $or: [
          { 'email.college': personalEmail },
          { 'email.personal': personalEmail }
        ],
        _id: { $ne: studentId }
      }).session(session);

      if (existingPersonalEmailUser) {
        throw new Error(`Personal email ${personalEmail} is already used by another account`);
      }

      // Update user's email structure
      const updatedUser = await User.findByIdAndUpdate(
        studentId,
        {
          $set: {
            'email.college': personalEmail,
            'email.personal': null
          }
        },
        { new: true, session }
      );

      // Update all posts by this user
      await Post.updateMany(
        { author: studentId },
        { $set: { authorEmail: personalEmail } },
        { session }
      );

      // Update all messages by this user
      await Message.updateMany(
        { sender: studentId },
        { $set: { senderEmail: personalEmail } },
        { session }
      );

      // Update notifications for this user
      await Notification.updateMany(
        { recipient: studentId },
        { $set: { recipientEmail: personalEmail } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        message: `Successfully migrated data from ${student.email.college} to ${personalEmail}`,
        oldEmail: student.email.college,
        newEmail: personalEmail,
        user: updatedUser
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Delete expired Kongu email accounts after verification
   * @param {String} studentId - Student's ObjectId
   * @returns {Object} - Deletion result
   */
  static async deleteExpiredAccount(studentId) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      const student = await User.findById(studentId).session(session);
      if (!student || student.type !== 'student') {
        throw new Error('Student not found');
      }

      const expiryInfo = this.checkEmailExpiry(student);
      if (!expiryInfo.isExpired) {
        throw new Error('Email is not yet expired');
      }

      // Verify that data has been migrated to personal email
      if (student.email?.college && student.email.college.endsWith('@kongu.edu')) {
        throw new Error('Data migration not completed. Cannot delete account with active Kongu email.');
      }

      // Delete user's posts
      await Post.deleteMany({ author: studentId }, { session });

      // Delete user's messages
      await Message.deleteMany({ 
        $or: [{ sender: studentId }, { recipient: studentId }] 
      }, { session });

      // Delete user's notifications
      await Notification.deleteMany({ 
        $or: [{ recipient: studentId }, { sender: studentId }] 
      }, { session });

      // Delete the user account
      await User.findByIdAndDelete(studentId, { session });

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        message: `Successfully deleted expired account for ${student.email?.college || 'unknown'}`,
        deletedUserId: studentId
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Process all expiring emails (run as a scheduled job)
   * @returns {Object} - Processing results
   */
  static async processExpiringEmails() {
    const expiringUsers = await this.getExpiringEmails();
    const results = {
      processed: 0,
      migrated: 0,
      deleted: 0,
      errors: []
    };

    for (const { user, expiryInfo } of expiringUsers) {
      try {
        results.processed++;

        if (expiryInfo.isExpired) {
          // Try to delete expired account
          try {
            await this.deleteExpiredAccount(user._id);
            results.deleted++;
          } catch (deleteError) {
            // If deletion fails, try migration first
            if (deleteError.message.includes('Data migration not completed')) {
              await this.migrateStudentData(user._id);
              results.migrated++;
            } else {
              results.errors.push({
                userId: user._id,
                email: user.email?.college,
                error: deleteError.message
              });
            }
          }
        } else if (expiryInfo.shouldMigrate) {
          // Migrate data before expiry
          await this.migrateStudentData(user._id);
          results.migrated++;
        }

      } catch (error) {
        results.errors.push({
          userId: user._id,
          email: user.email?.college,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = EmailExpiryService;



