const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Follow = require('../models/Follow');
const FollowRequest = require('../models/FollowRequest');
const FollowService = require('../services/followService');

// Get all users (for network page)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const { page = 1, limit = 20, search, batch, department, type } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { _id: { $ne: currentUser._id } };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'email.college': { $regex: search, $options: 'i' } },
        { 'email.personal': { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { 'studentInfo.department': { $regex: search, $options: 'i' } },
        { 'facultyInfo.department': { $regex: search, $options: 'i' } },
        { batch: { $regex: search, $options: 'i' } },
        { 'studentInfo.batch': { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (batch && batch !== 'all') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { batch: batch },
          { 'studentInfo.batch': batch }
        ]
      });
    }
    if (department && department !== 'all') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { department: { $regex: new RegExp(`^${department}$`, 'i') } },
          { 'studentInfo.department': { $regex: new RegExp(`^${department}$`, 'i') } },
          { 'facultyInfo.department': { $regex: new RegExp(`^${department}$`, 'i') } }
        ]
      });
    }
    if (type && type !== 'all') query.type = type;
    
    // Get all users except current user with pagination
    const users = await User.find(query)
      .select('name email type batch department avatar bio currentCompany designation location skills interests followers following accountType messagePolicy studentInfo facultyInfo alumniInfo')
      .populate('followers', 'name avatar')
      .populate('following', 'name avatar')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ name: 1 });

    const total = await User.countDocuments(query);

    // Add follow status and mutual connection info for each user
    const usersWithFollowStatus = await Promise.all(users.map(async user => {
      try {
        // Ensure user object exists and has required properties
        if (!user || !user._id) {
          console.warn('Invalid user object found:', user);
          return null;
        }

        const userObj = user.toObject ? user.toObject() : user;
        
        // Safe access to nested properties with fallbacks
        const followers = userObj.followers || [];
        const following = userObj.following || [];
        
        // Check if current user is following this user
        const isFollowing = followers.some(follower => 
          follower && follower._id && follower._id.toString() === currentUser._id.toString()
        );
        
        // Check if this user is following current user
        const isFollowedBy = following.some(followingId => 
          followingId && followingId.toString() === currentUser._id.toString()
        );
        
        // Double-check with Follow collection for accuracy
        const followRelationship = await Follow.findOne({
          followerId: currentUser._id,
          followeeId: userObj._id
        });
        
        const actualIsFollowing = !!followRelationship;
        
        console.log('🔍 Follow status check:', {
          userId: userObj._id,
          userName: userObj.name,
          currentUserId: currentUser._id,
          currentUserName: currentUser.name,
          followersCount: followers.length,
          followingCount: following.length,
          isFollowing,
          actualIsFollowing,
          isFollowedBy,
          followers: followers.map(f => f._id?.toString()),
          following: following.map(f => f.toString()),
          followRelationshipExists: !!followRelationship
        });
        
        // Use the more accurate follow status
        const finalIsFollowing = actualIsFollowing;
        
        // Check for pending follow request
        let followRequestStatus = null;
        if (!finalIsFollowing && !isFollowedBy) {
          const pendingRequest = await FollowRequest.findOne({
            requesterId: currentUser._id,
            targetId: userObj._id,
            status: 'pending'
          });
          if (pendingRequest) {
            followRequestStatus = 'pending';
          }
        }
        
        const isMutual = finalIsFollowing && isFollowedBy;

        // Check if messaging is allowed
        let canMessage = false;
        if (isMutual) {
          canMessage = true; // Mutual followers can always message
        } else if (userObj.messagePolicy === 'everyone') {
          canMessage = true;
        } else if (userObj.messagePolicy === 'followers' && finalIsFollowing) {
          canMessage = true;
        }

        return {
          ...userObj,
          isFollowing: finalIsFollowing,
          isFollowedBy,
          isMutual,
          canMessage,
          followRequestStatus,
          followersCount: followers.length,
          followingCount: following.length
        };
      } catch (userError) {
        console.error('Error processing user:', userError, 'User:', user);
        // Return a basic user object if processing fails
        return {
          _id: user._id || 'unknown',
          name: user.name || 'Unknown User',
          email: user.email || {},
          type: user.type || 'unknown',
          batch: user.batch || 'N/A',
          department: user.department || 'N/A',
          avatar: user.avatar,
          bio: user.bio,
          currentCompany: user.currentCompany,
          designation: user.designation,
          location: user.location,
          skills: user.skills || [],
          interests: user.interests || [],
          accountType: user.accountType,
          messagePolicy: user.messagePolicy,
          isFollowing: false,
          isFollowedBy: false,
          isMutual: false,
          canMessage: false,
          followersCount: 0,
          followingCount: 0
        };
      }
    }));

    // Filter out null users
    const validUsers = usersWithFollowStatus.filter(user => user !== null);

    res.json({ 
      users: validUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page < Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Send follow request or follow directly
router.post('/request/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;

    if (currentUser._id.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Use the enhanced FollowService
    const result = await FollowService.sendFollowRequest(currentUser._id, targetUserId);

    if (result.success) {
      // Emit real-time updates
      const io = req.app.get('io');
      if (io) {
        if (result.autoAccepted) {
          // Emit to both users about mutual follow
          io.to(`user_${targetUserId}`).emit('follow_request_accepted', {
            followerId: currentUser._id,
            followerName: currentUser.name,
            message: `${currentUser.name} is now following you! ✨ You can now message each other.`
          });

          io.to(`user_${currentUser._id}`).emit('follow_request_accepted', {
            followeeId: targetUserId,
            message: `You are now following ${result.targetName}! ✨ You can now message each other.`
          });

          // Emit to all users for real-time network updates
          io.emit('follow_status_updated', {
            followerId: currentUser._id,
            followeeId: targetUserId,
            action: 'follow',
            status: 'mutual',
            timestamp: new Date()
          });
        } else {
          // Emit to target user about follow request
          io.to(`user_${targetUserId}`).emit('new_follow_request', {
            requesterId: currentUser._id,
            requesterName: currentUser.name,
            message: `${currentUser.name} sent you a follow request`,
            timestamp: new Date()
          });

          // Emit to current user about pending request
          io.to(`user_${currentUser._id}`).emit('follow_request_sent', {
            targetUserId: targetUserId,
            message: `Follow request sent to ${result.targetName}`,
            timestamp: new Date()
          });

          // Emit to all users for real-time network updates
          io.emit('follow_status_updated', {
            requesterId: currentUser._id,
            targetId: targetUserId,
            action: 'request_sent',
            status: 'pending',
            timestamp: new Date()
          });
        }
      }

      if (result.autoAccepted) {
        res.json({ 
          message: result.message,
          autoAccepted: true,
          status: 'connected'
        });
      } else {
        res.json({ 
          message: result.message,
          autoAccepted: false,
          status: 'pending'
        });
      }
    } else {
      // Handle specific error cases
      let statusCode = 400;
      let errorMessage = result.message || 'Failed to send follow request';
      
      switch (result.reason) {
        case 'already_following':
          statusCode = 409; // Conflict
          errorMessage = 'You are already following this user';
          break;
        case 'request_already_sent':
          statusCode = 409; // Conflict
          errorMessage = 'Follow request already sent and pending';
          break;
        case 'daily_limit_exceeded':
          statusCode = 429; // Too Many Requests
          errorMessage = 'Daily follow request limit exceeded (50 requests per day)';
          break;
        case 'user_not_found':
          statusCode = 404; // Not Found
          errorMessage = 'User not found';
          break;
        case 'server_error':
          statusCode = 500; // Internal Server Error
          errorMessage = 'Server error occurred while sending follow request';
          break;
        default:
          statusCode = 400; // Bad Request
          errorMessage = result.message || 'Failed to send follow request';
      }
      
      res.status(statusCode).json({ error: errorMessage });
    }
  } catch (error) {
    console.error('Error sending follow request:', error);
    res.status(500).json({ error: 'Failed to send follow request' });
  }
});

// Accept follow request (Step 1 of two-step mutual follow)
router.post('/accept/:requestId', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const requestId = req.params.requestId || req.params.userId; // backward compat if client still uses :userId

    // Find the follow request to get requester info for notifications
    const followRequest = await FollowRequest.findById(requestId);
    if (!followRequest) {
      return res.status(404).json({ error: 'Follow request not found' });
    }
    const requesterId = followRequest.requesterId?.toString();

    const result = await FollowService.acceptFollowRequest(requestId, currentUser._id);

    if (result.success) {
      // Emit real-time updates
      const io = req.app.get('io');
      if (io) {
        if (result.reverseRequestSent) {
          // Step 1: One-way follow established, reverse request sent
          io.to(`user_${requesterId}`).emit('follow_request_accepted_with_reverse', {
            followeeId: currentUser._id,
            followeeName: currentUser.name,
            message: `${currentUser.name} accepted your follow request and sent you a follow request back! Accept it to become mutual connections.`,
            requestId: requestId,
            hasReverseRequest: true,
            timestamp: new Date()
          });

          io.to(`user_${currentUser._id}`).emit('follow_request_accepted_reverse_sent', {
            followerId: requesterId,
            message: `You accepted ${result.requesterName}'s follow request and sent them a follow request back. Wait for their acceptance to become mutual connections.`,
            requestId: requestId,
            reverseRequestSent: true,
            timestamp: new Date()
          });
        } else {
          // Fallback: One-way follow only
          io.to(`user_${requesterId}`).emit('follow_request_accepted', {
            followeeId: currentUser._id,
            followeeName: currentUser.name,
            message: `${currentUser.name} accepted your follow request`,
            requestId: requestId,
            timestamp: new Date()
          });

          io.to(`user_${currentUser._id}`).emit('follow_request_accepted', {
            followerId: requesterId,
            message: `You accepted ${result.requesterName}'s follow request`,
            requestId: requestId,
            timestamp: new Date()
          });
        }

        // Emit to all users for real-time network updates
        io.emit('follow_status_updated', {
          followerId: requesterId,
          followeeId: currentUser._id,
          action: 'accept',
          status: result.reverseRequestSent ? 'one_way_with_reverse_request' : 'one_way',
          timestamp: new Date()
        });
      }

      res.json({ 
        success: true,
        message: result.message,
        requesterName: result.requesterName,
        targetName: result.targetName,
        reverseRequestSent: result.reverseRequestSent,
        nextStep: result.nextStep
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: result.reason || 'Failed to accept follow request' 
      });
    }
  } catch (error) {
    console.error('Error accepting follow request:', error);
    res.status(500).json({ error: 'Failed to accept follow request' });
  }
});

