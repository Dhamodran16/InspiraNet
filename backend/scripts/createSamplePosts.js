const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config({ path: './config.env' });

// Sample posts data
const samplePosts = [
  {
    postType: 'general',
    title: 'Welcome to KEC Alumni Network!',
    content: 'Hello everyone! Welcome to our new alumni network platform. This is where we can share experiences, opportunities, and stay connected with our KEC family.',
    tags: ['welcome', 'alumni', 'network'],
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05', // Dhamodraprasath's ID
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    postType: 'general',
    title: 'Exciting Career Opportunities in Tech',
    content: 'The tech industry is booming with opportunities! If you\'re looking for software engineering, data science, or AI roles, there are plenty of openings. Let\'s help each other out!',
    tags: ['career', 'tech', 'opportunities'],
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    postType: 'job',
    title: 'Senior Software Engineer at Google',
    content: 'We are looking for experienced software engineers to join our team. This is a great opportunity to work on cutting-edge technology.',
    company: 'Google',
    location: 'Bangalore, India',
    type: 'Full-time',
    description: 'We are looking for experienced software engineers to join our team. This is a great opportunity to work on cutting-edge technology.',
    requirements: ['JavaScript', 'React', 'Node.js', '5+ years experience'],
    salary: '25-45 LPA',
    contact: 'careers@google.com',
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    postType: 'poll',
    content: 'What technology are you most excited about in 2024?',
    pollDetails: {
      question: 'What technology are you most excited about in 2024?',
      options: ['Artificial Intelligence', 'Blockchain', 'Cloud Computing', 'Cybersecurity'],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    postType: 'event',
    content: 'Join us for our annual alumni meet! This is a great opportunity to reconnect with old friends and make new connections.',
    eventDetails: {
      title: 'KEC Alumni Meet 2024',
      description: 'Join us for our annual alumni meet! This is a great opportunity to reconnect with old friends and make new connections.',
      date: new Date('2024-12-15'),
      time: '10:00 AM',
      location: 'KEC Campus, Perundurai',
      type: 'Networking',
      maxAttendees: 200
    },
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    postType: 'general',
    title: 'Tips for Recent Graduates',
    content: 'As someone who graduated recently, here are some tips that helped me: 1) Build a strong LinkedIn profile, 2) Network actively, 3) Keep learning new skills, 4) Don\'t be afraid to start small. What tips would you add?',
    tags: ['graduation', 'career', 'tips', 'advice'],
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    postType: 'general',
    title: 'Memories from KEC Campus',
    content: 'Remember those late-night study sessions in the library? The canteen food, the hostel life, and all the fun we had during college festivals. Share your favorite memories!',
    tags: ['memories', 'campus', 'college', 'nostalgia'],
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    postType: 'job',
    content: 'Join our data science team and work on exciting projects using AI and machine learning.',
    jobDetails: {
      title: 'Data Scientist at Microsoft',
      company: 'Microsoft',
      location: 'Hyderabad, India',
      type: 'Full-time',
      description: 'Join our data science team and work on exciting projects using AI and machine learning.',
      requirements: ['Python', 'Machine Learning', 'Statistics', '3+ years experience'],
      salary: '20-35 LPA',
      contact: 'careers@microsoft.com'
    },
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    postType: 'general',
    title: 'Industry Trends in 2024',
    content: 'What industry trends are you seeing in your field? In tech, I\'m noticing a big push towards AI/ML, cloud-native development, and sustainable technology. Would love to hear from other industries!',
    tags: ['trends', 'industry', 'technology', 'discussion'],
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    postType: 'poll',
    content: 'Which programming language do you use most at work?',
    pollDetails: {
      question: 'Which programming language do you use most at work?',
      options: ['JavaScript/TypeScript', 'Python', 'Java', 'C#', 'Go', 'Other'],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    isPublic: true,
    allowComments: true,
    author: '68a02efd3e39bd0983ae1a05',
    userType: 'alumni',
    batch: '2020',
    department: 'Computer Science',
    likes: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function createSamplePosts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Clear existing posts (optional)
    const existingPosts = await Post.countDocuments();
    if (existingPosts > 0) {
      console.log(`📝 Found ${existingPosts} existing posts`);
    }

    // Add sample posts
    console.log('📝 Adding sample posts...');
    for (const postData of samplePosts) {
      try {
        const post = new Post(postData);
        await post.save();
        console.log(`✅ Created post: ${post.title}`);
      } catch (error) {
        console.log(`❌ Error creating post "${postData.title}":`, error.message);
      }
    }

    // Verify posts were created
    const totalPosts = await Post.countDocuments();
    console.log(`\n🎉 Successfully created posts! Total posts in database: ${totalPosts}`);

    // Show some sample posts
    const recentPosts = await Post.find().sort({ createdAt: -1 }).limit(5);
    console.log('\n📋 Recent posts created:');
    recentPosts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title} (${post.postType})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createSamplePosts();
