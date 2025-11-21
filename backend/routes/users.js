const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Log route registration for debugging
console.log('📋 User routes module loaded');
console.log('   Routes will be mounted at /api/users');
const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');

const Follow = require('../models/Follow');
const FollowRequest = require('../models/FollowRequest');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const UserSettings = require('../models/UserSettings');
const Connection = require('../models/Connection');
const Group = require('../models/Group');
const JobPosting = require('../models/JobPosting');
const Placement = require('../models/Placement');
const Meeting = require('../models/Meeting');
const GoogleMeetRoom = require('../models/GoogleMeetRoom');
const { authenticateToken } = require('../middleware/auth');

// ⚠️ IMPORTANT: Route order matters in Express.js!
// Specific routes (like /profile) MUST be defined BEFORE parameterized routes (like /:userId)
// Otherwise, Express will match /profile as /:userId with userId="profile", causing CastError

// Middleware to validate MongoDB ObjectId for userId parameters
// This prevents reserved words like "profile" from being treated as userId
const validateObjectId = (req, res, next) => {
  const userId = req.params.userId;
  
  // List of reserved words that should not be treated as userId
  const reservedWords = ['profile', 'preferences', 'settings', 'search', 'directory', 'verify-email', 'change-password', 'delete-account', 'security-info'];
  
  if (userId) {
    // Check if it's a reserved word first
    if (reservedWords.includes(userId.toLowerCase())) {
      console.log(`❌ Rejected reserved word "${userId}" as userId parameter`);
      return res.status(400).json({ 
        error: 'Invalid user ID',
        message: `"${userId}" is a reserved route and cannot be used as a user ID`
      });
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`❌ Invalid ObjectId format: "${userId}"`);
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        message: 'User ID must be a valid MongoDB ObjectId'
      });
    }
  }
  
  next();
};