// Accept reverse follow request (Step 2 of two-step mutual follow)
router.post('/accept-reverse/:requestId', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const requestId = req.params.requestId;

    // Find the follow request to get requester info for notifications
    const followRequest = await FollowRequest.findById(requestId);
    if (!followRequest) {
      return res.status(404).json({ error: 'Follow request not found' });
    }
    const requesterId = followRequest.requesterId?.toString();

    const result = await FollowService.acceptReverseFollowRequest(requestId, currentUser._id);

    if (result.success) {
      // Emit real-time updates for mutual connection
      const io = req.app.get('io');
      if (io) {
        // Notify both users about mutual connection
        io.to(`user_${requesterId}`).emit('mutual_connection_established', {
          mutualUserId: currentUser._id,
          mutualUserName: currentUser.name,
          message: `You and ${currentUser.name} are now mutual connections! 🎉 You can message each other freely.`,
          requestId: requestId,
          connectionType: 'mutual',
          timestamp: new Date()
        });

        io.to(`user_${currentUser._id}`).emit('mutual_connection_established', {
          mutualUserId: requesterId,
          mutualUserName: result.targetName,
          message: `You and ${result.targetName} are now mutual connections! 🎉 You can message each other freely.`,
          requestId: requestId,
          connectionType: 'mutual',
          timestamp: new Date()
        });

        // Emit to all users for real-time network updates
        io.emit('follow_status_updated', {
          followerId: requesterId,
          followeeId: currentUser._id,
          action: 'mutual_connection',
          status: 'mutual',
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        message: result.message,
        requesterName: result.requesterName,
        targetName: result.targetName,
        connectionType: result.connectionType,
        canMessage: result.canMessage
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.reason || 'Failed to accept reverse follow request'
      });
    }
  } catch (error) {
    console.error('Error accepting reverse follow request:', error);
    res.status(500).json({ error: 'Failed to accept reverse follow request' });
  }
});

