const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config({ path: './config.env' });

// Sample posts data with proper structure
const samplePosts = [
  {
    author: '68a02efd3e39bd0983ae1a05', // Dhamodraprasath's ID
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    postType: 'general',
    title: 'Welcome to KEC Alumni Network!',
    content: 'Hello everyone! Welcome to our new alumni network platform. This is where we can share experiences, opportunities, and stay connected with our KEC family.',
    tags: ['welcome', 'alumni', 'network'],
    media: [],
    isPublic: true,
    allowComments: true,
    likes: [],
    comments: []
  },
  {
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    postType: 'general',
    title: 'Exciting Career Opportunities in Tech',
    content: 'The tech industry is booming with opportunities! If you\'re looking for software engineering, data science, or AI roles, there are plenty of openings. Let\'s help each other out!',
    tags: ['career', 'tech', 'opportunities'],
    media: [],
    isPublic: true,
    allowComments: true,
    likes: [],
    comments: []
  },
  {
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    postType: 'job',
    title: 'Senior Software Engineer at Google',
    content: 'We are looking for experienced software engineers to join our team. This is a great opportunity to work on cutting-edge technology.',
    jobDetails: {
      company: 'Google',
      location: 'Bangalore, India',
      salary: '25-45 LPA',
      jobType: 'Full-time',
      title: 'Senior Software Engineer',
      contactEmail: 'careers@google.com'
    },
    tags: ['job', 'google', 'software engineer'],
    media: [],
    isPublic: true,
    allowComments: true,
    likes: [],
    comments: []
  },
  {
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    postType: 'poll',
    content: 'What technology are you most excited about in 2024?',
    pollDetails: {
      question: 'What technology are you most excited about in 2024?',
      options: [
        { id: '1', text: 'Artificial Intelligence', votes: 0 },
        { id: '2', text: 'Blockchain', votes: 0 },
        { id: '3', text: 'Cloud Computing', votes: 0 },
        { id: '4', text: 'Cybersecurity', votes: 0 }
      ],
      totalVotes: 0
    },
    tags: ['poll', 'technology', '2024'],
    media: [],
    isPublic: true,
    allowComments: true,
    likes: [],
    comments: []
  },
  {
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    postType: 'event',
    content: 'Join us for our annual alumni meet! This is a great opportunity to reconnect with old friends and make new connections.',
    eventDetails: {
      date: '2024-12-15',
      time: '10:00 AM',
      location: 'KEC Campus, Perundurai',
      maxAttendees: 200,
      attendanceMode: 'in-person'
    },
    tags: ['event', 'alumni meet', 'networking'],
    media: [],
    isPublic: true,
    allowComments: true,
    likes: [],
    comments: []
  }
];

async function createProperPosts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Add sample posts
    console.log('📝 Adding properly formatted sample posts...');
    for (const postData of samplePosts) {
      try {
        const post = new Post(postData);
        await post.save();
        console.log(`✅ Created post: ${post.title || post.content.substring(0, 30)}...`);
      } catch (error) {
        console.log(`❌ Error creating post:`, error.message);
      }
    }

    // Verify posts were created
    const totalPosts = await Post.countDocuments();
    console.log(`\n🎉 Successfully created posts! Total posts in database: ${totalPosts}`);

    // Show some sample posts
    const recentPosts = await Post.find().sort({ createdAt: -1 }).limit(5);
    console.log('\n📋 Recent posts created:');
    recentPosts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title || post.content.substring(0, 30)}... (${post.postType})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createProperPosts();
