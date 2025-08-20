const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

async function forceNewLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find the user (Dhamodraprasath)
    const user = await User.findOne({ 'email.personal': 'dhamodran17@gmail.com' });
    
    if (user) {
      console.log('👤 Found user:', user.name);
      console.log('📧 Email:', user.email);
      console.log('🔑 User ID:', user._id);
      console.log('✅ User is verified:', user.isVerified);
      
      // Show login credentials
      console.log('\n🔐 Login Credentials:');
      console.log('Email: dhamodran17@gmail.com');
      console.log('Password: Abcd123');
      
      console.log('\n💡 To fix the 401 error:');
      console.log('1. Go to your browser');
      console.log('2. Open Developer Tools (F12)');
      console.log('3. Go to Application/Storage tab');
      console.log('4. Clear all localStorage data');
      console.log('5. Refresh the page');
      console.log('6. Login again with the credentials above');
      
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

forceNewLogin();

