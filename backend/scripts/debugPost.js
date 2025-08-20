const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config({ path: './config.env' });

async function debugPost() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const post = await Post.findOne({});
    if (post) {
      console.log('📝 Sample Post Structure:');
      console.log('Raw post object keys:', Object.keys(post));
      console.log('post._doc keys:', Object.keys(post._doc));
      console.log('postType field:', post.postType);
      console.log('type field:', post.type);
      console.log('Full post object:', JSON.stringify(post._doc, null, 2));
    } else {
      console.log('❌ No posts found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugPost();
