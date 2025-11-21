const Follow = require('../models/Follow');
const FollowRequest = require('../models/FollowRequest');
const User = require('../models/User');
const NotificationService = require('./notificationService');
const Connection = require('../models/Connection');

class FollowService {
  // Send reverse follow request (specialized for mutual connections)
  static async sendReverseFollowRequest(requesterId, targetId) {
    try {
      console.log('🔍 sendReverseFollowRequest called:', { requesterId, targetId });
      
      // Check if already following (this should be false for reverse requests)
      const existingFollow = await Follow.findOne({
        followerId: requesterId,
        followeeId: targetId
      });

      if (existingFollow) {
        console.log('⚠️ Reverse follow already exists, skipping');
        return { 
          success: false, 
          reason: 'already_following',
          message: 'Already following this user'
        };
      }

      // Check if reverse request already exists
      const existingRequest = await FollowRequest.findOne({
        requesterId,
        targetId,
        status: 'pending'
      });

      if (existingRequest) {
        console.log('⚠️ Reverse request already exists, skipping');
        return { 
          success: false, 
          reason: 'request_already_sent',
          message: 'Reverse follow request already sent and pending'
        };
      }

      // Get users for notifications
      const targetUser = await User.findById(targetId);
      const requesterUser = await User.findById(requesterId);
      
      if (!targetUser || !requesterUser) {
        console.log('❌ Users not found for reverse request');
        return { 
          success: false, 
          reason: 'user_not_found',
          message: 'User not found'
        };
      }

      console.log('✅ Creating reverse follow request...');
      
      // Create reverse follow request
      const followRequest = new FollowRequest({
        requesterId,
        targetId,
        status: 'pending'
      });

      await followRequest.save();
      console.log('✅ Reverse follow request saved:', followRequest._id);

      // Create notification for target user (original requester)
      try {
        await NotificationService.createNotification({
          recipientId: targetId,
          senderId: requesterId,
          type: 'follow_request',
          title: 'New Follow Request',
          message: `${requesterUser.name} sent you a follow request`,
          relatedUserId: requesterId,
          category: 'connection',
          priority: 'medium',
          metadata: {
            requesterName: requesterUser.name,
            requesterAvatar: requesterUser.avatar,
            requesterType: requesterUser.type,
            isReverseRequest: true
          }
        });
        console.log('✅ Reverse request notification created');
      } catch (notificationError) {
        console.error('❌ Error creating reverse request notification:', notificationError);
      }

      return { 
        success: true, 
        message: 'Reverse follow request sent successfully',
        targetName: targetUser.name,
        requesterName: requesterUser.name
      };
    } catch (error) {
      console.error('❌ Error sending reverse follow request:', error);
      return { 
        success: false, 
        reason: 'server_error',
        message: 'Server error occurred while sending reverse follow request'
      };
    }
  }

  // Send follow request
  static async sendFollowRequest(requesterId, targetId) {
    try {
      // Check if already following
      const existingFollow = await Follow.findOne({
        followerId: requesterId,
        followeeId: targetId
      });

      if (existingFollow) {
        return { 
          success: false, 
          reason: 'already_following',
          message: 'You are already following this user'
        };
      }

      // Check if request already exists
      const existingRequest = await FollowRequest.findOne({
        requesterId,
        targetId,
        status: 'pending'
      });

      if (existingRequest) {
        return { 
          success: false, 
          reason: 'request_already_sent',
          message: 'Follow request already sent and pending'
        };
      }

      // Check daily limit (50 requests per day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyRequests = await FollowRequest.countDocuments({
        requesterId,
        createdAt: { $gte: today }
      });

      if (dailyRequests >= 50) {
        return { 
          success: false, 
          reason: 'daily_limit_exceeded',
          message: 'Daily follow request limit exceeded (50 requests per day)'
        };
      }

      // Get target user to check profile settings
      const targetUser = await User.findById(targetId);
      if (!targetUser) {
        return { 
          success: false, 
          reason: 'user_not_found',
          message: 'User not found'
        };
      }

