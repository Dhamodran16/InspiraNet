const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

// Import User model
const User = require('../models/User');

async function checkExistingUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find all users
    const users = await User.find({}).select('name email type department studentInfo');
    
    console.log('\n📊 Database User Analysis:');
    console.log('========================');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`✅ Found ${users.length} users in database:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. User Details:`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Type: ${user.type}`);
      console.log(`   Department: ${user.department || 'N/A'}`);
      console.log(`   College Email: ${user.email?.college || 'N/A'}`);
      console.log(`   Personal Email: ${user.email?.personal || 'N/A'}`);
      
      if (user.type === 'student' && user.studentInfo) {
        console.log(`   Join Year: ${user.studentInfo.joinYear || 'N/A'}`);
      }
      
      console.log('   ---');
    });

    // Check for specific user that frontend is trying to login with
    const frontendEmail = 'boobalanj.23aim@kongu.edu';
    const frontendUser = await User.findOne({
      $or: [
        { 'email.college': frontendEmail },
        { 'email.personal': frontendEmail }
      ]
    });

    console.log('\n🔍 Frontend Login Check:');
    console.log('======================');
    console.log(`Frontend trying to login with: ${frontendEmail}`);
    
    if (frontendUser) {
      console.log('✅ User found in database!');
      console.log(`   Name: ${frontendUser.name}`);
      console.log(`   Type: ${frontendUser.type}`);
      console.log(`   College Email: ${frontendUser.email?.college || 'N/A'}`);
      console.log(`   Personal Email: ${frontendUser.email?.personal || 'N/A'}`);
    } else {
      console.log('❌ User NOT found in database');
      console.log('   This explains the 401 Unauthorized error');
    }

    // Test password for the frontend user
    if (frontendUser) {
      console.log('\n🔐 Password Verification:');
      console.log('========================');
      
      const testPassword = 'Abcd123';
      const isPasswordValid = await bcrypt.compare(testPassword, frontendUser.password);
      
      console.log(`Testing password: ${testPassword}`);
      console.log(`Password valid: ${isPasswordValid ? '✅ YES' : '❌ NO'}`);
      
      if (!isPasswordValid) {
        console.log('❌ Password mismatch - this explains the 401 error');
      } else {
        console.log('✅ Password is correct');
      }
    }

    // Create test users if needed
    console.log('\n🛠️  Creating Test Users:');
    console.log('=======================');
    
    const testUsers = [
      {
        name: 'Boobalan J',
        email: 'boobalanj.23aim@kongu.edu',
        password: 'Abcd123',
        type: 'alumni'
      },
      {
        name: 'Test Student',
        password: 'password123',
        type: 'student',
        department: 'cse',
        joinYear: 2023
      },
      {
        name: 'Test Faculty',
        email: 'test.faculty@kongu.edu',
        password: 'password123',
        type: 'faculty',
        department: 'cse'
      }
    ];

    for (const testUser of testUsers) {
      const existingUser = await User.findOne({
        $or: [
          { 'email.college': testUser.email },
          { 'email.personal': testUser.email }
        ]
      });

      if (!existingUser) {
        console.log(`Creating user: ${testUser.name} (${testUser.type})`);
        
        // Hash password
        const hashedPassword = await bcrypt.hash(testUser.password, 12);
        
        // Prepare user data
        const userData = {
          name: testUser.name,
          password: hashedPassword,
          type: testUser.type,
          isVerified: true,
          isProfileComplete: false
        };

        // Add email based on type
        if (testUser.type === 'student') {
          const { generateStudentEmail } = require('../utils/emailValidation');
          const collegeEmail = generateStudentEmail(testUser.name, testUser.joinYear, testUser.department);
          userData.email = { college: collegeEmail };
          userData.department = testUser.department;
          userData.studentInfo = { joinYear: testUser.joinYear };
        } else if (testUser.type === 'faculty') {
          userData.email = { college: testUser.email };
          userData.department = testUser.department;
        } else if (testUser.type === 'alumni') {
          userData.email = { personal: testUser.email };
        }

        const newUser = new User(userData);
        await newUser.save();
        console.log(`✅ Created user: ${testUser.name}`);
      } else {
        console.log(`⏭️  User already exists: ${testUser.name}`);
      }
    }

    console.log('\n🎯 Login Test Credentials:');
    console.log('==========================');
    console.log('1. Alumni Login:');
    console.log('   Email: boobalanj.23aim@kongu.edu');
    console.log('   Password: Abcd123');
    console.log('');
    console.log('2. Student Login:');
    console.log('   Email: teststudent.2023cse@kongu.edu');
    console.log('   Password: password123');
    console.log('');
    console.log('3. Faculty Login:');
    console.log('   Email: test.faculty@kongu.edu');
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
checkExistingUsers(); 