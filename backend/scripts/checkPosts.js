const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config({ path: './config.env' });

async function checkPosts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const posts = await Post.find().limit(3);
    console.log(`📝 Found ${posts.length} posts`);

    posts.forEach((post, index) => {
      console.log(`\n--- Post ${index + 1} ---`);
      console.log('ID:', post._id);
      console.log('Type:', post.postType);
      console.log('Title:', post.title);
      console.log('Content:', post.content?.substring(0, 50) + '...');
      console.log('Author ID:', post.author);
      console.log('User Type:', post.userType);
      console.log('Has _id:', !!post._id);
      console.log('Keys:', Object.keys(post));
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkPosts();
