const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config({ path: './config.env' });

async function fixPostTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Get all posts
    const posts = await Post.find({});
    console.log(`📝 Found ${posts.length} posts to fix`);

    let updatedCount = 0;

    for (const post of posts) {
      let postType = 'general'; // default type
      
      // Determine type based on content or existing fields
      if (post.jobDetails && Object.keys(post.jobDetails).length > 0) {
        postType = 'job';
      } else if (post.pollDetails && Object.keys(post.pollDetails).length > 0) {
        postType = 'poll';
      } else if (post.eventDetails && Object.keys(post.eventDetails).length > 0) {
        postType = 'event';
      } else if (post.content && post.content.includes('poll') || post.content.includes('vote')) {
        postType = 'poll';
      } else if (post.content && (post.content.includes('meet') || post.content.includes('event') || post.content.includes('join'))) {
        postType = 'event';
      } else if (post.content && (post.content.includes('job') || post.content.includes('hire') || post.content.includes('career'))) {
        postType = 'job';
      }

      // Update the post with the correct type
      await Post.findByIdAndUpdate(post._id, { type: postType });
      console.log(`✅ Fixed post ${post._id}: ${postType}`);
      updatedCount++;
    }

    console.log(`\n🎉 Successfully fixed ${updatedCount} posts!`);

    // Verify the fix
    const updatedPosts = await Post.find({});
    console.log(`\n📋 Post types after fix:`);
    const typeCounts = {};
    updatedPosts.forEach(post => {
      typeCounts[post.type] = (typeCounts[post.type] || 0) + 1;
    });
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} posts`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixPostTypes();
