const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config({ path: './config.env' });

async function fixSpecificPost() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find the post with undefined author
    const badPost = await Post.findOne({ author: undefined });
    
    if (badPost) {
      console.log('📝 Found post with undefined author:', badPost._id);
      
      // Delete this post
      await Post.findByIdAndDelete(badPost._id);
      console.log('🗑️  Deleted post with undefined author');
    } else {
      console.log('✅ No posts with undefined author found');
    }

    // Check remaining posts
    const remainingPosts = await Post.countDocuments();
    console.log(`📊 Remaining posts: ${remainingPosts}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixSpecificPost();