// Get all users (for search/discovery)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, department, batch } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { 'studentInfo.department': { $regex: search, $options: 'i' } },
        { 'facultyInfo.department': { $regex: search, $options: 'i' } },
        { batch: { $regex: search, $options: 'i' } },
        { 'studentInfo.batch': { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) query.type = type;
    if (department) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { department: { $regex: new RegExp(`^${department}$`, 'i') } },
          { 'studentInfo.department': { $regex: new RegExp(`^${department}$`, 'i') } },
          { 'facultyInfo.department': { $regex: new RegExp(`^${department}$`, 'i') } }
        ]
      });
    }
    if (batch) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { batch: batch },
          { 'studentInfo.batch': batch }
        ]
      });
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user profile (comprehensive)
// ⚠️ IMPORTANT: This route MUST be defined before /:userId to prevent route conflicts
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('✅ PUT /api/users/profile route matched');
    console.log('📝 Profile update request received');
    console.log('📥 Request headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'Bearer [TOKEN_PRESENT]' : 'MISSING'
    });
    
    const userId = req.user._id;
    const updateData = req.body || {};
    const normalizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : undefined;
    const normalizeString = (value) => typeof value === 'string' ? value.trim() : '';
    
    const resolvedName = normalizeString(updateData.name) || normalizeString(req.user?.name);
    if (!resolvedName) {
      console.log('❌ Validation failed: Name missing on payload and user record');
      return res.status(400).json({ 
        success: false,
        error: 'Name is required',
        message: 'The name field is required for profile updates'
      });
    }
    updateData.name = resolvedName;

    console.log('📥 Received payload (full):', JSON.stringify(updateData, null, 2));
    console.log('📥 Received payload (summary):', {
      name: updateData.name,
      email: updateData.email,
      hasStudentInfo: !!updateData.studentInfo,
      hasAlumniInfo: !!updateData.alumniInfo,
      hasFacultyInfo: !!updateData.facultyInfo,
      skillsCount: updateData.skills?.length || 0,
      hasSocialLinks: !!updateData.socialLinks,
      department: updateData.department,
      keys: Object.keys(updateData)
    });

    // Validate required fields
    // Handle email update (can be object with college/personal or string)
    let emailUpdate = {};
    if (updateData.email) {
      if (typeof updateData.email === 'object') {
        const currentCollege = normalizeEmail(req.user?.email?.college);
        const currentPersonal = normalizeEmail(req.user?.email?.personal);
        const incomingCollege = normalizeEmail(updateData.email.college);
        const incomingPersonal = normalizeEmail(updateData.email.personal);
        
        if (incomingCollege && incomingCollege !== currentCollege) {
    const existingUser = await User.findOne({ 
            'email.college': incomingCollege, 
      _id: { $ne: userId } 
    });
          if (existingUser) {
            return res.status(400).json({ error: 'College email is already taken' });
          }
          emailUpdate.college = incomingCollege;
        }
        if (incomingPersonal && incomingPersonal !== currentPersonal) {
          const existingUser = await User.findOne({ 
            'email.personal': incomingPersonal, 
            _id: { $ne: userId } 
          });
          if (existingUser) {
            return res.status(400).json({ error: 'Personal email is already taken' });
          }
          emailUpdate.personal = incomingPersonal;
        }
      } else {
        // Email is a string (legacy support)
        const incomingEmail = normalizeEmail(updateData.email);
        if (incomingEmail) {
        const existingUser = await User.findOne({ 
            email: incomingEmail, 
          _id: { $ne: userId } 
        });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already taken' });
          }
          emailUpdate = incomingEmail;
        }
      }
    }

    // Prepare update object with all profile fields
    const profileUpdate = {
      name: updateData.name,
      ...(Object.keys(emailUpdate).length > 0 && { email: emailUpdate }),
      phone: updateData.phone,
      dateOfBirth: updateData.dateOfBirth,
      gender: updateData.gender,
      bio: updateData.bio,
      location: updateData.location,
      city: updateData.city,
      state: updateData.state,
      country: updateData.country,
      timezone: updateData.timezone,
      skills: updateData.skills || [],
      languages: updateData.languages || [],
      extraCurricularActivities: updateData.extraCurricularActivities || [],
      interests: updateData.interests || [],
      goals: updateData.goals || [],
      socialLinks: updateData.socialLinks || {},
      resume: updateData.resume,
      portfolio: updateData.portfolio
    };

    // Handle department - set at root level and in type-specific info
    if (updateData.department) {
      profileUpdate.department = updateData.department;
    }

    // Handle type-specific information
    if (updateData.studentInfo) {
      profileUpdate.studentInfo = {
        ...updateData.studentInfo,
        department: updateData.department || updateData.studentInfo.department
      };
      // Also set batch at root level if provided
      if (updateData.studentInfo.batch) {
        profileUpdate.batch = updateData.studentInfo.batch;
      }
      if (updateData.studentInfo.joinYear) {
        profileUpdate.joinYear = updateData.studentInfo.joinYear;
      }
    }
    if (updateData.alumniInfo) {
      profileUpdate.alumniInfo = updateData.alumniInfo;
      // Also set company at root level if provided
      if (updateData.alumniInfo.currentCompany) {
        profileUpdate.company = updateData.alumniInfo.currentCompany;
      }
      // Also set batch at root level from graduationYear if provided (for alumni, graduationYear is their batch)
      if (updateData.alumniInfo.graduationYear) {
        profileUpdate.batch = String(updateData.alumniInfo.graduationYear);
      }
    }
    if (updateData.facultyInfo) {
      profileUpdate.facultyInfo = {
        ...updateData.facultyInfo,
        department: updateData.department || updateData.facultyInfo.department
      };
      // Also set designation at root level if provided
      if (updateData.facultyInfo.designation) {
        profileUpdate.designation = updateData.facultyInfo.designation;
      }
    }

    // Automatically set isProfileComplete to true if user has basic information
    const hasBasicProfile = updateData.name && updateData.email && (
      updateData.department || 
      updateData.bio || 
      (updateData.skills && updateData.skills.length > 0) ||
      updateData.studentInfo?.department ||
      updateData.alumniInfo?.currentCompany ||
      updateData.facultyInfo?.department
    );
    
    if (hasBasicProfile) {
      profileUpdate.isProfileComplete = true;
    }

    console.log('📝 Updating profile with data:', profileUpdate);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      profileUpdate,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Profile updated successfully');

    // Emit socket event for real-time profile update
    const io = req.app.get('io');
    if (io) {
      const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
      // Emit to user's own room for their own profile updates
      io.to(`user_${userId}`).emit('profile_updated', { user: userObj });
      // Also emit to all users who might be viewing this profile
      io.emit('user_profile_updated', { userId: userId.toString(), user: userObj });
      console.log(`✅ Emitted profile_updated event for user ${userId}`);
    }

    console.log('✅ Profile updated successfully for user:', userId);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    if (error.stack) {
      console.error('❌ Error stack:', error.stack);
    }
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      console.error('❌ Mongoose validation error:', error.errors);
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        message: 'Some fields failed validation',
        details: error.message,
        validationErrors: error.errors
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile',
      details: error.message,
      errorName: error.name
    });
  }
});

