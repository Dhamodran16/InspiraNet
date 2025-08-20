const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const FollowService = require('../services/followService');
require('dotenv').config({ path: './config.env' });

async function testFollowUnfollow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get two users for testing
    const users = await User.find({}).limit(2);
    if (users.length < 2) {
      console.log('❌ Need at least 2 users for testing');
      return;
    }

    const [user1, user2] = users;
    console.log('👥 Test users:', {
      user1: { id: user1._id, name: user1.name },
      user2: { id: user2._id, name: user2.name }
    });

    // Test 1: Follow user2 from user1
    console.log('\n🔄 Test 1: Following user2 from user1');
    const followResult = await FollowService.sendFollowRequest(user1._id, user2._id);
    console.log('Follow result:', followResult);

    if (followResult.success) {
      // Test 2: Accept follow request (simulate)
      console.log('\n🔄 Test 2: Accepting follow request');
      const acceptResult = await FollowService.acceptFollowRequest(user2._id, followResult.requestId);
      console.log('Accept result:', acceptResult);

      if (acceptResult.success) {
        // Test 3: Unfollow user2 from user1
        console.log('\n🔄 Test 3: Unfollowing user2 from user1');
        const unfollowResult = await FollowService.unfollowUser(user1._id, user2._id);
        console.log('Unfollow result:', unfollowResult);
      }
    }

    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testFollowUnfollow();