// Cancel follow request
router.delete('/request/:requestId', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const requestId = req.params.requestId;

    const result = await FollowService.cancelFollowRequest(requestId, currentUser._id);

    if (result.success) {
      // Emit real-time updates
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${result.targetId}`).emit('follow_request_cancelled', {
          requesterId: currentUser._id,
          requesterName: currentUser.name,
          message: `${currentUser.name} cancelled their follow request`
        });

        io.to(`user_${currentUser._id}`).emit('follow_request_cancelled', {
          targetId: result.targetId,
          message: `You cancelled your follow request to ${result.targetName}`
        });
      }

      res.json({ 
        message: result.message,
        status: 'cancelled'
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error cancelling follow request:', error);
    res.status(500).json({ error: 'Failed to cancel follow request' });
  }
});

// Reject follow request
router.post('/reject/:requestId', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const requestId = req.params.requestId || req.params.userId; // backward compat if client still uses :userId

    // Find the follow request to get requester info for notifications
    const followRequest = await FollowRequest.findById(requestId);
    if (!followRequest) {
      return res.status(404).json({ error: 'Follow request not found' });
    }
    const requesterId = followRequest.requesterId?.toString();

    const result = await FollowService.rejectFollowRequest(requestId, currentUser._id);

    if (result.success) {
      // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
        io.to(`user_${requesterId}`).emit('follow_request_rejected', {
          followeeId: currentUser._id,
          followeeName: currentUser.name,
          message: `${currentUser.name} rejected your follow request`,
          requestId: requestId,
          timestamp: new Date()
        });

        io.to(`user_${currentUser._id}`).emit('follow_request_rejected', {
          requesterId: requesterId,
          message: `You rejected ${result.requesterName}'s follow request`,
          requestId: requestId,
          timestamp: new Date()
        });

        // Emit to all users for real-time network updates
        io.emit('follow_status_updated', {
          requesterId: requesterId,
          targetId: currentUser._id,
          action: 'rejected',
          status: 'rejected',
          timestamp: new Date()
        });
      }

      res.json({ 
        message: result.message,
        status: 'rejected'
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error rejecting follow request:', error);
    res.status(500).json({ error: 'Failed to reject follow request' });
  }
});

