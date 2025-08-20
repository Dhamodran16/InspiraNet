const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

async function verifyUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find and verify the user
    const user = await User.findOneAndUpdate(
      { 'email.personal': 'dhamodran17@gmail.com' },
      { 
        isVerified: true,
        verificationDate: new Date()
      },
      { new: true }
    );
    
    if (user) {
      console.log('✅ User verified successfully!');
      console.log('👤 Name:', user.name);
      console.log('📧 Email:', user.email);
      console.log('🔑 User ID:', user._id);
      console.log('✅ Is Verified:', user.isVerified);
      console.log('📅 Verification Date:', user.verificationDate);
      
      console.log('\n🎉 Now you can:');
      console.log('1. Refresh your browser page');
      console.log('2. Login with: dhamodran17@gmail.com / Abcd123');
      console.log('3. Posts should load properly');
      console.log('4. Scrolling should work!');
      
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

verifyUser();

