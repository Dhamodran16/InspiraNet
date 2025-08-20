const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config({ path: './config.env' });

async function cleanupPosts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find posts without author field
    const malformedPosts = await Post.find({ 
      $or: [
        { author: { $exists: false } },
        { author: null },
        { content: { $exists: false } },
        { content: null }
      ]
    });

    console.log(`📝 Found ${malformedPosts.length} malformed posts`);

    if (malformedPosts.length > 0) {
      // Delete malformed posts
      const result = await Post.deleteMany({
        $or: [
          { author: { $exists: false } },
          { author: null },
          { content: { $exists: false } },
          { content: null }
        ]
      });

      console.log(`🗑️  Deleted ${result.deletedCount} malformed posts`);
    }

    // Check remaining posts
    const remainingPosts = await Post.countDocuments();
    console.log(`📊 Remaining posts: ${remainingPosts}`);

    // Show sample of good posts
    const goodPosts = await Post.find().limit(3);
    console.log('\n📋 Sample of good posts:');
    goodPosts.forEach((post, index) => {
      console.log(`${index + 1}. ID: ${post._id}, Type: ${post.postType}, Author: ${post.author}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

cleanupPosts();