// Unfollow user
router.delete('/unfollow/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;

    if (currentUser._id.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot unfollow yourself' });
    }

    const result = await FollowService.unfollowUser(currentUser._id, targetUserId);

    if (result.success) {
      // Emit real-time updates
        const io = req.app.get('io');
        if (io) {
        io.to(`user_${targetUserId}`).emit('user_unfollowed', {
          followerId: currentUser._id,
          followerName: currentUser.name,
          message: `${currentUser.name} unfollowed you`
        });

        io.to(`user_${currentUser._id}`).emit('user_unfollowed', {
          followeeId: targetUserId,
          message: `You unfollowed ${result.targetName}`
        });

        // Emit to all users for real-time network updates
        io.emit('follow_status_updated', {
          followerId: currentUser._id,
          followeeId: targetUserId,
          action: 'unfollow',
          status: 'unfollowed',
        timestamp: new Date()
      });
    }

      res.json({ 
        message: result.message,
        status: 'unfollowed'
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get pending follow requests
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const requests = await FollowService.getPendingFollowRequests(
      currentUser._id, 
      parseInt(limit), 
      skip
    );

    const total = await FollowRequest.countDocuments({
      targetId: currentUser._id,
      status: 'pending'
    });

    res.json({
      requests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page < Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching pending follow requests:', error);
    res.status(500).json({ error: 'Failed to fetch follow requests' });
  }
});

// Get sent follow requests
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const requests = await FollowService.getSentFollowRequests(
      currentUser._id, 
      parseInt(limit), 
      skip
    );

    const total = await FollowRequest.countDocuments({
      requesterId: currentUser._id,
      status: 'pending'
    });

    res.json({
      requests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page < Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sent follow requests:', error);
    res.status(500).json({ error: 'Failed to fetch sent follow requests' });
  }
});

// Get accepted connections
router.get('/accepted', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const connections = await FollowService.getAcceptedConnections(
      currentUser._id, 
      parseInt(limit), 
      skip
    );

    // Count total mutual connections
    const following = await Follow.find({ followerId: currentUser._id });
    const followers = await Follow.find({ followeeId: currentUser._id });
    
    const followingIds = following.map(f => f.followeeId.toString());
    const followerIds = followers.map(f => f.followerId.toString());
    const mutualCount = followingIds.filter(id => followerIds.includes(id)).length;

    res.json({
      requests: connections,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(mutualCount / limit),
        total: mutualCount,
        hasMore: page < Math.ceil(mutualCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching accepted connections:', error);
    res.status(500).json({ error: 'Failed to fetch accepted connections' });
  }
});

// Get accepted connections for messaging (alias)
router.get('/connections/accepted', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const connections = await FollowService.getAcceptedConnections(
      currentUser._id, 
      50, 
      0
    );

    res.json({
      connections: connections,
      count: connections.length
    });
  } catch (error) {
    console.error('Error fetching accepted connections for messaging:', error);
    res.status(500).json({ error: 'Failed to fetch accepted connections' });
  }
});

// Get user's followers
router.get('/:userId/followers', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const followers = await FollowService.getFollowers(userId, parseInt(limit), skip);
    const total = await FollowService.getFollowersCount(userId);

    res.json({
      followers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page < Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get user's following
router.get('/:userId/following', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const following = await FollowService.getFollowing(userId, parseInt(limit), skip);
    const total = await FollowService.getFollowingCount(userId);

    res.json({
      following,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page < Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Get user's followers and following
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId)
      .populate('followers', 'name email avatar type batch department')
      .populate('following', 'name email avatar type batch department');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      followers: user.followers,
      following: user.following,
      followersCount: user.followers.length,
      followingCount: user.following.length
    });
  } catch (error) {
    console.error('Error fetching user connections:', error);
    res.status(500).json({ error: 'Failed to fetch user connections' });
  }
});

// Get follow status between current user and target user
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;

    if (currentUser._id.toString() === targetUserId) {
      return res.json({ status: 'self' });
    }

    // Check if current user is following target user
    const isFollowing = await Follow.findOne({
      followerId: currentUser._id,
      followeeId: targetUserId
    });

    // Check if target user is following current user
    const isFollowedBy = await Follow.findOne({
      followerId: targetUserId,
      followeeId: currentUser._id
    });

    // Check for pending follow request
    const pendingRequest = await FollowRequest.findOne({
      requesterId: currentUser._id,
      targetId: targetUserId,
      status: 'pending'
    });

    let status = 'none';
    
    if (isFollowing && isFollowedBy) {
      status = 'mutual';
    } else if (isFollowing) {
      status = 'following';
    } else if (isFollowedBy) {
      status = 'followers';
    } else if (pendingRequest) {
      status = 'requested';
    } else {
      status = 'not-following';
    }

    res.json({ status });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

module.exports = router;