      // Get requester user for notification
      const requesterUser = await User.findById(requesterId);
      if (!requesterUser) {
        return { 
          success: false, 
          reason: 'requester_not_found',
          message: 'Requester user not found'
        };
      }

      // Check if target user allows public follows
      const isPublicProfile = targetUser.profileVisibility === 'public' || 
                             targetUser.type === 'faculty' ||
                             targetUser.type === 'teacher';

      // Always create pending request for better user experience
      // Create pending request
      const followRequest = new FollowRequest({
        requesterId,
        targetId,
        status: 'pending'
      });

      await followRequest.save();

      // Create notification for target user
      try {
        await NotificationService.createNotification({
          recipientId: targetId,
          senderId: requesterId,
          type: 'follow_request',
          title: 'New Follow Request',
          message: `${requesterUser.name} sent you a follow request`,
          relatedUserId: requesterId,
          category: 'connection',
          priority: 'medium',
          metadata: {
            requesterName: requesterUser.name,
            requesterAvatar: requesterUser.avatar,
            requesterType: requesterUser.type
          }
        });
      } catch (notificationError) {
        console.error('Error creating follow request notification:', notificationError);
        // Don't fail the follow request if notification fails
      }

      return { 
        success: true, 
        autoAccepted: false, 
        message: 'Follow request sent successfully',
        targetName: targetUser.name
      };
    } catch (error) {
      console.error('Error sending follow request:', error);
      return { 
        success: false, 
        reason: 'server_error',
        message: 'Server error occurred while sending follow request'
      };
    }
  }

  // Accept follow request (Step 1 of two-step mutual follow)
  static async acceptFollowRequest(requestId, targetUserId) {
    try {
      const followRequest = await FollowRequest.findById(requestId);
      if (!followRequest) {
        return { success: false, reason: 'request_not_found' };
      }

      if (followRequest.targetId.toString() !== targetUserId.toString()) {
        return { success: false, reason: 'unauthorized' };
      }

      if (followRequest.status !== 'pending') {
        return { success: false, reason: 'request_already_processed' };
      }

      // Update request status
      followRequest.status = 'accepted';
      followRequest.decidedAt = new Date();
      await followRequest.save();

      console.log('🔍 Step 1: Creating one-way follow relationship...');
      
      // Create one-way follow (requester -> target)
      const existingFollow = await Follow.findOne({
        followerId: followRequest.requesterId,
        followeeId: followRequest.targetId
      });
      
      if (!existingFollow) {
        await Follow.create({ 
          followerId: followRequest.requesterId, 
          followeeId: followRequest.targetId 
        });
        console.log('✅ Created one-way follow (requester -> target)');
      }

      // Update User arrays for one-way follow
      const requester = await User.findById(followRequest.requesterId);
      const target = await User.findById(followRequest.targetId);

      if (requester && target) {
        // Add target to requester's following list
        if (!requester.following.some(id => id.toString() === followRequest.targetId.toString())) {
          requester.following.push(followRequest.targetId);
        }
        
        // Add requester to target's followers list
        if (!target.followers.some(id => id.toString() === followRequest.requesterId.toString())) {
          target.followers.push(followRequest.requesterId);
        }

        await Promise.all([requester.save(), target.save()]);
        console.log('✅ Updated User arrays for one-way follow');
      }

      console.log('🔍 Step 2: Sending reverse follow request for mutual connection...');
      console.log('🔍 Reverse request details:', {
        requesterId: followRequest.targetId,
        targetId: followRequest.requesterId,
        originalRequesterId: followRequest.requesterId,
        originalTargetId: followRequest.targetId
      });
      
      // Send reverse follow request (target -> requester) for mutual connection
      const reverseRequestResult = await this.sendReverseFollowRequest(
        followRequest.targetId, 
        followRequest.requesterId
      );

      if (reverseRequestResult.success) {
        console.log('✅ Reverse follow request sent successfully');
        
        // Create notifications
        // Notify requester that their request was accepted and they have a new follow request
        try {
          await NotificationService.createNotification({
            recipientId: followRequest.requesterId,
            senderId: followRequest.targetId,
            type: 'follow_accepted_with_request',
            title: 'Follow Request Accepted + New Request',
            message: `${target.name} accepted your follow request and sent you a follow request back! Accept it to become mutual connections.`,
            relatedUserId: followRequest.targetId,
            category: 'connection',
            priority: 'high',
            metadata: {
              targetName: target.name,
              targetAvatar: target.avatar,
              targetType: target.type,
              hasReverseRequest: true
            }
          });
        } catch (notificationError) {
          console.error('Error creating follow accepted notification for requester:', notificationError);
        }

        // Notify target that they accepted the request and sent a reverse request
        try {
          await NotificationService.createNotification({
            recipientId: followRequest.targetId,
            senderId: followRequest.requesterId,
            type: 'follow_accepted_reverse_sent',
            title: 'Follow Request Accepted',
            message: `You accepted ${requester.name}'s follow request and sent them a follow request back. Wait for their acceptance to become mutual connections.`,
            relatedUserId: followRequest.requesterId,
            category: 'connection',
            priority: 'medium',
            metadata: {
              requesterName: requester.name,
              requesterAvatar: requester.avatar,
              requesterType: requester.type,
              reverseRequestSent: true
            }
          });
        } catch (notificationError) {
          console.error('Error creating follow accepted notification for target:', notificationError);
        }

        return { 
          success: true, 
          message: 'Follow request accepted. Reverse follow request sent for mutual connection.',
          requesterName: requester?.name,
          targetName: target?.name,
          reverseRequestSent: true,
          nextStep: 'Wait for requester to accept the reverse follow request to become mutual connections'
        };
      } else {
        console.log('❌ Failed to send reverse follow request:', reverseRequestResult);
        
        // Still notify about acceptance even if reverse request failed
        try {
          await NotificationService.createNotification({
            recipientId: followRequest.requesterId,
            senderId: followRequest.targetId,
            type: 'follow_accepted',
            title: 'Follow Request Accepted',
            message: `${target.name} accepted your follow request`,
            relatedUserId: followRequest.targetId,
            category: 'connection',
            priority: 'medium',
            metadata: {
              targetName: target.name,
              targetAvatar: target.avatar,
              targetType: target.type
            }
          });
        } catch (notificationError) {
          console.error('Error creating follow accepted notification:', notificationError);
        }

        return { 
          success: true, 
          message: 'Follow request accepted (one-way follow established)',
          requesterName: requester?.name,
          targetName: target?.name,
          reverseRequestSent: false,
          warning: 'Could not send reverse follow request for mutual connection'
        };
      }
    } catch (error) {
      console.error('Error accepting follow request:', error);
      return { success: false, reason: 'server_error' };
    }
  }

  // Accept reverse follow request (Step 2 of two-step mutual follow)
  static async acceptReverseFollowRequest(requestId, requesterUserId) {
    try {
      const followRequest = await FollowRequest.findById(requestId);
      if (!followRequest) {
        return { success: false, reason: 'request_not_found' };
      }

      if (followRequest.targetId.toString() !== requesterUserId.toString()) {
        return { success: false, reason: 'unauthorized' };
      }

      if (followRequest.status !== 'pending') {
        return { success: false, reason: 'request_already_processed' };
      }

      // Update request status
      followRequest.status = 'accepted';
      followRequest.decidedAt = new Date();
      await followRequest.save();

      console.log('🔍 Step 2: Creating mutual follow relationship...');
      
      // Create mutual follow (target -> requester)
      const existingFollow = await Follow.findOne({
        followerId: followRequest.requesterId,
        followeeId: followRequest.targetId
      });
      
      if (!existingFollow) {
        await Follow.create({ 
          followerId: followRequest.requesterId, 
          followeeId: followRequest.targetId 
        });
        console.log('✅ Created mutual follow (target -> requester)');
      }

      // Update User arrays for mutual follow
      const requester = await User.findById(followRequest.targetId); // Note: requesterUserId is the original requester
      const target = await User.findById(followRequest.requesterId); // Note: requesterId in the request is the target

      if (requester && target) {
        // Add target to requester's following list
        if (!requester.following.some(id => id.toString() === followRequest.requesterId.toString())) {
          requester.following.push(followRequest.requesterId);
        }
        
        // Add requester to target's followers list
        if (!target.followers.some(id => id.toString() === followRequest.targetId.toString())) {
          target.followers.push(followRequest.targetId);
        }

        await Promise.all([requester.save(), target.save()]);
        console.log('✅ Updated User arrays for mutual follow');
      }

      // Create mutual connection
      try {
        await this.createConnection(followRequest.targetId, followRequest.requesterId, followRequest.targetId);
        console.log('✅ Mutual connection created successfully');
      } catch (error) {
        console.error('❌ Error creating mutual connection:', error);
      }

      // Create notifications for mutual connection
      if (requester && target) {
        // Notify requester that mutual connection is established
        try {
          await NotificationService.createNotification({
            recipientId: followRequest.targetId,
            senderId: followRequest.requesterId,
            type: 'mutual_connection_established',
            title: 'Mutual Connection Established! 🎉',
            message: `You and ${target.name} are now mutual connections! You can message each other freely.`,
            relatedUserId: followRequest.requesterId,
            category: 'connection',
            priority: 'high',
            metadata: {
              targetName: target.name,
              targetAvatar: target.avatar,
              targetType: target.type,
              connectionType: 'mutual'
            }
          });
        } catch (notificationError) {
          console.error('Error creating mutual connection notification for requester:', notificationError);
        }

        // Notify target that mutual connection is established
        try {
          await NotificationService.createNotification({
            recipientId: followRequest.requesterId,
            senderId: followRequest.targetId,
            type: 'mutual_connection_established',
            title: 'Mutual Connection Established! 🎉',
            message: `You and ${requester.name} are now mutual connections! You can message each other freely.`,
            relatedUserId: followRequest.targetId,
            category: 'connection',
            priority: 'high',
            metadata: {
              requesterName: requester.name,
              requesterAvatar: requester.avatar,
              requesterType: requester.type,
              connectionType: 'mutual'
            }
          });
        } catch (notificationError) {
          console.error('Error creating mutual connection notification for target:', notificationError);
        }
      }

      return { 
        success: true, 
        message: 'Mutual connection established successfully! 🎉',
        requesterName: requester?.name,
        targetName: target?.name,
        connectionType: 'mutual',
        canMessage: true
      };
    } catch (error) {
      console.error('Error accepting reverse follow request:', error);
      return { success: false, reason: 'server_error' };
    }
  }

  // Reject follow request
  static async rejectFollowRequest(requestId, targetUserId) {
    try {
      const followRequest = await FollowRequest.findById(requestId);
      if (!followRequest) {
        return { success: false, reason: 'request_not_found' };
      }

      if (followRequest.targetId.toString() !== targetUserId.toString()) {
        return { success: false, reason: 'unauthorized' };
      }

      if (followRequest.status !== 'pending') {
        return { success: false, reason: 'request_already_processed' };
      }

      // Update request status
      followRequest.status = 'declined';
      followRequest.decidedAt = new Date();
      await followRequest.save();

      // Create notification for requester that their request was rejected
      const target = await User.findById(followRequest.targetId);
      if (target) {
        try {
          await NotificationService.createNotification({
            recipientId: followRequest.requesterId,
            senderId: followRequest.targetId,
            type: 'follow_rejected',
            title: 'Follow Request Declined',
            message: `${target.name} declined your follow request`,
            relatedUserId: followRequest.targetId,
            category: 'connection',
            priority: 'medium',
            metadata: {
              targetName: target.name,
              targetAvatar: target.avatar,
              targetType: target.type
            }
          });
        } catch (notificationError) {
          console.error('Error creating follow rejected notification:', notificationError);
        }
      }

      return { 
        success: true, 
        message: 'Follow request rejected successfully',
        targetName: target?.name
      };
    } catch (error) {
      console.error('Error rejecting follow request:', error);
      return { success: false, reason: 'server_error' };
    }
  }

  // Create connection between users
  static async createConnection(user1Id, user2Id, initiatedBy) {
    try {
      console.log(`🔍 createConnection called with: user1Id=${user1Id}, user2Id=${user2Id}, initiatedBy=${initiatedBy}`);
      
      // Check if connection already exists
      const existingConnection = await Connection.findOne({
        $or: [
          { user1: user1Id, user2: user2Id },
          { user1: user2Id, user2: user1Id }
        ]
      });

      if (existingConnection) {
        console.log('✅ Connection already exists, returning');
        return existingConnection;
      }

      console.log('🔍 Creating new connection...');
      // Create new connection
      const connection = new Connection({
        user1: user1Id,
        user2: user2Id,
        initiatedBy,
        type: 'mutual'
      });

      await connection.save();
      console.log('✅ Connection saved to database');

      // Update User model's following and followers arrays
      const user1 = await User.findById(user1Id);
      const user2 = await User.findById(user2Id);

      console.log(`🔍 Found users: ${user1?.name}, ${user2?.name}`);

      if (user1 && user2) {
        console.log(`🔍 Before update - ${user1.name}: following=${user1.following.length}, followers=${user1.followers.length}`);
        console.log(`🔍 Before update - ${user2.name}: following=${user2.following.length}, followers=${user2.followers.length}`);

        // Add user2 to user1's following list
        if (!user1.following.some(id => id.toString() === user2Id.toString())) {
          user1.following.push(user2Id);
          console.log(`✅ Added ${user2.name} to ${user1.name}'s following`);
        }
        
        // Add user1 to user2's followers list
        if (!user2.followers.some(id => id.toString() === user1Id.toString())) {
          user2.followers.push(user1Id);
          console.log(`✅ Added ${user1.name} to ${user2.name}'s followers`);
        }

        // Add user1 to user2's following list (for mutual follow)
        if (!user2.following.some(id => id.toString() === user1Id.toString())) {
          user2.following.push(user1Id);
          console.log(`✅ Added ${user1.name} to ${user2.name}'s following`);
        }
        
        // Add user2 to user1's followers list (for mutual follow)
        if (!user1.followers.some(id => id.toString() === user2Id.toString())) {
          user1.followers.push(user2Id);
          console.log(`✅ Added ${user2.name} to ${user1.name}'s followers`);
        }

        // Ensure arrays are properly initialized
        if (!user1.following) user1.following = [];
        if (!user1.followers) user1.followers = [];
        if (!user2.following) user2.following = [];
        if (!user2.followers) user2.followers = [];

        // Force save and verify the arrays are updated
        await user1.save();
        await user2.save();
        
        // Verify the arrays were saved correctly
        const updatedUser1 = await User.findById(user1Id);
        const updatedUser2 = await User.findById(user2Id);
        
        console.log(`🔍 Verification - ${updatedUser1.name}: following=${updatedUser1.following.length}, followers=${updatedUser1.followers.length}`);
        console.log(`🔍 Verification - ${updatedUser2.name}: following=${updatedUser2.following.length}, followers=${updatedUser2.followers.length}`);
        
        // Double-check that the IDs are actually in the arrays
        const user1FollowingIds = updatedUser1.following.map(id => id.toString());
        const user1FollowersIds = updatedUser1.followers.map(id => id.toString());
        const user2FollowingIds = updatedUser2.following.map(id => id.toString());
        const user2FollowersIds = updatedUser2.followers.map(id => id.toString());
        
        console.log(`🔍 User1 following IDs:`, user1FollowingIds);
        console.log(`🔍 User1 followers IDs:`, user1FollowersIds);
        console.log(`🔍 User2 following IDs:`, user2FollowingIds);
        console.log(`🔍 User2 followers IDs:`, user2FollowersIds);
        
        // Verify mutual connection exists
        const isUser1FollowingUser2 = user1FollowingIds.includes(user2Id.toString());
        const isUser2FollowingUser1 = user2FollowingIds.includes(user1Id.toString());
        const isUser1InUser2Followers = user2FollowersIds.includes(user1Id.toString());
        const isUser2InUser1Followers = user1FollowersIds.includes(user2Id.toString());
        
        console.log(`🔍 Mutual verification:`, {
          user1FollowingUser2: isUser1FollowingUser2,
          user2FollowingUser1: isUser2FollowingUser1,
          user1InUser2Followers: isUser1InUser2Followers,
          user2InUser1Followers: isUser2InUser1Followers
        });
        
        console.log(`✅ After save - ${user1.name}: following=${user1.following.length}, followers=${user1.followers.length}`);
        console.log(`✅ After save - ${user2.name}: following=${user2.following.length}, followers=${user2.followers.length}`);
      } else {
        console.log('❌ Could not find one or both users');
      }

      return connection;
    } catch (error) {
      console.error('❌ Error creating connection:', error);
      throw error;
    }
  }

  // Check if users can message each other
  static async canMessage(senderId, recipientId) {
    try {
      // Check if there's an active connection
      const connection = await Connection.findOne({
        $or: [
          { user1: senderId, user2: recipientId, status: 'active' },
          { user1: recipientId, user2: senderId, status: 'active' }
        ]
      });

      if (connection) {
        return { ok: true, mode: 'direct' };
      }

      // Check if sender is following recipient
      const isFollowing = await Follow.exists({
        followerId: senderId,
        followeeId: recipientId
      });

      if (isFollowing) {
        return { ok: true, mode: 'following' };
      }

      // Check if recipient allows messages from everyone
      const recipient = await User.findById(recipientId);
      if (recipient && recipient.messagePolicy === 'everyone') {
        return { ok: true, mode: 'public' };
      }

      return { ok: false, reason: 'not_connected' };
    } catch (error) {
      console.error('Error checking if users can message:', error);
      throw error;
    }
  }

  // Get user's connections
  static async getUserConnections(userId, limit = 20, skip = 0) {
    try {
      const connections = await Connection.find({
        $or: [{ user1: userId }, { user2: userId }],
        status: 'active'
      })
        .populate('user1', 'name avatar type department')
        .populate('user2', 'name avatar type department')
        .sort({ establishedAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return connections.map(connection => {
        const otherUser = connection.user1._id.toString() === userId.toString() 
          ? connection.user2 
          : connection.user1;
        
        return {
          _id: connection._id,
          user: otherUser,
          establishedAt: connection.establishedAt,
          type: connection.type
        };
      });
    } catch (error) {
      console.error('Error getting user connections:', error);
      return [];
    }
  }

  // Get user's followers count
  static async getFollowersCount(userId) {
    try {
      return await Follow.countDocuments({ followeeId: userId });
    } catch (error) {
      console.error('Error getting followers count:', error);
      return 0;
    }
  }

  // Get user's following count
  static async getFollowingCount(userId) {
    try {
      return await Follow.countDocuments({ followerId: userId });
    } catch (error) {
      console.error('Error getting following count:', error);
      return 0;
    }
  }

  // Get user's followers list
  static async getFollowers(userId, limit = 20, skip = 0) {
    try {
      const follows = await Follow.find({ followeeId: userId })
        .populate('followerId', 'name avatar type department')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return follows.map(follow => ({
        ...follow.followerId,
        followedAt: follow.createdAt
      }));
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  }

  // Get user's following list
  static async getFollowing(userId, limit = 20, skip = 0) {
    try {
      const follows = await Follow.find({ followerId: userId })
        .populate('followeeId', 'name avatar type department')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return follows.map(follow => ({
        ...follow.followeeId,
        followedAt: follow.createdAt
      }));
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }

  // Get pending follow requests for a user
  static async getPendingFollowRequests(userId, limit = 20, skip = 0) {
    try {
      const requests = await FollowRequest.find({ 
        targetId: userId, 
        status: 'pending' 
      })
        .populate('requesterId', 'name avatar type department batch location')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return requests.map(request => ({
        _id: request._id,
        requesterId: request.requesterId._id,
        targetId: request.targetId,
        status: request.status,
        createdAt: request.createdAt,
        requester: {
          _id: request.requesterId._id,
          name: request.requesterId.name,
          email: request.requesterId.email,
          avatar: request.requesterId.avatar,
          type: request.requesterId.type,
          department: request.requesterId.department,
          batch: request.requesterId.batch,
          location: request.requesterId.location
        }
      }));
    } catch (error) {
      console.error('Error getting pending follow requests:', error);
      return [];
    }
  }

  // Get received follow requests for a user
  static async getReceivedFollowRequests(userId, limit = 20, skip = 0) {
    try {
      const requests = await FollowRequest.find({ 
        targetId: userId, 
        status: 'pending' 
      })
        .populate('requesterId', 'name avatar type department batch location')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return requests.map(request => ({
        _id: request._id,
        requesterId: request.requesterId._id,
        targetId: request.targetId,
        status: request.status,
        createdAt: request.createdAt,
        requester: {
          _id: request.requesterId._id,
          name: request.requesterId.name,
          email: request.requesterId.email,
          avatar: request.requesterId.avatar,
          type: request.requesterId.type,
          department: request.requesterId.department,
          batch: request.requesterId.batch,
          location: request.requesterId.location
        }
      }));
    } catch (error) {
      console.error('Error getting received follow requests:', error);
      return [];
    }
  }

  // Get sent follow requests by a user
  static async getSentFollowRequests(userId, limit = 20, skip = 0) {
    try {
      const requests = await FollowRequest.find({ 
        requesterId: userId, 
        status: 'pending' 
      })
        .populate('targetId', 'name avatar type department batch location')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return requests.map(request => ({
        _id: request._id,
        requesterId: request.requesterId,
        targetId: request.targetId._id,
        status: request.status,
        createdAt: request.createdAt,
        requester: {
          _id: request.targetId._id,
          name: request.targetId.name,
          email: request.targetId.email,
          avatar: request.targetId.avatar,
          type: request.targetId.type,
          department: request.targetId.department,
          batch: request.targetId.batch,
          location: request.targetId.location
        }
      }));
    } catch (error) {
      console.error('Error getting sent follow requests:', error);
      return [];
    }
  }

  // Get accepted connections (mutual follows)
  static async getAcceptedConnections(userId, limit = 20, skip = 0) {
    try {
      // Get users that the current user follows
      const following = await Follow.find({ followerId: userId })
        .populate('followeeId', 'name avatar type department batch location')
        .lean();

      // Get users that follow the current user
      const followers = await Follow.find({ followeeId: userId })
        .populate('followerId', 'name avatar type department batch location')
        .lean();

      // Find mutual connections
      const followingIds = following.map(f => f.followeeId._id.toString());
      const followerIds = followers.map(f => f.followerId._id.toString());
      
      const mutualIds = followingIds.filter(id => followerIds.includes(id));
      
      // Get mutual users with their follow data
      const mutualUsers = [];
      for (const id of mutualIds.slice(skip, skip + limit)) {
        const followData = following.find(f => f.followeeId._id.toString() === id);
        if (followData) {
          mutualUsers.push({
            _id: followData._id,
            requesterId: userId,
            targetId: followData.followeeId._id,
            status: 'accepted',
            createdAt: followData.createdAt,
            requester: {
              _id: followData.followeeId._id,
              name: followData.followeeId.name,
              email: followData.followeeId.email,
              avatar: followData.followeeId.avatar,
              type: followData.followeeId.type,
              department: followData.followeeId.department,
              batch: followData.followeeId.batch,
              location: followData.followeeId.location
            }
          });
        }
      }

      return mutualUsers;
    } catch (error) {
      console.error('Error getting accepted connections:', error);
      return [];
    }
  }

  // Cancel follow request
  static async cancelFollowRequest(requestId, requesterId) {
    try {
      // Find the follow request
      const followRequest = await FollowRequest.findOne({
        _id: requestId,
        requesterId: requesterId,
        status: 'pending'
      });

      if (!followRequest) {
        return {
          success: false,
          reason: 'request_not_found',
          message: 'Follow request not found or already processed'
        };
      }

      // Get target user for notification
      const targetUser = await User.findById(followRequest.targetId);
      if (!targetUser) {
        return {
          success: false,
          reason: 'target_not_found',
          message: 'Target user not found'
        };
      }

      // Delete the follow request
      await FollowRequest.findByIdAndDelete(requestId);

      return {
        success: true,
        message: `Follow request to ${targetUser.name} has been cancelled`,
        targetId: targetUser._id,
        targetName: targetUser.name
      };
    } catch (error) {
      console.error('Error cancelling follow request:', error);
      return {
        success: false,
        reason: 'server_error',
        message: 'Failed to cancel follow request'
      };
    }
  }

  // Unfollow a user (one-way). Updates Follow doc, user follower/following arrays,
  // and connection state if it exists
  static async unfollowUser(followerId, followeeId) {
    try {
      console.log('🔄 Unfollow request:', { followerId: followerId.toString(), followeeId: followeeId.toString() });
      
      if (!followerId || !followeeId) {
        console.log('❌ Invalid arguments:', { followerId, followeeId });
        return { success: false, reason: 'invalid_args', message: 'Invalid user ids' };
      }

      if (followerId.toString() === followeeId.toString()) {
        console.log('❌ Self unfollow attempt');
        return { success: false, reason: 'self_unfollow', message: 'Cannot unfollow yourself' };
      }

      // Ensure both users exist
      const [follower, followee] = await Promise.all([
        User.findById(followerId),
        User.findById(followeeId)
      ]);

      if (!follower || !followee) {
        console.log('❌ User not found:', { follower: !!follower, followee: !!followee });
        return { success: false, reason: 'user_not_found', message: 'User not found' };
      }

      console.log('✅ Users found:', { followerName: follower.name, followeeName: followee.name });

      // Check if there is an existing follow relation
      const existing = await Follow.findOne({ followerId, followeeId });
      console.log('🔍 Existing follow relationship:', { exists: !!existing, followId: existing?._id });
      
      if (!existing) {
        console.log('❌ No follow relationship found');
        return { success: false, reason: 'not_following', message: 'You are not following this user' };
      }

      // Remove the Follow document
      await Follow.deleteOne({ _id: existing._id });
      console.log('✅ Follow document deleted');

      // Update users' arrays if present
      const followerFollowingIndex = follower.following?.findIndex(id => id.toString() === followeeId.toString());
      if (typeof followerFollowingIndex === 'number' && followerFollowingIndex >= 0) {
        follower.following.splice(followerFollowingIndex, 1);
        console.log('✅ Removed from follower following array');
      }

      const followeeFollowersIndex = followee.followers?.findIndex(id => id.toString() === followerId.toString());
      if (typeof followeeFollowersIndex === 'number' && followeeFollowersIndex >= 0) {
        followee.followers.splice(followeeFollowersIndex, 1);
        console.log('✅ Removed from followee followers array');
      }

      await Promise.all([follower.save(), followee.save()]);
      console.log('✅ User arrays updated and saved');

      // Update Connection document if it exists
      const connection = await Connection.findOne({
        $or: [
          { user1: followerId, user2: followeeId },
          { user1: followeeId, user2: followerId }
        ]
      });

      if (connection) {
        console.log('🔍 Found connection:', { connectionId: connection._id, type: connection.type });
        // Check if reverse follow still exists (followee -> follower)
        const reverseFollow = await Follow.findOne({ followerId: followeeId, followeeId: followerId });
        if (reverseFollow) {
          // Downgrade to one-way follow connection
          connection.type = 'follow';
          connection.status = 'active';
          await connection.save();
          console.log('✅ Connection downgraded to one-way follow');
        } else {
          // No follow either way, set connection inactive
          connection.status = 'inactive';
          await connection.save();
          console.log('✅ Connection set to inactive');
        }
      }

      console.log('✅ Unfollow completed successfully');
      return {
        success: true,
        message: `You unfollowed ${followee.name}`,
        targetName: followee.name
      };
    } catch (error) {
      console.error('❌ Error unfollowing user:', error);
      return { success: false, reason: 'server_error', message: 'Failed to unfollow user' };
    }
  }
}

module.exports = FollowService;
