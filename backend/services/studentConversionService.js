const schedule = require('node-schedule');
const User = require('../models/User');

// Import email service (optional)
let emailService;
try {
  emailService = require('./emailService');
} catch (error) {
  console.log('⚠️ Email service not available, notifications will be logged to console');
  emailService = null;
}

class StudentConversionService {
  constructor() {
    this.isRunning = false;
    this.initScheduledJobs();
  }

  /**
   * Initialize scheduled jobs for student conversion
   */
  initScheduledJobs() {
    // Run daily at midnight
    schedule.scheduleJob('0 0 * * *', async () => {
      console.log('🕛 Running daily student conversion check...');
      await this.processStudentConversions();
    });

    // Run weekly on Sunday at 2 AM for warnings
    schedule.scheduleJob('0 2 * * 0', async () => {
      console.log('📧 Running weekly expiry warnings...');
      await this.sendExpiryWarnings();
    });

    console.log('✅ Student conversion service initialized');
  }

  /**
   * Main function to process student conversions
   */
  async processStudentConversions() {
    if (this.isRunning) {
      console.log('⚠️ Conversion process already running, skipping...');
      return;
    }

    this.isRunning = true;
    try {
      const cutoffYear = new Date().getFullYear() - 4;
      console.log(`🔍 Checking for students who joined in ${cutoffYear} or earlier...`);

      // Find students who joined 4+ years ago
      const students = await User.find({
        type: 'student',
        'studentInfo.joinYear': { $lte: cutoffYear }
      });

      console.log(`📊 Found ${students.length} students eligible for conversion`);

      for (const student of students) {
        await this.convertStudentToAlumni(student);
      }

      console.log('✅ Student conversion process completed');
    } catch (error) {
      console.error('❌ Error in student conversion process:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Convert a single student to alumni
   */
  async convertStudentToAlumni(student) {
    try {
      console.log(`🔄 Converting student: ${student.name} (${student.email?.college})`);

      // Check if student has personal email
      if (!student.email?.personal) {
        console.log(`⚠️ Student ${student.name} has no personal email, sending final warning`);
        await this.sendFinalWarning(student);
        return;
      }

      // Calculate batch year (join year + 4)
      const batchYear = student.studentInfo?.joinYear + 4;
      const graduationYear = batchYear;

      // Prepare alumni data
      const alumniData = {
        type: 'alumni',
        'email.college': null, // Remove college email
        'email.personal': student.email.personal, // Set personal as primary
        'alumniInfo.batchYear': batchYear,
        'alumniInfo.graduationYear': graduationYear,
        'alumniInfo.isVerified': false, // Alumni needs to verify employment
        'alumniInfo.verificationStatus': 'pending',
        'alumniInfo.conversionDate': new Date(),
        'alumniInfo.originalStudentId': student._id,
        'alumniInfo.originalJoinYear': student.studentInfo?.joinYear,
        'alumniInfo.originalDepartment': student.department
      };

      // Update user to alumni
      const updatedUser = await User.findByIdAndUpdate(
        student._id,
        { $set: alumniData },
        { new: true }
      );

      if (updatedUser) {
        console.log(`✅ Successfully converted ${student.name} to alumni`);
        
        // Send conversion notification
        await this.sendConversionNotification(updatedUser);
        
        // Log the conversion
        await this.logConversion(student, updatedUser);
      }

    } catch (error) {
      console.error(`❌ Error converting student ${student.name}:`, error);
    }
  }

  /**
   * Send final warning to students without personal email
   */
  async sendFinalWarning(student) {
    try {
      const warningEmail = {
        to: student.email?.college,
        subject: 'URGENT: Your KEC account will be deactivated soon',
        template: 'final-warning',
        data: {
          name: student.name,
          joinYear: student.studentInfo?.joinYear,
          expiryDate: new Date(student.studentInfo?.joinYear + 4, 11, 31), // December 31st
          daysLeft: 30
        }
      };

      if (emailService) {
        await emailService.sendEmail(warningEmail);
        console.log(`📧 Sent final warning to ${student.name}`);
      } else {
        console.log(`📧 [CONSOLE] Final warning for ${student.name}:`, warningEmail);
      }
    } catch (error) {
      console.error(`❌ Error sending final warning to ${student.name}:`, error);
    }
  }

  /**
   * Send conversion notification to newly converted alumni
   */
  async sendConversionNotification(alumni) {
    try {
      const notificationEmail = {
        to: alumni.email?.personal,
        subject: 'Welcome to KEC Alumni Network!',
        template: 'conversion-notification',
        data: {
          name: alumni.name,
          graduationYear: alumni.alumniInfo?.graduationYear,
          department: alumni.alumniInfo?.originalDepartment
        }
      };

      if (emailService) {
        await emailService.sendEmail(notificationEmail);
        console.log(`📧 Sent conversion notification to ${alumni.name}`);
      } else {
        console.log(`📧 [CONSOLE] Conversion notification for ${alumni.name}:`, notificationEmail);
      }
    } catch (error) {
      console.error(`❌ Error sending conversion notification to ${alumni.name}:`, error);
    }
  }

  /**
   * Send expiry warnings to students approaching conversion
   */
  async sendExpiryWarnings() {
    try {
      const currentYear = new Date().getFullYear();
      const warningThreshold = currentYear - 3.5; // 6 months before conversion

      const studentsToWarn = await User.find({
        type: 'student',
        'studentInfo.joinYear': { $lte: warningThreshold },
        'studentInfo.joinYear': { $gt: currentYear - 4 } // Not yet converted
      });

      console.log(`📧 Sending expiry warnings to ${studentsToWarn.length} students`);

      for (const student of studentsToWarn) {
        await this.sendExpiryWarning(student);
      }

    } catch (error) {
      console.error('❌ Error sending expiry warnings:', error);
    }
  }

  /**
   * Send individual expiry warning
   */
  async sendExpiryWarning(student) {
    try {
      const expiryDate = new Date(student.studentInfo?.joinYear + 4, 11, 31);
      const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

      const warningEmail = {
        to: student.email?.college,
        subject: `Action Required: Your KEC email expires in ${daysUntilExpiry} days`,
        template: 'expiry-warning',
        data: {
          name: student.name,
          joinYear: student.studentInfo?.joinYear,
          expiryDate: expiryDate,
          daysLeft: daysUntilExpiry,
          hasPersonalEmail: !!student.email?.personal
        }
      };

      if (emailService) {
        await emailService.sendEmail(warningEmail);
        console.log(`📧 Sent expiry warning to ${student.name} (${daysUntilExpiry} days left)`);
      } else {
        console.log(`📧 [CONSOLE] Expiry warning for ${student.name} (${daysUntilExpiry} days left):`, warningEmail);
      }
    } catch (error) {
      console.error(`❌ Error sending expiry warning to ${student.name}:`, error);
    }
  }

  /**
   * Log conversion for audit purposes
   */
  async logConversion(student, alumni) {
    try {
      const conversionLog = {
        studentId: student._id,
        studentName: student.name,
        studentEmail: student.email?.college,
        conversionDate: new Date(),
        joinYear: student.studentInfo?.joinYear,
        graduationYear: alumni.alumniInfo?.graduationYear,
        department: student.department,
        personalEmail: alumni.email?.personal
      };

      // You can store this in a separate collection or log file
      console.log('📝 Conversion logged:', conversionLog);
    } catch (error) {
      console.error('❌ Error logging conversion:', error);
    }
  }

  /**
   * Manual conversion trigger (for testing/admin use)
   */
  async manualConversion(studentId) {
    try {
      const student = await User.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      if (student.type !== 'student') {
        throw new Error('User is not a student');
      }

      await this.convertStudentToAlumni(student);
      return { success: true, message: 'Student converted successfully' };
    } catch (error) {
      console.error('❌ Manual conversion failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get conversion statistics
   */
  async getConversionStats() {
    try {
      const currentYear = new Date().getFullYear();
      const cutoffYear = currentYear - 4;

      const stats = {
        totalStudents: await User.countDocuments({ type: 'student' }),
        eligibleForConversion: await User.countDocuments({
          type: 'student',
          'studentInfo.joinYear': { $lte: cutoffYear }
        }),
        convertedThisYear: await User.countDocuments({
          type: 'alumni',
          'alumniInfo.conversionDate': {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }),
        studentsWithoutPersonalEmail: await User.countDocuments({
          type: 'student',
          'email.personal': { $exists: false }
        })
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting conversion stats:', error);
      return null;
    }
  }
}

module.exports = new StudentConversionService(); 