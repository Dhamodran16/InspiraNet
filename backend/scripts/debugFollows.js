const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
require('dotenv').config({ path: './config.env' });

async function debugFollows() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all follow relationships
    const follows = await Follow.find({});
    console.log(`📊 Total follow relationships: ${follows.length}`);

    // Get all users
    const users = await User.find({});
    console.log(`👥 Total users: ${users.length}`);

    // Check for any inconsistencies
    for (const follow of follows) {
      const follower = await User.findById(follow.followerId);
      const followee = await User.findById(follow.followeeId);
      
      if (!follower || !followee) {
        console.log('❌ Orphaned follow relationship:', {
          followId: follow._id,
          followerId: follow.followerId,
          followeeId: follow.followeeId,
          followerExists: !!follower,
          followeeExists: !!followee
        });
        continue;
      }

      // Check if follower's following array contains followee
      const followerFollowing = follower.following || [];
      const isInFollowerFollowing = followerFollowing.some(id => id.toString() === follow.followeeId.toString());
      
      // Check if followee's followers array contains follower
      const followeeFollowers = followee.followers || [];
      const isInFolloweeFollowers = followeeFollowers.some(id => id.toString() === follow.followerId.toString());

      if (!isInFollowerFollowing || !isInFolloweeFollowers) {
        console.log('❌ Inconsistent follow arrays:', {
          followId: follow._id,
          followerName: follower.name,
          followeeName: followee.name,
          isInFollowerFollowing,
          isInFolloweeFollowers,
          followerFollowingCount: followerFollowing.length,
          followeeFollowersCount: followeeFollowers.length
        });
      }
    }

    console.log('✅ Debug completed');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

debugFollows();