// Check email verification status
router.get('/verify-email', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('emailVerified');
    
    res.json({
      success: true,
      verified: user?.emailVerified || false
    });
  } catch (error) {
    console.error('Error checking email verification:', error);
    res.status(500).json({ error: 'Failed to check email verification' });
  }
});

// Get user notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    
    // Default preferences if none exist
    const defaultPreferences = {
      email: {
        enabled: true,
        frequency: 'daily',
        types: {
          followRequests: true,
          newFollowers: true,
          postLikes: true,
          postComments: true,
          messages: true,
          events: true,
          jobUpdates: true,
          achievements: true
        }
      },
      push: {
        enabled: true,
        frequency: 'immediate',
        types: {
          followRequests: true,
          newFollowers: true,
          postLikes: true,
          postComments: true,
          messages: true,
          events: true,
          jobUpdates: true,
          achievements: true
        }
      },
      inApp: {
        enabled: true,
        frequency: 'immediate',
        types: {
          followRequests: true,
          newFollowers: true,
          postLikes: true,
          postComments: true,
          messages: true,
          events: true,
          jobUpdates: true,
          achievements: true
        }
      },
      privacy: {
        showOnlineStatus: true,
        showLastSeen: true,
        allowNotificationsFrom: 'everyone'
      }
    };

    const preferences = user?.notificationPreferences || defaultPreferences;
    
    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { notificationPreferences: preferences } },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      preferences: updatedUser.notificationPreferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get current user's full profile (private) - MUST be before /:userId route
