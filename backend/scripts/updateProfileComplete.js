const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

async function updateProfileComplete() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find users who have basic profile information but isProfileComplete is false
    const usersToUpdate = await User.find({
      $and: [
        { name: { $exists: true, $ne: null } },
        { email: { $exists: true, $ne: null } },
        {
          $or: [
            { department: { $exists: true, $ne: null } },
            { bio: { $exists: true, $ne: null } },
            { skills: { $exists: true, $ne: [] } },
            { 'studentInfo.department': { $exists: true, $ne: null } },
            { 'alumniInfo.currentCompany': { $exists: true, $ne: null } },
            { 'facultyInfo.department': { $exists: true, $ne: null } }
          ]
        },
        { isProfileComplete: { $ne: true } }
      ]
    });

    console.log(`📊 Found ${usersToUpdate.length} users to update`);

    if (usersToUpdate.length === 0) {
      console.log('✅ No users need to be updated');
      return;
    }

    // Update isProfileComplete to true for these users
    const result = await User.updateMany(
      {
        _id: { $in: usersToUpdate.map(user => user._id) }
      },
      {
        $set: { isProfileComplete: true }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);
    console.log('✅ Profile completion status updated successfully');

  } catch (error) {
    console.error('❌ Error updating profile completion status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
updateProfileComplete();
