const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const EmailExpiryService = require('../services/emailExpiryService');
const studentConversionService = require('../services/studentConversionService');
const GoogleCalendarService = require('../services/googleCalendarService');

const router = express.Router();

const normalizeEmail = (value) => value?.trim().toLowerCase();

const buildEmailLookupQuery = (rawEmail) => {
  const normalized = normalizeEmail(rawEmail);
  return {
    $or: [
      { 'email.college': normalized },
      { 'email.personal': normalized },
      { 'email.professional': normalized },
      { 'emailMigration.newPersonalEmail': normalized }
    ]
  };
};

// Test route to verify router is working
router.get('/test-callback', (req, res) => {
  res.json({ message: 'Callback route test - router is working!' });
});

// Log when routes are loaded
console.log('✅ Auth routes loaded - /callback route registered');

const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30m' });
const generateRefreshToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', async (req, res) => {
  try {
    console.log('📝 POST /api/auth/register - Registration request received');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
		const { firstName, lastName, email, password, userType, department, batch, currentYear, company, designation, phone } = req.body;

    // Detailed validation with helpful error messages
		if (!firstName || !lastName || !password || !userType) {
      const missingFields = [];
      if (!firstName) missingFields.push('firstName');
      if (!lastName) missingFields.push('lastName');
      if (!password) missingFields.push('password');
      if (!userType) missingFields.push('userType');
      
      console.log('❌ Missing required fields:', missingFields);
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields',
        missingFields: missingFields,
        message: `The following fields are required: ${missingFields.join(', ')}`
      });
    }
    if (password.length < 6) {
      console.log('❌ Password too short:', password.length);
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long',
        message: 'Password must be at least 6 characters long'
      });
    }

		const name = `${firstName.trim()} ${lastName.trim()}`;
    let collegeEmail = null;
    let personalEmail = null;

		if (userType === 'student') {
      console.log('📝 Processing student registration');
      const cleanedEmail = normalizeEmail(email);
			if (!cleanedEmail || !cleanedEmail.endsWith('@kongu.edu')) {
        console.log('❌ Invalid email for student:', email);
        return res.status(400).json({ 
          success: false,
          error: 'Use your Kongu email (@kongu.edu)',
          message: 'Student accounts must use a Kongu email address ending with @kongu.edu'
        });
      }

			// name.yydept@kongu.edu -> capture year and dept code
			const m = cleanedEmail.match(/^[a-zA-Z]+\.(\d{2})([a-z]+)@kongu\.edu$/);
			if (!m) {
        console.log('❌ Email format validation failed:', email);
        console.log('❌ Expected format: name.yydept@kongu.edu (e.g., john.23aim@kongu.edu)');
        return res.status(400).json({ 
          success: false,
          error: 'Student email must be like name.yydept@kongu.edu (e.g., john.23aim@kongu.edu)',
          message: 'Student email must match the format: name.yydept@kongu.edu'
        });
      }
			const emailYear = parseInt(m[1], 10);
			const emailDept = m[2];
      console.log('✅ Email parsed - Year:', emailYear, 'Dept:', emailDept);
			
			// If department is provided, validate it matches email
			if (department) {
				// Department short forms per latest requirement (Civil removed)
				const deptMapping = { MCH: 'mch', AID: 'aid', AIM: 'aim', MTR: 'mtr', AUT: 'aut', EEE: 'eee', ECE: 'ece', CSE: 'cse', IT: 'it', EIE: 'eie' };
				const expectedDept = deptMapping[department] || String(department).toLowerCase();
				if (emailDept !== expectedDept) {
          console.log('❌ Department mismatch - Email dept:', emailDept, 'Selected dept:', department, 'Expected:', expectedDept);
          return res.status(400).json({ 
            success: false,
            error: `Email department (${emailDept}) doesn't match selected department (${department})`,
            message: `The email department code "${emailDept}" doesn't match the selected department "${department}"`
          });
        }
			}

			// Derive join year from currentYear (I/II/III/IV) or batch
			const romanToNum = { I: 1, II: 2, III: 3, IV: 4, '1': 1, '2': 2, '3': 3, '4': 4 };
			let joinYear;
			if (currentYear) {
        console.log('📝 Processing currentYear:', currentYear);
				const n = romanToNum[String(currentYear).toUpperCase()];
				if (!n) {
          console.log('❌ Invalid currentYear value:', currentYear);
          return res.status(400).json({ 
            success: false,
            error: 'Invalid current year. Use I, II, III, or IV',
            message: 'currentYear must be one of: I, II, III, IV, 1, 2, 3, or 4'
          });
        }
				const now = new Date().getFullYear();
				joinYear = now - (n - 1);
        console.log('📝 Calculated joinYear:', joinYear, 'from currentYear:', currentYear, 'year:', now);
        console.log('📝 Email year:', emailYear, 'Join year last 2 digits:', joinYear % 100);
				if ((joinYear % 100) !== emailYear) {
          console.log('❌ Email year mismatch - Email year:', emailYear, 'Derived join year:', joinYear, 'Last 2 digits:', joinYear % 100);
          return res.status(400).json({ 
            success: false,
            error: `Email year (${emailYear}) does not match derived join year (${String(joinYear).slice(-2)})`,
            message: `The email year "${emailYear}" doesn't match the expected join year based on current year "${currentYear}"`
          });
        }
			} else if (batch) {
        console.log('📝 Processing batch:', batch);
				const by = parseInt(batch, 10);
				if (isNaN(by) || by < 2000) {
          console.log('❌ Invalid batch year:', batch);
          return res.status(400).json({ 
            success: false,
            error: 'Invalid batch year',
            message: 'Batch year must be a valid year (2000 or later)'
          });
        }
				joinYear = by;
        console.log('📝 Using batch as joinYear:', joinYear);
        console.log('📝 Email year:', emailYear, 'Batch year last 2 digits:', by % 100);
				if ((by % 100) !== emailYear) {
          console.log('❌ Email year mismatch - Email year:', emailYear, 'Batch year:', by, 'Last 2 digits:', by % 100);
          return res.status(400).json({ 
            success: false,
            error: `Email year (${emailYear}) does not match batch year (${batch})`,
            message: `The email year "${emailYear}" doesn't match the batch year "${batch}"`
          });
        }
			} else {
        console.log('❌ Missing currentYear or batch');
        return res.status(400).json({ 
          success: false,
          error: 'Provide currentYear (I/II/III/IV)',
          message: 'Either currentYear or batch must be provided for student registration'
        });
      }

      collegeEmail = cleanedEmail;
      console.log('📝 Checking if email exists:', collegeEmail);
			
			// Check if email exists in ANY user type (college/personal/professional/migrated)
			const existingUser = await User.findOne(buildEmailLookupQuery(collegeEmail));
			if (existingUser) {
        console.log('❌ Email already exists:', collegeEmail, 'as type:', existingUser.type);
        return res.status(400).json({ 
          success: false,
          error: `Email ${collegeEmail} is already registered as ${existingUser.type}. One email can only be used for one account type.`,
          message: `This email is already registered as ${existingUser.type}. Please use a different email or login.`
        });
      }
      console.log('✅ Email is available:', collegeEmail);

			const hashed = await bcrypt.hash(password, 12);
			const userData = {
				name,
				password: hashed,
				type: userType,
				phone: phone || undefined,
				email: { college: collegeEmail },
				batch: String(joinYear),
				studentInfo: { joinYear, currentYear: Math.min(4, new Date().getFullYear() - joinYear + 1) }
			};
			
			// Only include department if provided
			if (department) {
				userData.department = department;
			}
			
			const user = new User(userData);
			await user.save();
			console.log('✅ User saved to database:', user._id);
			
			const token = generateToken(user._id);
			const refreshToken = generateRefreshToken(user._id);
			console.log('✅ Tokens generated');
			
			// Return complete user data
			const userResponse = {
				_id: user._id,
				name: user.name,
				type: user.type,
				email: user.email,
				department: user.department,
				batch: user.batch,
				phone: user.phone,
				studentInfo: user.studentInfo,
				isVerified: user.isVerified,
				isProfileComplete: !!user.isProfileComplete
			};
			
			console.log('✅ User registered successfully:', userResponse._id);
			console.log('📤 Sending response with status 201');
			
			const response = { 
        success: true,
        message: 'User registered successfully', 
        token, 
        refreshToken, 
        user: userResponse 
      };
      
      console.log('📤 Response data:', JSON.stringify(response, null, 2));
      
      return res.status(201).json(response);
		}

		if (userType === 'faculty') {
      console.log('📝 Processing faculty registration');
      const cleanedEmail = normalizeEmail(email);
			if (!cleanedEmail || !cleanedEmail.endsWith('@kongu.edu')) {
        console.log('❌ Invalid email for faculty:', email);
        return res.status(400).json({ 
          success: false,
          error: 'Use your Kongu email (@kongu.edu)',
          message: 'Faculty accounts must use a Kongu email address ending with @kongu.edu'
        });
      }
			
			// If department is provided, validate it matches email
			if (department) {
				const match = cleanedEmail.match(/^[a-zA-Z]+\.([a-z]+)@kongu\.edu$/);
				if (!match) return res.status(400).json({ error: `Faculty email must be name.${String(department).toLowerCase()}@kongu.edu` });
				const emailDept = match[1];
				if (emailDept !== String(department).toLowerCase()) return res.status(400).json({ error: `Email department (${emailDept}) doesn't match selected department (${department})` });
			}

			collegeEmail = cleanedEmail;
			
			// Check if email exists in ANY user type (college/personal/professional/migrated)
			const existingUser = await User.findOne(buildEmailLookupQuery(collegeEmail));
			if (existingUser) {
				return res.status(400).json({ 
					error: `Email ${collegeEmail} is already registered as ${existingUser.type}. One email can only be used for one account type.` 
				});
			}

			const hashed = await bcrypt.hash(password, 12);
			const userData = {
				name,
				password: hashed,
				type: userType,
				phone: phone || undefined,
				email: { college: collegeEmail }
			};
			
			// Only include department if provided
			if (department) {
				userData.department = department;
			}
			
			const user = new User(userData);
			await user.save();
			const token = generateToken(user._id);
			const refreshToken = generateRefreshToken(user._id);
			// Return complete user data
			const userResponse = {
				_id: user._id,
				name: user.name,
				type: user.type,
				email: user.email,
				department: user.department,
				phone: user.phone,
				facultyInfo: user.facultyInfo,
				isVerified: user.isVerified,
				isProfileComplete: !!user.isProfileComplete
			};
			console.log('✅ User registered successfully:', userResponse._id);
			return res.status(201).json({ 
        success: true,
        message: 'User registered successfully', 
        token, 
        refreshToken, 
        user: userResponse 
      });
		}

		if (userType === 'alumni') {
      if (!email) return res.status(400).json({ error: 'Email is required for alumni' });
			const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanedEmail = normalizeEmail(email);
			if (!cleanedEmail || !re.test(cleanedEmail)) return res.status(400).json({ error: 'Please provide a valid email address' });
      personalEmail = cleanedEmail;
			
			// Check if email exists in ANY user type (college/personal/professional/migrated)
			const existingUser = await User.findOne(buildEmailLookupQuery(personalEmail));
			if (existingUser) {
				return res.status(400).json({ 
					error: `Email ${personalEmail} is already registered as ${existingUser.type}. One email can only be used for one account type.` 
				});
			}

			const hashed = await bcrypt.hash(password, 12);
			const user = new User({ name, password: hashed, type: userType, phone: phone || undefined, email: { personal: personalEmail }, company: company || undefined, designation: designation || undefined });
    await user.save();
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
			// Return complete user data
			const userResponse = {
				_id: user._id,
				name: user.name,
				type: user.type,
				email: user.email,
				company: user.company,
				designation: user.designation,
				phone: user.phone,
				alumniInfo: user.alumniInfo,
				isVerified: user.isVerified,
				isProfileComplete: !!user.isProfileComplete
			};
			console.log('✅ User registered successfully:', userResponse._id);
			return res.status(201).json({ 
        success: true,
        message: 'User registered successfully', 
        token, 
        refreshToken, 
        user: userResponse 
      });
		}

		return res.status(400).json({ 
      success: false,
      error: 'Invalid userType. Use student, faculty, or alumni',
      message: 'userType must be one of: student, faculty, or alumni'
    });
	} catch (error) {
		console.error('❌ Registration error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    if (error.stack) {
      console.error('❌ Error stack:', error.stack);
    }
    
    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Registration failed. Please try again.';
    
    res.status(500).json({ 
      success: false,
      error: 'Registration failed',
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        errorName: error.name,
        stack: error.stack 
      })
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
		if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne(buildEmailLookupQuery(normalizedEmail)).select('+password');
    if (!user) {
      console.log('❌ Login failed - user not found for email:', normalizedEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
		// Use the comparePassword method for consistent password comparison
		const ok = await user.comparePassword(password);
    if (!ok) {
      console.log('❌ Login failed - password mismatch for user:', user._id);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } },
      { runValidators: false }
    );
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
		// Return complete user data including all registration and profile completion fields
		const userResponse = {
			_id: user._id,
			name: user.name,
			email: user.email,
			type: user.type,
			avatar: user.avatar,
			isVerified: user.isVerified,
			isProfileComplete: !!user.isProfileComplete,
			// Basic profile fields
			phone: user.phone,
			bio: user.bio,
			location: user.location,
			city: user.city,
			state: user.state,
			country: user.country,
			timezone: user.timezone,
			dateOfBirth: user.dateOfBirth,
			gender: user.gender,
			// Professional fields
			department: user.department,
			batch: user.batch,
			company: user.company,
			designation: user.designation,
			experience: user.experience,
			// Skills and interests
			skills: user.skills,
			languages: user.languages,
			interests: user.interests,
			goals: user.goals,
			extraCurricularActivities: user.extraCurricularActivities,
			// Links and documents
			socialLinks: user.socialLinks,
			resume: user.resume,
			portfolio: user.portfolio,
			// Type-specific info
			studentInfo: user.studentInfo,
			alumniInfo: user.alumniInfo,
			facultyInfo: user.facultyInfo,
			joinYear: user.studentInfo?.joinYear || user.joinYear
		};
		res.json({ message: 'Login successful', token, refreshToken, user: userResponse });
  } catch (error) {
    console.error('Login error:', error);
		if (error.name === 'ValidationError') return res.status(400).json({ error: 'Invalid input data' });
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
		if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
	} catch (e) { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, batch, department, company, designation, location, experience, bio, professionalEmail } = req.body;
    const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Update basic fields
    if (name) user.name = name;
    if (batch) user.batch = batch;
    if (department) user.department = department;
    if (company) user.company = company;
    if (designation) user.designation = designation;
    if (location) user.location = location;
    if (experience) user.experience = experience;
    if (bio) user.bio = bio;
    if (professionalEmail) user.professionalEmail = professionalEmail;
    
    // Automatically set isProfileComplete to true if user has basic information
    const hasBasicProfile = user.name && user.email && (
      user.department || 
      user.bio || 
      user.company ||
      user.designation ||
      user.location ||
      user.experience
    );
    
    if (hasBasicProfile) {
      user.isProfileComplete = true;
    }
    
    await user.save();
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
		const userResponse = { _id: user._id, name: user.name, email: user.email, type: user.type, avatar: user.avatar, isVerified: user.isVerified, isProfileComplete: user.isProfileComplete };
		res.json({ message: 'Profile updated successfully', token, refreshToken, user: userResponse });
	} catch (e) { res.status(500).json({ error: 'Profile update failed' }); }
});

