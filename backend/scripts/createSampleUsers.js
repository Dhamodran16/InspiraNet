const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

// Import User model
const User = require('../models/User');

const sampleUsers = [
  // Alumni Users
  {
    name: "Rajesh Kumar",
    email: "rajesh.kumar@alumni.kec.ac.in",
    password: "password123",
    type: "alumni",
    batch: "2020",
    department: "cs",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    bio: "Software Engineer at Google. Passionate about AI and machine learning.",
    currentCompany: "Google",
    designation: "Senior Software Engineer",
    location: "Bangalore, India",
    skills: ["JavaScript", "Python", "React", "Node.js", "Machine Learning"],
    interests: ["Technology", "AI", "Open Source", "Mentoring"]
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@alumni.kec.ac.in",
    password: "password123",
    type: "alumni",
    batch: "2019",
    department: "ece",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    bio: "Product Manager at Microsoft. Love building products that make a difference.",
    currentCompany: "Microsoft",
    designation: "Product Manager",
    location: "Hyderabad, India",
    skills: ["Product Management", "Data Analysis", "User Research", "Agile"],
    interests: ["Product Strategy", "User Experience", "Women in Tech"]
  },
  {
    name: "Arun Singh",
    email: "arun.singh@alumni.kec.ac.in",
    password: "password123",
    type: "alumni",
    batch: "2021",
    department: "me",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    bio: "Mechanical Engineer at Tesla. Working on sustainable energy solutions.",
    currentCompany: "Tesla",
    designation: "Mechanical Engineer",
    location: "Pune, India",
    skills: ["CAD", "SolidWorks", "Manufacturing", "Automation"],
    interests: ["Sustainable Energy", "Automotive", "Innovation"]
  },

  // Current Students
  {
    name: "Aisha Patel",
    email: "aisha.patel@student.kec.ac.in",
    password: "password123",
    type: "student",
    batch: "2024",
    department: "cs",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    bio: "Final year CS student. Passionate about web development and cybersecurity.",
    currentCompany: "",
    designation: "Student",
    location: "Erode, India",
    skills: ["Java", "Python", "Web Development", "Cybersecurity"],
    interests: ["Web Development", "Cybersecurity", "Competitive Programming"]
  },
  {
    name: "Vikram Reddy",
    email: "vikram.reddy@student.kec.ac.in",
    password: "password123",
    type: "student",
    batch: "2024",
    department: "ece",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    bio: "ECE student interested in IoT and embedded systems.",
    currentCompany: "",
    designation: "Student",
    location: "Erode, India",
    skills: ["C++", "Arduino", "IoT", "Signal Processing"],
    interests: ["IoT", "Embedded Systems", "Robotics"]
  },
  {
    name: "Meera Iyer",
    email: "meera.iyer@student.kec.ac.in",
    password: "password123",
    type: "student",
    batch: "2025",
    department: "it",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    bio: "IT student passionate about data science and analytics.",
    currentCompany: "",
    designation: "Student",
    location: "Erode, India",
    skills: ["Python", "SQL", "Data Analysis", "Machine Learning"],
    interests: ["Data Science", "Analytics", "Research"]
  },

  // Faculty Members
  {
    name: "Dr. Suresh Kumar",
    email: "suresh.kumar@faculty.kec.ac.in",
    password: "password123",
    type: "faculty",
    batch: "",
    department: "cs",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    bio: "Professor and Head of Computer Science Department. Research in AI and ML.",
    currentCompany: "KEC",
    designation: "Professor & HOD",
    location: "Erode, India",
    skills: ["Artificial Intelligence", "Machine Learning", "Research", "Teaching"],
    interests: ["AI Research", "Academic Excellence", "Student Mentoring"]
  },
  {
    name: "Dr. Lakshmi Devi",
    email: "lakshmi.devi@faculty.kec.ac.in",
    password: "password123",
    type: "faculty",
    batch: "",
    department: "ece",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    bio: "Associate Professor in ECE. Specialized in VLSI and Digital Design.",
    currentCompany: "KEC",
    designation: "Associate Professor",
    location: "Erode, India",
    skills: ["VLSI Design", "Digital Electronics", "Research", "Teaching"],
    interests: ["VLSI", "Digital Design", "Academic Research"]
  }
];

async function createSampleUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing sample users (optional)
    await User.deleteMany({
      email: { $in: sampleUsers.map(user => user.email) }
    });
    console.log('🗑️ Cleared existing sample users');

    // Create users
    for (const userData of sampleUsers) {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = new User({
        ...userData,
        password: hashedPassword
      });

      await user.save();
      console.log(`✅ Created user: ${userData.name} (${userData.type})`);
    }

    console.log('\n🎉 Sample users created successfully!');
    console.log('\n📋 User Summary:');
    console.log('- Alumni: 3 users');
    console.log('- Students: 3 users');
    console.log('- Faculty: 2 users');
    console.log('\n🔑 All users have password: password123');

  } catch (error) {
    console.error('❌ Error creating sample users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createSampleUsers();
