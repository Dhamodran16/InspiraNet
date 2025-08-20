const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');

const Follow = require('../models/Follow');
const FollowRequest = require('../models/FollowRequest');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const UserSettings = require('../models/UserSettings');
const { authenticateToken } = require('../middleware/auth');

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
        { batch: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) query.type = type;
    if (department) query.department = department;
    if (batch) query.batch = batch;

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
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    console.log('📝 Profile update request:', { userId, updateData });

    // Validate required fields
    if (!updateData.name || !updateData.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: updateData.email, 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already taken' });
    }

    // Prepare update object with all profile fields
    const profileUpdate = {
      name: updateData.name,
      email: updateData.email,
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

    // Handle type-specific information
    if (updateData.studentInfo) {
      profileUpdate.studentInfo = updateData.studentInfo;
    }
    if (updateData.alumniInfo) {
      profileUpdate.alumniInfo = updateData.alumniInfo;
    }
    if (updateData.facultyInfo) {
      profileUpdate.facultyInfo = updateData.facultyInfo;
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

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
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

// Get user by ID
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId)
      .select('-password')
      .populate('followers', 'name avatar type department batch')
      .populate('following', 'name avatar type department batch')
      .populate('followRequests.from', 'name avatar type department batch')
      .populate('pendingFollowRequests', 'name avatar type department batch');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add computed fields
    const userWithStats = user.toObject();
    userWithStats.followersCount = user.followers?.length || 0;
    userWithStats.followingCount = user.following?.length || 0;
    userWithStats.postsCount = 0; // Will be populated separately if needed

    res.json(userWithStats);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get user profile by ID (public)
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

// Get current user's full profile (private)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('followers', 'name avatar type')
      .populate('following', 'name avatar type');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
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

    // Get connection count (followers + following)
    let connectionCount = 0;
    try {
      const currentUser = await User.findById(userId).select('followers following');
      connectionCount = (currentUser?.followers?.length || 0) + (currentUser?.following?.length || 0);
    } catch (error) {
      console.error('Error counting connections:', error);
    }

    res.json({
      posts: postCount,
      events: eventCount,
      achievements: achievementCount,
      connections: connectionCount
    });
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
      .populate('author', 'name avatar type department batch')
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
        { batch: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { designation: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (type) query.type = type;
    if (department) query.department = department;
    if (batch) query.batch = batch;

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

// Get user connections (mutual followers)
router.get('/:userId/connections', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const user = await User.findById(userId)
      .populate('followers', 'name avatar type department batch company designation location')
      .populate('following', 'name avatar type department batch company designation location')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find mutual connections (users who follow each other)
    const followers = user.followers || [];
    const following = user.following || [];
    
    // Find mutual connections
    const mutualConnections = followers.filter(follower => 
      following.some(followingUser => followingUser._id.toString() === follower._id.toString())
    );

    // Get connection details with relationship info
    const connections = mutualConnections.map(connection => ({
      ...connection,
      connectionType: 'mutual',
      connectedSince: new Date() // You could store this in a separate collection
    }));

    res.json({ 
      connections,
      totalConnections: connections.length,
      followersCount: followers.length,
      followingCount: following.length
    });
  } catch (error) {
    console.error('Error fetching user connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
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

    // Update password
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    await user.save();

    // Update user settings to track password change
    await UserSettings.findOneAndUpdate(
      { userId },
      { 
        'security.lastPasswordChange': new Date(),
        'security.requirePasswordChange': false
      },
      { upsert: true }
    );

    res.json({ message: 'Password changed successfully' });
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

    // Delete user data (posts, comments, likes, etc.)
    await Promise.all([
      // Delete user's posts
      Post.deleteMany({ author: userId }),
      // Comments are embedded in posts, so they'll be deleted with posts
      // Delete user's likes
      Post.updateMany(
        { likes: userId },
        { $pull: { likes: userId } }
      ),
      // Delete follow relationships
      Follow.deleteMany({
        $or: [{ follower: userId }, { following: userId }]
      }),
      // Delete follow requests
      FollowRequest.deleteMany({
        $or: [{ requesterId: userId }, { targetId: userId }]
      }),
      // Delete conversations and messages
      Conversation.deleteMany({
        participants: userId
      }),
      Message.deleteMany({
        $or: [{ senderId: userId }, { recipientId: userId }]
      }),
      // Delete notifications
      Notification.deleteMany({
        $or: [{ recipientId: userId }, { senderId: userId }]
      }),
      // Delete user settings
      UserSettings.findOneAndDelete({ userId }),
      // Delete user profile
      User.findByIdAndDelete(userId)
    ]);

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