// Verify
router.get('/verify', authenticateToken, async (req, res) => {
	try {
		// Fetch complete user data from database
		const user = await User.findById(req.user._id).select('-password');
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		
		// Return complete user data
		const userResponse = {
			_id: user._id,
			name: user.name,
			email: user.email,
			type: user.type,
			avatar: user.avatar,
			isVerified: user.isVerified,
			isProfileComplete: !!user.isProfileComplete,
			// Basic profile fields
			phone: user.phone,
			bio: user.bio,
			location: user.location,
			city: user.city,
			state: user.state,
			country: user.country,
			timezone: user.timezone,
			dateOfBirth: user.dateOfBirth,
			gender: user.gender,
			// Professional fields
			department: user.department,
			batch: user.batch,
			company: user.company,
			designation: user.designation,
			experience: user.experience,
			// Skills and interests
			skills: user.skills,
			languages: user.languages,
			interests: user.interests,
			goals: user.goals,
			extraCurricularActivities: user.extraCurricularActivities,
			// Links and documents
			socialLinks: user.socialLinks,
			resume: user.resume,
			portfolio: user.portfolio,
			// Type-specific info
			studentInfo: user.studentInfo,
			alumniInfo: user.alumniInfo,
			facultyInfo: user.facultyInfo,
			joinYear: user.studentInfo?.joinYear || user.joinYear
		};
		
		res.json({ valid: true, user: userResponse, message: 'Token verified successfully' });
	} catch (error) {
		console.error('Verify error:', error);
		res.status(500).json({ error: 'Token verification failed' });
	}
});

