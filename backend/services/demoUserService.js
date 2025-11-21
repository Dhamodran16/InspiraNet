const bcrypt = require('bcryptjs');
const User = require('../models/User');

const normalizeEmail = (email) => email?.trim().toLowerCase();

/**
 * Ensures that at least one demo user exists so the hosted app can be accessed.
 * Uses environment variables to configure the demo account, but falls back
 * to sensible defaults when they are not provided.
 */
async function ensureDemoUser() {
  try {
    const {
      DEMO_USER_EMAIL = 'demo@inspiranet.com',
      DEMO_USER_PASSWORD = 'Demo@123',
      DEMO_USER_TYPE = 'alumni',
      DEMO_USER_NAME = 'Demo User',
      DEMO_USER_DEPARTMENT = 'cse',
      DEMO_USER_BATCH = '2024'
    } = process.env;

    if (!DEMO_USER_EMAIL || !DEMO_USER_PASSWORD) {
      console.log('⚠️ Demo user credentials not configured. Skipping demo user creation.');
      return;
    }

    const email = normalizeEmail(DEMO_USER_EMAIL);

    const existingUser = await User.findOne({
      $or: [
        { 'email.college': email },
        { 'email.personal': email },
        { 'email.professional': email }
      ]
    });

    if (existingUser) {
      console.log(`ℹ️ Demo user already exists (${email}). Skipping creation.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(DEMO_USER_PASSWORD, 12);
    const type = DEMO_USER_TYPE.toLowerCase();

    const baseUser = {
      name: DEMO_USER_NAME,
      password: hashedPassword,
      type,
      isVerified: true,
      isProfileComplete: true,
      skills: ['Leadership', 'Teamwork'],
      interests: ['Networking', 'Community Building'],
      phone: '+91 90000 00000'
    };

    if (type === 'student' || type === 'faculty') {
      baseUser.email = { college: email };
      baseUser.department = DEMO_USER_DEPARTMENT;
      baseUser.batch = DEMO_USER_BATCH;
    } else {
      baseUser.email = { personal: email };
      baseUser.company = 'InspiraNet';
      baseUser.designation = 'Community Lead';
      baseUser.alumniInfo = {
        currentCompany: 'InspiraNet',
        jobTitle: 'Community Lead',
        graduationYear: Number(DEMO_USER_BATCH) || 2024,
        mentorshipOffering: true,
        mentorshipAreas: ['Career Guidance', 'Networking']
      };
    }

    const demoUser = await User.create(baseUser);
    console.log(`✅ Demo user created successfully (${demoUser.email.personal || demoUser.email.college})`);
  } catch (error) {
    console.error('❌ Failed to ensure demo user:', error.message);
  }
}

module.exports = { ensureDemoUser };