// This route MUST be registered before router.get('/:userId') to prevent "profile" from being matched as userId
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Explicitly log that this route was matched (not /:userId)
    console.log('✅ GET /api/users/profile - Current user profile route matched');
    
    // Check if user is authenticated
    if (!req.user) {
      console.error('❌ No user in request object');
      return res.status(401).json({ error: 'User not authenticated', details: 'No user found in request' });
    }
    
    // Get userId from req.user - req.user is already the user document from auth middleware
    const userId = req.user._id || req.user.id;
    
    if (!userId) {
      console.error('❌ No userId found in req.user');
      console.error('❌ req.user type:', typeof req.user);
      console.error('❌ req.user keys:', req.user ? Object.keys(req.user) : 'req.user is null/undefined');
      return res.status(401).json({ error: 'User not authenticated', details: 'No user ID found' });
    }
    
    console.log('🔍 Fetching profile for userId:', userId);

    // Use req.user directly since it's already populated from auth middleware
    // But we need to fetch fresh data to ensure we have all fields
    const user = await User.findById(userId)
      .select('-password')
      .lean(); // Use lean() to get plain JavaScript object, avoiding Mongoose document issues

    if (!user) {
      console.error('❌ User not found in database for userId:', userId);
      return res.status(404).json({ error: 'User not found', details: `User with ID ${userId} not found` });
    }

    // Ensure batch is set at root level if available in type-specific info
    if (!user.batch) {
      if (user.studentInfo?.batch) {
        user.batch = user.studentInfo.batch;
      } else if (user.type === 'alumni' && user.alumniInfo?.graduationYear) {
        user.batch = String(user.alumniInfo.graduationYear);
      }
    }

    // Populate followers and following separately with error handling
    try {
      if (user.followers && Array.isArray(user.followers) && user.followers.length > 0) {
        // Filter out any invalid ObjectIds
        const validFollowerIds = user.followers.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validFollowerIds.length > 0) {
          const followers = await User.find({ _id: { $in: validFollowerIds } })
            .select('name avatar type')
            .lean();
          user.followers = followers || [];
        } else {
          user.followers = [];
        }
      } else {
        user.followers = [];
      }
    } catch (populateError) {
      console.warn('⚠️ Error populating followers:', populateError.message);
      user.followers = [];
    }
    
    try {
      if (user.following && Array.isArray(user.following) && user.following.length > 0) {
        // Filter out any invalid ObjectIds
        const validFollowingIds = user.following.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validFollowingIds.length > 0) {
          const following = await User.find({ _id: { $in: validFollowingIds } })
            .select('name avatar type')
            .lean();
          user.following = following || [];
        } else {
          user.following = [];
        }
      } else {
        user.following = [];
      }
    } catch (populateError) {
      console.warn('⚠️ Error populating following:', populateError.message);
      user.following = [];
    }

    console.log('✅ Profile fetched successfully for user:', user.name || 'Unknown');
    res.json({ user });

  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    if (error.stack) {
      console.error('❌ Error stack:', error.stack);
    }
    res.status(500).json({ 
      error: 'Failed to fetch profile', 
      details: error.message,
      errorName: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get user profile by ID (public) - MUST be before /:userId route
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -email -phone -dateOfBirth -notificationPreferences')
      .populate('followers', 'name avatar type')
      .populate('following', 'name avatar type');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get user by ID - MUST be after specific routes like /profile
router.get('/:userId', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Double-check: If somehow "profile" got through, reject it here too
    if (userId === 'profile' || userId === 'Profile') {
      console.error('❌ CRITICAL: "profile" matched /:userId route - this should not happen!');
      return res.status(400).json({ 
        error: 'Invalid route',
        message: 'Use /api/users/profile to get your profile, not /api/users/:userId'
      });
    }

    console.log('✅ /:userId route matched - userId:', userId);
    
    const user = await User.findById(userId)
      .select('-password -notificationPreferences')
      .populate('followers', 'name avatar type department batch')
      .populate('following', 'name avatar type department batch')
      .populate('followRequests.from', 'name avatar type department batch')
      .populate('pendingFollowRequests', 'name avatar type department batch')
      .lean(); // Use lean() for better performance

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure batch is set at root level if available in type-specific info
    if (!user.batch) {
      if (user.studentInfo?.batch) {
        user.batch = user.studentInfo.batch;
      } else if (user.type === 'alumni' && user.alumniInfo?.graduationYear) {
        user.batch = String(user.alumniInfo.graduationYear);
      }
    }

    // Get user settings to check privacy preferences
    const UserSettings = require('../models/UserSettings');
    const settings = await UserSettings.findOne({ userId: userId }).lean();

    // Filter fields based on privacy settings if viewing other user's profile
    const currentUserId = req.user?._id?.toString();
    const isOwnProfile = currentUserId === userId;
    
    const userWithStats = { ...user };
    userWithStats.followersCount = user.followers?.length || 0;
    userWithStats.followingCount = user.following?.length || 0;
    userWithStats.postsCount = 0; // Will be populated separately if needed
    
    // Apply privacy filters if not own profile
    if (!isOwnProfile && settings) {
      // Hide email if privacy setting says so
      if (!settings.privacy?.showEmail) {
        delete userWithStats.email;
      }
      
      // Hide phone if privacy setting says so
      if (!settings.privacy?.showPhone) {
        delete userWithStats.phone;
      }
      
      // Hide location if privacy setting says so
      if (!settings.privacy?.showLocation) {
        delete userWithStats.location;
        delete userWithStats.city;
        delete userWithStats.state;
        delete userWithStats.country;
      }
      
      // Hide company if privacy setting says so
      if (!settings.privacy?.showCompany) {
        delete userWithStats.company;
        if (userWithStats.alumniInfo) {
          delete userWithStats.alumniInfo.currentCompany;
        }
      }
      
      // Hide batch if privacy setting says so
      if (!settings.privacy?.showBatch) {
        delete userWithStats.batch;
        if (userWithStats.studentInfo) {
          delete userWithStats.studentInfo.batch;
        }
      }
      
      // Hide department if privacy setting says so
      if (!settings.privacy?.showDepartment) {
        delete userWithStats.department;
        if (userWithStats.studentInfo) {
          delete userWithStats.studentInfo.department;
        }
        if (userWithStats.facultyInfo) {
          delete userWithStats.facultyInfo.department;
        }
      }
    }

    res.json(userWithStats);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Follow user endpoint
router.post('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;

    if (currentUser._id.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    if (targetUser.followers.includes(currentUser._id)) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Direct follow - add to followers and following
    if (!targetUser.followers.includes(currentUser._id)) {
      targetUser.followers.push(currentUser._id);
    }

    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
    }

    // Remove any existing follow requests
    targetUser.followRequests = targetUser.followRequests.filter(
      request => request.from.toString() !== currentUser._id.toString()
    );

    // Remove from pending requests
    currentUser.pendingFollowRequests = currentUser.pendingFollowRequests.filter(
      id => id.toString() !== targetUserId
    );

    await targetUser.save();
    await currentUser.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Emit to target user about new follower
      io.to(`user_${targetUserId}`).emit('new_follower', {
        followerId: currentUser._id,
        followerName: currentUser.name,
        followerType: currentUser.type,
        timestamp: new Date()
      });

      // Emit follow event for stats updates
      io.emit('follow_user', {
        followerId: currentUser._id,
        targetUserId: targetUserId,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Followed successfully' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow user endpoint
router.delete('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from followers and following
    targetUser.followers = targetUser.followers.filter(
      id => id.toString() !== currentUser._id.toString()
    );

    currentUser.following = currentUser.following.filter(
      id => id.toString() !== targetUserId
    );

    // Remove follow request if exists
    targetUser.followRequests = targetUser.followRequests.filter(
      request => request.from.toString() !== currentUser._id.toString()
    );

    await targetUser.save();
    await currentUser.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Emit to target user about unfollow
      io.to(`user_${targetUserId}`).emit('user_unfollowed', {
        followerId: currentUser._id,
        followerName: currentUser.name,
        timestamp: new Date()
      });

      // Emit unfollow event for stats updates
      io.emit('unfollow_user', {
        followerId: currentUser._id,
        targetUserId: targetUserId,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get user stats
router.get('/:userId/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get post count
    let postCount = 0;
    try {
      postCount = await Post.countDocuments({ author: userId });
      console.log('📊 Post count for user', userId, ':', postCount);
    } catch (error) {
      console.error('Error counting posts:', error);
    }

    // Get event count (events the user has attended or created)
    let eventCount = 0;
    try {
      eventCount = await Event.countDocuments({
        $or: [
          { createdBy: userId },
          { attendees: { $in: [userId] } }
        ]
      });
    } catch (error) {
      console.error('Error counting events:', error);
    }

    // Get achievement count from studentInfo
    let achievementCount = 0;
    try {
      const user = await User.findById(userId).select('studentInfo.achievements');
      if (user?.studentInfo?.achievements) {
        achievementCount = user.studentInfo.achievements.length;
      }
    } catch (error) {
      console.error('Error counting achievements:', error);
    }

    // Get connection count (mutual connections only) using Follow model
    let connectionCount = 0;
    try {
      const Follow = require('../models/Follow');
      
      // Get followers and following from Follow model
      const followers = await Follow.find({ followeeId: userId });
      const following = await Follow.find({ followerId: userId });
      
      const followersIds = followers.map(f => f.followerId.toString());
      const followingIds = following.map(f => f.followeeId.toString());
      
      console.log('📊 Stats - Followers count (Follow model):', followersIds.length);
      console.log('📊 Stats - Following count (Follow model):', followingIds.length);
      console.log('📊 Stats - Followers IDs:', followersIds);
      console.log('📊 Stats - Following IDs:', followingIds);
      
      // Find intersection using Set for better performance
      const followersSet = new Set(followersIds);
      const followingSet = new Set(followingIds);
      
      const mutualStr = followersIds.filter(id => followingSet.has(id));
      connectionCount = mutualStr.length;
      
      console.log('📊 Stats - Mutual connections count:', connectionCount);
      console.log('📊 Stats - Mutual connections IDs:', mutualStr);
    } catch (error) {
      console.error('Error counting connections:', error);
    }

    const statsResponse = {
      posts: postCount,
      events: eventCount,
      achievements: achievementCount,
      connections: connectionCount
    };

    console.log('📊 Final stats response:', statsResponse);
    res.json(statsResponse);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Update user profile
router.patch('/:userId', authenticateToken, async (req, res) => {
  try {
    // Only allow users to update their own profile
    if (req.params.userId !== req.user._id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const {
      name,
      bio,
      company,
      designation,
      location,
      experience,
      professionalEmail,
      socialLinks,
      skills,
      interests,
      education,
      workExperience
    } = req.body;

    // Validate required fields
    if (name && name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          ...(name && { name: name.trim() }),
          ...(bio && { bio: bio.trim() }),
          ...(company && { company: company.trim() }),
          ...(designation && { designation: designation.trim() }),
          ...(location && { location: location.trim() }),
          ...(experience && { experience: experience.trim() }),
          ...(professionalEmail && { professionalEmail: professionalEmail.trim() }),
          ...(socialLinks && { socialLinks }),
          ...(skills && { skills }),
          ...(interests && { interests }),
          ...(education && { education }),
          ...(workExperience && { workExperience })
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation error', details: error.message });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload user avatar
router.post('/:userId/avatar', authenticateToken, async (req, res) => {
  try {
    // Only allow users to update their own avatar
    if (req.params.userId !== req.user._id) {
      return res.status(403).json({ error: 'You can only update your own avatar' });
    }

    // This would typically handle file upload via multer
    // For now, we'll just return a success message
    res.json({ message: 'Avatar upload endpoint - implement with multer' });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get user posts
router.get('/:userId/posts', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'name avatar type department batch studentInfo facultyInfo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Post.countDocuments({ author: req.params.userId });
    const totalPages = Math.ceil(total / limit);

    res.json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, type, department, batch, limit = 10 } = req.query;

    if (!q && !type && !department && !batch) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
    }

    // Build search query
    const query = {};
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { 'studentInfo.department': { $regex: q, $options: 'i' } },
        { 'facultyInfo.department': { $regex: q, $options: 'i' } },
        { batch: { $regex: q, $options: 'i' } },
        { 'studentInfo.batch': { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } },
        { skills: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { designation: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (type) query.type = type;
    if (department) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { department: { $regex: new RegExp(`^${department}$`, 'i') } },
          { 'studentInfo.department': { $regex: new RegExp(`^${department}$`, 'i') } },
          { 'facultyInfo.department': { $regex: new RegExp(`^${department}$`, 'i') } }
        ]
      });
    }
    if (batch) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { batch: batch },
          { 'studentInfo.batch': batch }
        ]
      });
    }

    const users = await User.find(query)
      .select('name avatar type department batch company designation location')
      .limit(parseInt(limit))
      .lean();

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user connections (followers, following, mutual)
router.get('/:userId/connections', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;

    // Check if user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get followers and following from Follow model (primary source of truth)
    const Follow = require('../models/Follow');
    
    // Get followers (users who follow the target user) from Follow model
    const followerRelations = await Follow.find({ followeeId: targetUserId })
      .populate('followerId', '_id name avatar type department batch');
    const followers = followerRelations.map(rel => rel.followerId);

    // Get following (users the target user follows) from Follow model
    const followingRelations = await Follow.find({ followerId: targetUserId })
      .populate('followeeId', '_id name avatar type department batch');
    const following = followingRelations.map(rel => rel.followeeId);

    console.log('🔍 Follow model data:');
    console.log('👥 Followers from Follow model:', followers.length);
    console.log('👤 Following from Follow model:', following.length);

    // Get mutual connections using Follow model data (more reliable)
    const followersIds = followers.map(f => f._id.toString());
    const followingIds = following.map(f => f._id.toString());

    console.log('🔍 Debug mutual connections query:');
    console.log('📊 Target user ID:', targetUserId);
    console.log('👥 Followers IDs from Follow model:', followersIds);
    console.log('👤 Following IDs from Follow model:', followingIds);
    console.log('🔢 Followers count:', followersIds.length);
    console.log('🔢 Following count:', followingIds.length);

    // Find intersection of followers and following (mutual connections)
    const followersSet = new Set(followersIds);
    const followingSet = new Set(followingIds);
    
    const mutualStr = followersIds.filter(id => followingSet.has(id));
    const mutualIds = mutualStr.map(id => new mongoose.Types.ObjectId(id));
    
    console.log('🤝 Mutual IDs found (string):', mutualStr);
    console.log('🤝 Mutual IDs found (ObjectId):', mutualIds);
    console.log('🔍 Detailed intersection check:');
    followersIds.forEach(followerId => {
      const isInFollowing = followingSet.has(followerId);
      console.log(`  Follower ${followerId} is in following: ${isInFollowing}`);
    });

    // Additional verification using Follow model
    if (mutualIds.length > 0) {
      console.log('🔍 Verifying mutual connections with Follow model...');
      for (const mutualId of mutualIds) {
        const forwardFollow = await Follow.findOne({
          followerId: targetUserId,
          followeeId: mutualId
        });
        const backwardFollow = await Follow.findOne({
          followerId: mutualId,
          followeeId: targetUserId
        });
        console.log(`🔍 Mutual verification for ${mutualId}: forward=${!!forwardFollow}, backward=${!!backwardFollow}`);
      }
    }

    const mutual = await User.find({
      _id: { $in: mutualIds }
    }).select('_id name avatar type department batch');

    console.log('🤝 Mutual connections found:', mutual.length);
    console.log('📋 Mutual connections data:', mutual);
    console.log('🔍 Mutual IDs used in query:', mutualIds.map(id => id.toString()));
    
    // Check if any mutual IDs are missing from the result
    const foundIds = mutual.map(m => m._id.toString());
    const missingIds = mutualIds.filter(id => !foundIds.includes(id.toString()));
    if (missingIds.length > 0) {
      console.log('⚠️ Missing mutual connections:', missingIds.map(id => id.toString()));
    }

    const response = {
      success: true,
      followers,
      following,
      mutual,
      counts: {
        followers: followers.length,
        following: following.length,
        mutual: mutual.length
      }
    };

    console.log('📤 Sending connections response:', {
      followersCount: followers.length,
      followingCount: following.length,
      mutualCount: mutual.length,
      mutualData: mutual.map(m => ({ id: m._id, name: m.name }))
    });
    
    console.log('🔍 Connections endpoint - Final mutual connections:');
    mutual.forEach((m, index) => {
      console.log(`  ${index + 1}. ${m.name} (${m._id})`);
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching user connections:', error);
    res.status(500).json({ error: 'Failed to fetch user connections' });
  }
});

// Get user achievements
router.get('/:userId/achievements', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('achievements')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ achievements: user.achievements || [] });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Add achievement to user
router.post('/:userId/achievements', authenticateToken, async (req, res) => {
  try {
    // Only allow users to add achievements to their own profile
    if (req.params.userId !== req.user._id) {
      return res.status(403).json({ error: 'You can only add achievements to your own profile' });
    }

    const { title, description, date, certificate } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          achievements: {
            title: title.trim(),
            description: description.trim(),
            date: date || new Date(),
            certificate
          }
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newAchievement = user.achievements[user.achievements.length - 1];

    res.status(201).json({
      message: 'Achievement added successfully',
      achievement: newAchievement
    });
  } catch (error) {
    console.error('Error adding achievement:', error);
    res.status(500).json({ error: 'Failed to add achievement' });
  }
});

// Update achievement
router.patch('/:userId/achievements/:achievementId', authenticateToken, async (req, res) => {
  try {
    // Only allow users to update their own achievements
    if (req.params.userId !== req.user._id) {
      return res.status(403).json({ error: 'You can only update your own achievements' });
    }

    const { title, description, date, certificate } = req.body;

    const user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'achievements._id': req.params.achievementId
      },
      {
        $set: {
          'achievements.$.title': title?.trim(),
          'achievements.$.description': description?.trim(),
          'achievements.$.date': date,
          'achievements.$.certificate': certificate
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User or achievement not found' });
    }

    const updatedAchievement = user.achievements.find(
      a => a._id.toString() === req.params.achievementId
    );

    res.json({
      message: 'Achievement updated successfully',
      achievement: updatedAchievement
    });
  } catch (error) {
    console.error('Error updating achievement:', error);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

// Delete achievement
router.delete('/:userId/achievements/:achievementId', authenticateToken, async (req, res) => {
  try {
    // Only allow users to delete their own achievements
    if (req.params.userId !== req.user._id) {
      return res.status(403).json({ error: 'You can only delete your own achievements' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { achievements: { _id: req.params.achievementId } }
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

// Get all users for alumni directory
router.get('/directory/all', authenticateToken, async (req, res) => {
  try {
    const { search, batch, department, type, page = 1, limit = 20 } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (batch) filter.batch = batch;
    if (department) filter.department = department;
    if (type) filter.type = type;
    
    // Exclude the current user from results
    filter._id = { $ne: req.user._id };
    
    const skip = (page - 1) * limit;
    
    const users = await User.find(filter)
      .select('name email type batch department company designation location avatar bio skills interests')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(filter);
    
    // Get current user's following list to show follow status
    const currentUser = await User.findById(req.user._id).select('following');
    const followingIds = currentUser?.following || [];
    
    const usersWithFollowStatus = users.map(user => ({
      ...user.toObject(),
      isFollowing: followingIds.includes(user._id),
      canMessage: followingIds.includes(user._id) && user.followers?.includes(req.user._id)
    }));
    
    res.json({
      users: usersWithFollowStatus,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching users directory:', error);
    res.status(500).json({ error: 'Failed to fetch users directory' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedPassword;
    user.lastPasswordChange = new Date();
    await user.save();

    // Update user settings to track password change
    const updatedSettingsDoc = await UserSettings.findOneAndUpdate(
      { userId },
      { 
        'security.lastPasswordChange': new Date(),
        'security.requirePasswordChange': false
      },
      { upsert: true, new: true }
    );

    const io = req.app.get('io');
    let settingsObj = null;

    if (updatedSettingsDoc) {
      settingsObj = updatedSettingsDoc.toObject();
    }

    if (io && settingsObj) {
      io.to(`user_${userId}`).emit('settings_updated', { settings: settingsObj, source: 'change-password' });
      io.to(`user_${userId}`).emit('security_event', {
        type: 'password_changed',
        timestamp: new Date().toISOString()
      });
    }

    res.json({ 
      message: 'Password changed successfully',
      lastPasswordChange: user.lastPasswordChange,
      settings: settingsObj
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Delete account
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const { password, confirmDelete } = req.body;
    const userId = req.user._id;

    if (!password || !confirmDelete) {
      return res.status(400).json({ error: 'Password and confirmation are required' });
    }

    if (confirmDelete !== 'DELETE') {
      return res.status(400).json({ error: 'Please type DELETE to confirm account deletion' });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    // Gather related IDs/emails for cleanup
    const [userPosts, userConversations] = await Promise.all([
      Post.find({ author: userId }).select('_id'),
      Conversation.find({ participants: userId }).select('_id')
    ]);

    const postIds = userPosts.map(post => post._id);
    const conversationIds = userConversations.map(conv => conv._id);

    const emailValues = new Set();
    if (typeof user.email === 'string') {
      emailValues.add(user.email);
    } else if (user.email && typeof user.email === 'object') {
      ['college', 'personal', 'professional'].forEach(key => {
        if (user.email[key]) {
          emailValues.add(user.email[key]);
        }
      });
    }
    const meetingEmailList = Array.from(emailValues).reduce((acc, email) => {
      if (!email) return acc;
      acc.add(email);
      acc.add(email.toLowerCase());
      return acc;
    }, new Set());
    const meetingEmails = Array.from(meetingEmailList).filter(Boolean);

    const createdByValues = [...new Set([userId.toString(), user.name].filter(Boolean))];

    const deletionOperations = [
      Post.deleteMany({ author: userId }),
      Post.updateMany({ likes: userId }, { $pull: { likes: userId } }),
      Post.updateMany({ 'comments.author': userId }, { $pull: { comments: { author: userId } } }),
      Post.updateMany({ 'shares.userId': userId }, { $pull: { shares: { userId } } }),
      Follow.deleteMany({
        $or: [{ followerId: userId }, { followeeId: userId }]
      }),
      FollowRequest.deleteMany({
        $or: [{ requesterId: userId }, { targetId: userId }]
      }),
      Notification.deleteMany({
        $or: [{ recipientId: userId }, { senderId: userId }]
      }),
      UserSettings.findOneAndDelete({ userId }),
      Connection.deleteMany({
        $or: [{ user1: userId }, { user2: userId }]
      }),
      Group.updateMany(
        { 'members.userId': userId },
        { $pull: { members: { userId } } }
      ),
      Group.deleteMany({ createdBy: userId }),
      JobPosting.deleteMany({ postedBy: userId }),
      Placement.deleteMany({ student: userId }),
      Meeting.deleteMany({ host_id: userId.toString() }),
      GoogleMeetRoom.deleteMany({ host_id: userId }),
      Event.deleteMany({ createdBy: { $in: createdByValues } }),
      Event.updateMany(
        { attendees: userId },
        { $pull: { attendees: userId } }
      ),
      User.findByIdAndDelete(userId)
    ];

    if (conversationIds.length > 0) {
      deletionOperations.push(
        Conversation.deleteMany({ _id: { $in: conversationIds } })
      );
      const messageConditions = [{ senderId: userId }, { conversationId: { $in: conversationIds } }];
      deletionOperations.push(
        Message.deleteMany({ $or: messageConditions })
      );
    } else {
      deletionOperations.push(
        Message.deleteMany({ senderId: userId })
      );
    }

    if (postIds.length > 0) {
      deletionOperations.push(
        Group.updateMany(
          { posts: { $in: postIds } },
          { $pull: { posts: { $in: postIds } } }
        )
      );
    }

    if (meetingEmails.length > 0) {
      deletionOperations.push(
        Meeting.updateMany(
          { 'attendees.email': { $in: meetingEmails } },
          { $pull: { attendees: { email: { $in: meetingEmails } } } }
        ),
        Meeting.updateMany(
          { 'expected_attendees.email': { $in: meetingEmails } },
          { $pull: { expected_attendees: { email: { $in: meetingEmails } } } }
        ),
        Meeting.updateMany(
          { 'attendance.email': { $in: meetingEmails } },
          { $pull: { attendance: { email: { $in: meetingEmails } } } }
        ),
        Meeting.updateMany(
          { 'attendance_logs.email': { $in: meetingEmails } },
          { $pull: { attendance_logs: { email: { $in: meetingEmails } } } }
        )
      );
    }

    await Promise.all(deletionOperations);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get account security info
router.get('/security-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('email createdAt lastLogin');
    const userSettings = await UserSettings.findOne({ userId });
    
    const securityInfo = {
      email: user.email,
      accountCreated: user.createdAt,
      lastLogin: user.lastLogin,
      passwordLastChanged: userSettings?.security?.lastPasswordChange,
      twoFactorEnabled: userSettings?.security?.twoFactorEnabled || false,
      sessionTimeout: userSettings?.security?.sessionTimeout || 24,
      requirePasswordChange: userSettings?.security?.requirePasswordChange || false
    };

    res.json(securityInfo);
  } catch (error) {
    console.error('Error getting security info:', error);
    res.status(500).json({ error: 'Failed to get security info' });
  }
});

module.exports = router;