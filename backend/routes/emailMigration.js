const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { 
  migrateUserEmail, 
  checkMigrationNeeded 
} = require('../services/emailMigrationService');
const { 
  isEmailExpired, 
  getDaysUntilExpiration,
  getExpirationDate,
  extractYearFromEmail 
} = require('../utils/emailExpiration');

/**
 * Get email expiration status for current user
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const collegeEmail = user.email?.college;
    
    if (!collegeEmail) {
      return res.json({
        hasKonguEmail: false,
        expired: false,
        migrationNeeded: false,
        hasPersonalEmail: !!user.email?.personal,
        personalEmail: user.email?.personal || null
      });
    }
    
    const expired = isEmailExpired(collegeEmail);
    const daysUntilExpiry = getDaysUntilExpiration(collegeEmail);
    const expirationDate = getExpirationDate(collegeEmail);
    const emailYear = extractYearFromEmail(collegeEmail);
    const migrationStatus = checkMigrationNeeded(user);
    
    res.json({
      hasKonguEmail: true,
      konguEmail: collegeEmail,
      emailYear: emailYear,
      expired: expired,
      expirationDate: expirationDate,
      daysUntilExpiry: daysUntilExpiry,
      migrationNeeded: migrationStatus.needed,
      migrationUrgent: migrationStatus.urgent,
      hasPersonalEmail: !!user.email?.personal,
      personalEmail: user.email?.personal || null,
      migrated: user.emailMigration?.migrated || false,
      migratedAt: user.emailMigration?.migratedAt || null,
      canLogin: migrationStatus.canLogin !== false
    });
    
  } catch (error) {
    console.error('Error getting email status:', error);
    res.status(500).json({ error: 'Failed to get email status' });
  }
});

/**
 * Migrate user email from Kongu to personal
 */
router.post('/migrate', authenticateToken, async (req, res) => {
  try {
    const { personalEmail } = req.body;
    
    if (!personalEmail) {
      return res.status(400).json({ error: 'Personal email is required' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.emailMigration?.migrated) {
      return res.status(400).json({ error: 'Email migration already completed' });
    }
    
    if (!user.email?.college) {
      return res.status(400).json({ error: 'No Kongu email to migrate from' });
    }
    
    // Perform migration
    const result = await migrateUserEmail(user._id.toString(), personalEmail);
    
    res.json({
      success: true,
      message: 'Email migration completed successfully',
      oldEmail: result.oldEmail,
      newEmail: result.newEmail,
      migratedAt: result.migratedAt
    });
    
  } catch (error) {
    console.error('Error migrating email:', error);
    res.status(500).json({ 
      error: 'Failed to migrate email',
      details: error.message 
    });
  }
});

/**
 * Set personal email (for users with expiring Kongu emails)
 */
router.post('/set-personal-email', authenticateToken, async (req, res) => {
  try {
    const { personalEmail } = req.body;
    
    if (!personalEmail) {
      return res.status(400).json({ error: 'Personal email is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personalEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const personalEmailLower = personalEmail.toLowerCase().trim();
    
    // Check if email is already in use
    const existingUser = await User.findOne({
      $or: [
        { 'email.college': personalEmailLower },
        { 'email.personal': personalEmailLower },
        { 'email.professional': personalEmailLower }
      ],
      _id: { $ne: req.user._id }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use by another account' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update personal email
    if (!user.email) {
      user.email = {};
    }
    user.email.personal = personalEmailLower;
    
    await user.save();
    
    // Check if migration should be triggered automatically
    const collegeEmail = user.email?.college;
    if (collegeEmail && isEmailExpired(collegeEmail)) {
      // Auto-migrate if email is expired
      try {
        await migrateUserEmail(user._id.toString(), personalEmailLower);
        return res.json({
          success: true,
          message: 'Personal email set and account migrated successfully',
          migrated: true,
          personalEmail: personalEmailLower
        });
      } catch (migrationError) {
        console.error('Auto-migration failed:', migrationError);
        return res.json({
          success: true,
          message: 'Personal email set. Migration will be completed automatically.',
          migrated: false,
          personalEmail: personalEmailLower
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Personal email set successfully',
      personalEmail: personalEmailLower
    });
    
  } catch (error) {
    console.error('Error setting personal email:', error);
    res.status(500).json({ error: 'Failed to set personal email' });
  }
});

module.exports = router;

// Debug: Log route registration
console.log('✅ Email migration routes loaded');

