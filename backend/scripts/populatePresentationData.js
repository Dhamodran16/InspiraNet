const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const JobPosting = require('../models/JobPosting');
require('dotenv').config({ path: './config.env' });

// Sample data for presentation
const sampleUsers = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    type: 'alumni',
    studentInfo: {
      department: 'Computer Science',
      graduationYear: '2020',
      batch: '2016-2020'
    }
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    type: 'alumni',
    studentInfo: {
      department: 'Electrical Engineering',
      graduationYear: '2019',
      batch: '2015-2019'
    }
  }
];

const sampleEvents = [
  {
    title: 'Annual Alumni Meet 2024',
    date: '2024-12-15',
    time: '10:00 AM',
    location: 'KEC Campus',
    type: 'Networking',
    description: 'Annual gathering of KEC alumni',
    status: 'upcoming',
    createdBy: 'admin@kec.edu'
  },
  {
    title: 'Tech Talk: AI in Industry',
    date: '2024-11-20',
    time: '2:00 PM',
    location: 'Online',
    type: 'Workshop',
    description: 'Learn about AI applications in industry',
    status: 'upcoming',
    createdBy: 'admin@kec.edu'
  },
  {
    title: 'Career Fair 2024',
    date: '2024-10-25',
    time: '9:00 AM',
    location: 'KEC Auditorium',
    type: 'Career',
    description: 'Connect with top companies',
    status: 'upcoming',
    createdBy: 'admin@kec.edu'
  }
];

const sampleJobs = [
  {
    title: 'Software Engineer',
    company: 'Tech Corp',
    location: 'Bangalore',
    type: 'Full-time',
    description: 'Looking for talented software engineers',
    requirements: ['JavaScript', 'React', 'Node.js'],
    salary: '8-15 LPA',
    deadline: '2024-12-31',
    contactEmail: 'hr@techcorp.com',
    postedBy: 'admin@kec.edu',
    isActive: true
  },
  {
    title: 'Data Analyst',
    company: 'Data Solutions',
    location: 'Chennai',
    type: 'Full-time',
    description: 'Data analysis and visualization role',
    requirements: ['Python', 'SQL', 'Tableau'],
    salary: '6-12 LPA',
    deadline: '2024-12-31',
    contactEmail: 'careers@datasolutions.com',
    postedBy: 'admin@kec.edu',
    isActive: true
  },
  {
    title: 'DevOps Engineer',
    company: 'Cloud Systems',
    location: 'Hyderabad',
    type: 'Full-time',
    description: 'DevOps and cloud infrastructure role',
    requirements: ['Docker', 'Kubernetes', 'AWS'],
    salary: '10-18 LPA',
    deadline: '2024-12-31',
    contactEmail: 'jobs@cloudsystems.com',
    postedBy: 'admin@kec.edu',
    isActive: true
  }
];

async function populateData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await User.deleteMany({ email: { $in: sampleUsers.map(u => u.email) } });
    // await Event.deleteMany({ title: { $in: sampleEvents.map(e => e.title) } });
    // await JobPosting.deleteMany({ title: { $in: sampleJobs.map(j => j.title) } });

    // Add sample users
    console.log('📝 Adding sample users...');
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Added user: ${userData.name}`);
      } else {
        console.log(`⏭️ User already exists: ${userData.name}`);
      }
    }

    // Add sample events
    console.log('📅 Adding sample events...');
    for (const eventData of sampleEvents) {
      const existingEvent = await Event.findOne({ title: eventData.title });
      if (!existingEvent) {
        await Event.create(eventData);
        console.log(`✅ Added event: ${eventData.title}`);
      } else {
        console.log(`⏭️ Event already exists: ${eventData.title}`);
      }
    }

    // Add sample jobs
    console.log('💼 Adding sample jobs...');
    for (const jobData of sampleJobs) {
      const existingJob = await JobPosting.findOne({ title: jobData.title });
      if (!existingJob) {
        await JobPosting.create(jobData);
        console.log(`✅ Added job: ${jobData.title}`);
      } else {
        console.log(`⏭️ Job already exists: ${jobData.title}`);
      }
    }

    // Get final counts
    const alumniCount = await User.countDocuments({ type: 'alumni' });
    const eventsCount = await Event.countDocuments({ status: { $ne: 'cancelled' } });
    const jobsCount = await JobPosting.countDocuments({ isActive: true });

    console.log('\n🎯 Final Counts:');
    console.log(`👥 Active Alumni: ${alumniCount}`);
    console.log(`📅 Annual Events: ${eventsCount}`);
    console.log(`💼 Job Opportunities: ${jobsCount}`);

    console.log('\n🚀 Your presentation is ready!');
    console.log(`🌐 Test the API: http://localhost:5001/api/stats/presentation`);

  } catch (error) {
    console.error('❌ Error populating data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
populateData();
