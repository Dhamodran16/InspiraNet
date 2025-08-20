const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config({ path: './config.env' });

async function checkAllPosts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const posts = await Post.find({});
    console.log(`📝 Found ${posts.length} posts`);

    posts.forEach((post, index) => {
      console.log(`\n--- Post ${index + 1} ---`);
      console.log(`ID: ${post._id}`);
      console.log(`Type: ${post.type}`);
      console.log(`Title: ${post.title || 'No title'}`);
      console.log(`Content: ${post.content ? post.content.substring(0, 50) + '...' : 'No content'}`);
      console.log(`Author ID: ${post.author || 'No author'}`);
      console.log(`Has _id: ${!!post._id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkAllPosts();
