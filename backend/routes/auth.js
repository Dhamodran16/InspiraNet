const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const EmailExpiryService = require('../services/emailExpiryService');
const studentConversionService = require('../services/studentConversionService');

const router = express.Router();

const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30m' });
const generateRefreshToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', async (req, res) => {
  try {
		const { firstName, lastName, email, password, userType, department, batch, currentYear, company, designation, phone } = req.body;

		if (!firstName || !lastName || !password || !userType) {
			return res.status(400).json({ error: 'firstName, lastName, password and userType are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

		const name = `${firstName.trim()} ${lastName.trim()}`;
    let collegeEmail = null;
    let personalEmail = null;

		if (userType === 'student') {
			if (!email || !email.toLowerCase().endsWith('@kongu.edu')) return res.status(400).json({ error: 'Use your Kongu email (@kongu.edu)' });

			// name.yydept@kongu.edu -> capture year and dept code
			const m = email.match(/^[a-zA-Z]+\.(\d{2})([a-z]+)@kongu\.edu$/);
			if (!m) return res.status(400).json({ error: 'Student email must be like name.yydept@kongu.edu (e.g., john.23aim@kongu.edu)' });
			const emailYear = parseInt(m[1], 10);
			const emailDept = m[2];
			
			// If department is provided, validate it matches email
			if (department) {
				// Department short forms per latest requirement (Civil removed)
				const deptMapping = { MCH: 'mch', AID: 'aid', AIM: 'aim', MTR: 'mtr', AUT: 'aut', EEE: 'eee', ECE: 'ece', CSE: 'cse', IT: 'it', EIE: 'eie' };
				const expectedDept = deptMapping[department] || String(department).toLowerCase();
				if (emailDept !== expectedDept) return res.status(400).json({ error: `Email department (${emailDept}) doesn't match selected department (${department})` });
			}

			// Derive join year from currentYear (I/II/III/IV) or batch
			const romanToNum = { I: 1, II: 2, III: 3, IV: 4, '1': 1, '2': 2, '3': 3, '4': 4 };
			let joinYear;
			if (currentYear) {
				const n = romanToNum[String(currentYear).toUpperCase()];
				if (!n) return res.status(400).json({ error: 'Invalid current year. Use I, II, III, or IV' });
				const now = new Date().getFullYear();
				joinYear = now - (n - 1);
				if ((joinYear % 100) !== emailYear) return res.status(400).json({ error: `Email year (${emailYear}) does not match derived join year (${String(joinYear).slice(-2)})` });
			} else if (batch) {
				const by = parseInt(batch, 10);
				if (isNaN(by) || by < 2000) return res.status(400).json({ error: 'Invalid batch year' });
				joinYear = by;
				if ((by % 100) !== emailYear) return res.status(400).json({ error: `Email year (${emailYear}) does not match batch year (${batch})` });
			} else {
				return res.status(400).json({ error: 'Provide currentYear (I/II/III/IV)' });
      }

      collegeEmail = email.toLowerCase();
			
			// Check if email exists in ANY user type (college or personal)
			const existingUser = await User.findOne({
				$or: [
					{ 'email.college': collegeEmail },
					{ 'email.personal': collegeEmail }
				]
			});
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
			const token = generateToken(user._id);
			const refreshToken = generateRefreshToken(user._id);
			return res.status(201).json({ message: 'User registered successfully', token, refreshToken, user: { _id: user._id, name: user.name, type: user.type, email: user.email, department: user.department, batch: user.batch } });
		}

		if (userType === 'faculty') {
			if (!email || !email.toLowerCase().endsWith('@kongu.edu')) return res.status(400).json({ error: 'Use your Kongu email (@kongu.edu)' });
			
			// If department is provided, validate it matches email
			if (department) {
				const match = email.match(/^[a-zA-Z]+\.([a-z]+)@kongu\.edu$/);
				if (!match) return res.status(400).json({ error: `Faculty email must be name.${String(department).toLowerCase()}@kongu.edu` });
				const emailDept = match[1];
				if (emailDept !== String(department).toLowerCase()) return res.status(400).json({ error: `Email department (${emailDept}) doesn't match selected department (${department})` });
			}

			collegeEmail = email.toLowerCase();
			
			// Check if email exists in ANY user type (college or personal)
			const existingUser = await User.findOne({
				$or: [
					{ 'email.college': collegeEmail },
					{ 'email.personal': collegeEmail }
				]
			});
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
			return res.status(201).json({ message: 'User registered successfully', token, refreshToken, user: { _id: user._id, name: user.name, type: user.type, email: user.email, department: user.department } });
		}

		if (userType === 'alumni') {
			if (!email) return res.status(400).json({ error: 'Email is required for alumni' });
			const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!re.test(email)) return res.status(400).json({ error: 'Please provide a valid email address' });
      personalEmail = email.toLowerCase();
			
			// Check if email exists in ANY user type (college or personal)
			const existingUser = await User.findOne({
				$or: [
					{ 'email.college': personalEmail },
					{ 'email.personal': personalEmail }
				]
			});
			if (existingUser) {
				return res.status(400).json({ 
					error: `Email ${personalEmail} is already registered as ${existingUser.type}. One email can only be used for one account type.` 
				});
			}

			const hashed = await bcrypt.hash(password, 12);
			const user = new User({ name, password: hashed, type: userType, phone: phone || undefined, email: { personal: personalEmail }, currentCompany: company || undefined, designation: designation || undefined });
    await user.save();
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
			return res.status(201).json({ message: 'User registered successfully', token, refreshToken, user: { _id: user._id, name: user.name, type: user.type, email: user.email, currentCompany: user.currentCompany, designation: user.designation } });
		}

		return res.status(400).json({ error: 'Invalid userType. Use student, faculty, or alumni' });
	} catch (error) {
		console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
		if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
		const user = await User.findOne({ $or: [{ 'email.college': email.toLowerCase() }, { 'email.personal': email.toLowerCase() }] });
		if (!user) return res.status(401).json({ error: 'Invalid email or password' });
		const ok = await bcrypt.compare(password, user.password);
		if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    user.lastLogin = new Date();
    await user.save();
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
		const userResponse = { _id: user._id, name: user.name, email: user.email, type: user.type, department: user.department, avatar: user.avatar, isVerified: user.isVerified, isProfileComplete: !!user.isProfileComplete, bio: user.bio, location: user.location, studentInfo: user.studentInfo, alumniInfo: user.alumniInfo, facultyInfo: user.facultyInfo };
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
router.get('/verify', authenticateToken, (req, res) => {
	try { res.json({ valid: true, user: req.user, message: 'Token verified successfully' }); }
	catch { res.status(500).json({ error: 'Token verification failed' }); }
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

module.exports = router;
