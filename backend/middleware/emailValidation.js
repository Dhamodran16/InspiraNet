const User = require('../models/User');
const { isEmailExpired, getExpirationDate } = require('../utils/emailExpiration');

/**
 * Middleware to check email validity and prevent login with expired college emails
 */
const checkEmailValidity = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return next();
    }

    // Check if user has expired Kongu email
    if (user.email?.college) {
      const expired = isEmailExpired(user.email.college);
      
      if (expired) {
        // If email is expired and user has personal email, allow login but show warning
        if (user.email.personal) {
          // Email is expired but personal email exists - migration should happen
          // Allow access but add warning header
          res.set('X-Email-Expired', 'true');
          res.set('X-Personal-Email-Available', 'true');
        } else {
          // Email expired and no personal email - block access
          const expirationDate = getExpirationDate(user.email.college);
          return res.status(403).json({
            error: 'Kongu email expired. Please add a personal email in Settings to continue using your account.',
            code: 'COLLEGE_EMAIL_EXPIRED',
            details: {
              expiredEmail: user.email.college,
              expirationDate: expirationDate,
              requiresPersonalEmail: true
            }
          });
        }
      }
    }

    // Check if user is an alumni with deactivated college email
    if (user.type === 'alumni' && user.email?.college && !user.emailMigration?.migrated) {
      // Alumni should have been migrated, but if not, check if email is expired
      if (isEmailExpired(user.email.college)) {
        return res.status(403).json({
          error: 'College email expired. Please use your personal email to login.',
          code: 'COLLEGE_EMAIL_EXPIRED',
          details: {
            message: 'Your Kongu email has expired. Please use your personal email or add one in Settings.'
          }
        });
      }
    }

    next();
  } catch (error) {
    console.error('Email validation middleware error:', error);
    next();
  }
};

/**
 * Middleware to check if user can access student-specific features
 */
const checkStudentAccess = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only students can access student features
    if (user.type !== 'student') {
      return res.status(403).json({
        error: 'Access denied. This feature is only available to current students.',
        code: 'STUDENT_ACCESS_REQUIRED'
      });
    }

    // Check if student email is still valid
    const currentYear = new Date().getFullYear();
    const joinYear = user.studentInfo?.joinYear;
    
    if (joinYear && currentYear - joinYear >= 4) {
      return res.status(403).json({
        error: 'Student access expired. Your account has been converted to alumni status.',
        code: 'STUDENT_ACCESS_EXPIRED',
        details: {
          joinYear: joinYear,
          expiryYear: joinYear + 4,
          currentYear: currentYear
        }
      });
    }

    next();
  } catch (error) {
    console.error('Student access middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user can access alumni-specific features
 */
const checkAlumniAccess = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only alumni can access alumni features
    if (user.type !== 'alumni') {
      return res.status(403).json({
        error: 'Access denied. This feature is only available to alumni.',
        code: 'ALUMNI_ACCESS_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Alumni access middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user can access faculty-specific features
 */
const checkFacultyAccess = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only faculty can access faculty features
    if (user.type !== 'faculty') {
      return res.status(403).json({
        error: 'Access denied. This feature is only available to faculty members.',
        code: 'FACULTY_ACCESS_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Faculty access middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user's email is about to expire (for warnings)
 */
const checkEmailExpiryWarning = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user || user.type !== 'student') {
      return next();
    }

    const currentYear = new Date().getFullYear();
    const joinYear = user.studentInfo?.joinYear;
    
    if (joinYear) {
      const yearsUntilExpiry = 4 - (currentYear - joinYear);
      
      // Add warning headers if email is expiring soon
      if (yearsUntilExpiry <= 1) {
        const expiryDate = new Date(joinYear + 4, 11, 31); // December 31st
        const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        
        res.set({
          'X-Email-Expiry-Warning': 'true',
          'X-Email-Expiry-Date': expiryDate.toISOString(),
          'X-Email-Expiry-Days': daysUntilExpiry.toString(),
          'X-Email-Expiry-Year': (joinYear + 4).toString()
        });
      }
    }

    next();
  } catch (error) {
    console.error('Email expiry warning middleware error:', error);
    next();
  }
};

module.exports = {
  checkEmailValidity,
  checkStudentAccess,
  checkAlumniAccess,
  checkFacultyAccess,
  checkEmailExpiryWarning
}; 