// Departments
router.get('/departments', async (_req, res) => {
	try {
		res.json({ departments: ['mch', 'aid', 'aim', 'mtr', 'aut', 'eee', 'ece', 'cse', 'it', 'eie'] });
	} catch { res.status(500).json({ error: 'Failed to fetch departments' }); }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
		if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
		if (!user) return res.status(401).json({ error: 'Invalid refresh token' });
		const token = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
		res.json({ token, refreshToken: newRefreshToken, user: { _id: user._id, name: user.name, email: user.email, type: user.type, department: user.department, avatar: user.avatar, isVerified: user.isVerified } });
	} catch (e) {
		if (e.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid refresh token' });
		if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Refresh token expired' });
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Student conversion (admin/faculty)
router.post('/convert-student/:studentId', authenticateToken, async (req, res) => {
  try {
		if (req.user.type !== 'faculty' && req.user.type !== 'admin') return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    const { studentId } = req.params;
    const result = await studentConversionService.manualConversion(studentId);
		if (result.success) res.json({ message: result.message });
		else res.status(400).json({ error: result.error });
	} catch { res.status(500).json({ error: 'Conversion failed' }); }
});

// Email expiry status (students)
router.get('/email-expiry-status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const expiryInfo = EmailExpiryService.checkEmailExpiry(user);
    
    res.json({
      hasExpiryWarning: expiryInfo.shouldMigrate || expiryInfo.isExpired,
      expiryInfo,
      message: expiryInfo.isExpired 
        ? 'Your Kongu email has expired. Please update your profile with a personal email.'
        : expiryInfo.shouldMigrate 
        ? `Your Kongu email will expire in ${expiryInfo.daysUntilExpiry} days. Please add a personal email to your profile.`
        : 'Your email is active.',
      hasPersonalEmail: !!user.email?.personal,
      warningLevel: expiryInfo.isExpired ? 'critical' : expiryInfo.shouldMigrate ? 'warning' : 'normal'
    });
  } catch (error) {
    console.error('Email expiry check error:', error);
    res.status(500).json({ error: 'Failed to check email expiry status' });
  }
});

// Migrate student data to personal email
router.post('/migrate-email', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.type !== 'student') {
      return res.status(400).json({ error: 'Email migration is only available for students' });
    }

    const result = await EmailExpiryService.migrateStudentData(user._id);
    res.json(result);
  } catch (error) {
    console.error('Email migration error:', error);
    res.status(500).json({ error: error.message || 'Failed to migrate email data' });
  }
});

