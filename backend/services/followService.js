const Follow = require('../models/Follow');
const FollowRequest = require('../models/FollowRequest');
const User = require('../models/User');
const NotificationService = require('./notificationService');
const Connection = require('../models/Connection');

class FollowService {
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

  // Accept follow request
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

      console.log('🔍 Creating connection between users...');
      // Create connection
      try {
        await this.createConnection(followRequest.requesterId, followRequest.targetId, followRequest.requesterId);
        console.log('✅ Connection created successfully');
      } catch (error) {
        console.error('❌ Error creating connection:', error);
      }

      // Ensure Follow documents exist for both directions (mutual follow persistence)
      try {
        const requesterId = followRequest.requesterId;
        const targetId = followRequest.targetId;

        // Create or ensure requester -> target follow
        const existingForwardFollow = await Follow.findOne({
          followerId: requesterId,
          followeeId: targetId
        });
        if (!existingForwardFollow) {
          await Follow.create({ followerId: requesterId, followeeId: targetId });
          console.log('✅ Created Follow (requester -> target)');
        }

        // Create or ensure target -> requester follow (mutual)
        const existingBackwardFollow = await Follow.findOne({
          followerId: targetId,
          followeeId: requesterId
        });
        if (!existingBackwardFollow) {
          await Follow.create({ followerId: targetId, followeeId: requesterId });
          console.log('✅ Created Follow (target -> requester)');
        }
      } catch (followCreationError) {
        console.error('❌ Error ensuring Follow documents for mutual connection:', followCreationError);
      }

      // Create notifications
      const requester = await User.findById(followRequest.requesterId);
      const target = await User.findById(followRequest.targetId);

      if (requester && target) {
        // Notify requester that their request was accepted
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
          console.error('Error creating follow accepted notification for requester:', notificationError);
        }

        // Notify target that they accepted the request
        try {
          await NotificationService.createNotification({
            recipientId: followRequest.targetId,
            senderId: followRequest.requesterId,
            type: 'follow_accepted',
            title: 'Follow Request Accepted',
            message: `You accepted ${requester.name}'s follow request`,
            relatedUserId: followRequest.requesterId,
            category: 'connection',
            priority: 'medium',
            metadata: {
              requesterName: requester.name,
              requesterAvatar: requester.avatar,
              requesterType: requester.type
            }
          });
        } catch (notificationError) {
          console.error('Error creating follow accepted notification for target:', notificationError);
        }
      }

      return { 
        success: true, 
        message: 'Follow request accepted successfully',
        requesterName: requester?.name,
        targetName: target?.name
      };
    } catch (error) {
      console.error('Error accepting follow request:', error);
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

        await user1.save();
        await user2.save();
        
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