// Admin endpoint to process all expiring emails
router.post('/admin/process-expiring-emails', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is admin (you can add admin role to user model)
    if (user.type !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Only faculty can process expiring emails.' });
    }

    const results = await EmailExpiryService.processExpiringEmails();
    res.json(results);
  } catch (error) {
    console.error('Process expiring emails error:', error);
    res.status(500).json({ error: 'Failed to process expiring emails' });
  }
});

// Google OAuth callback handler (GET request from Google redirect)
// This route MUST be registered BEFORE /google route to avoid conflicts
// IMPORTANT: This route handles the OAuth callback from Google
router.get('/callback', async (req, res) => {
  try {
    console.log('=== OAuth callback route hit! ===');
    console.log('Full URL:', req.originalUrl);
    console.log('Method:', req.method);
    console.log('Query params:', req.query);
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8083';
    
    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${frontendUrl}/dashboard?section=meetings&google_auth=error&error=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      console.error('No authorization code received');
      return res.redirect(`${frontendUrl}/dashboard?section=meetings&google_auth=error&error=no_code`);
    }
    
    console.log('Authorization code received:', code.substring(0, 20) + '...');
    
    // Parse state to get user info (state should contain user token or session info)
    let userId = null;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
        console.log('User ID from state:', userId);
      } catch (e) {
        console.error('Error parsing state:', e);
      }
    }
    
    // If no userId in state, try to get from session or token
    // For now, we'll require the user to be logged in and pass token via state
    if (!userId) {
      console.error('No userId found in state parameter');
      return res.redirect(`${frontendUrl}/dashboard?section=meetings&google_auth=error&error=no_user`);
    }
    
    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const googleCalendarService = new GoogleCalendarService();
    const tokens = await googleCalendarService.getTokens(code);
    console.log('Tokens received successfully');
    
    // Save tokens to user's record
    console.log('Saving tokens to user record:', userId);
    console.log('Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      tokenType: tokens.token_type,
      scope: tokens.scope
    });
    
    // Prepare tokens object with proper structure
    // Handle expiry_date - it might be a Date object or timestamp
    let expiryDate = null;
    if (tokens.expiry_date) {
      expiryDate = typeof tokens.expiry_date === 'number' 
        ? tokens.expiry_date 
        : new Date(tokens.expiry_date).getTime();
    }
    
    const tokensToSave = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: expiryDate,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope
    };
    
    // Update user with tokens
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          googleCalendarConnected: true,
          googleCalendarTokens: tokensToSave
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      console.error('User not found for update:', userId);
      return res.redirect(`${frontendUrl}/dashboard?section=meetings&google_auth=error&error=user_not_found`);
    }
    
    console.log('Tokens saved successfully. User updated:', {
      userId: updatedUser._id,
      googleCalendarConnected: updatedUser.googleCalendarConnected,
      hasTokens: !!updatedUser.googleCalendarTokens,
      hasAccessToken: !!updatedUser.googleCalendarTokens?.access_token
    });
    
    // Redirect back to frontend with success
    console.log('Redirecting to frontend with success');
    return res.redirect(`${frontendUrl}/dashboard?section=meetings&google_auth=success`);
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8083';
    return res.redirect(`${frontendUrl}/dashboard?section=meetings&google_auth=error&error=${encodeURIComponent(error.message)}`);
  }
});

// Get Google OAuth authorization URL
router.get('/google', authenticateToken, (req, res) => {
  try {
    const userId = req.user._id;
    const googleCalendarService = new GoogleCalendarService();
    const authUrl = googleCalendarService.getAuthUrl(userId);
    res.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
});

module.exports = router;
