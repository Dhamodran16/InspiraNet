#!/usr/bin/env node

/**
 * Simple MongoDB Connection Test
 * This script tests basic MongoDB connection without complex options
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');

console.log('🔍 Simple MongoDB Connection Test');
console.log('=================================\n');

// Check environment variables
console.log('📋 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'EXISTS' : 'MISSING'}`);

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in config.env');
  process.exit(1);
}

// Parse MongoDB URI to check format
const uri = process.env.MONGODB_URI;
console.log(`\n🔗 MongoDB URI Format Check:`);
console.log(`   Protocol: ${uri.startsWith('mongodb+srv://') ? '✅ mongodb+srv://' : '❌ Invalid protocol'}`);
console.log(`   Has username: ${uri.includes('@') ? '✅ Yes' : '❌ No'}`);
console.log(`   Has database: ${uri.includes('/infranet') ? '✅ Yes' : '❌ No'}`);

// Extract hostname
const hostnameMatch = uri.match(/@([^/]+)/);
if (hostnameMatch) {
  const hostname = hostnameMatch[1];
  console.log(`   Hostname: ${hostname}`);
}

// Test connection with minimal options
console.log('\n🔄 Testing MongoDB Connection...');

const connectionOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000
};

console.log('   Connection options:', JSON.stringify(connectionOptions, null, 2));

mongoose.connect(uri, connectionOptions)
  .then(async () => {
    console.log('✅ MongoDB connection successful!');
    
    // Test basic operations
    console.log('\n🧪 Testing Basic Operations...');
    
    try {
      // Test ping
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - pingStart;
      console.log(`   ✅ Ping test: ${pingTime}ms`);
      
      // Test list collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`   ✅ Collections found: ${collections.length}`);
      
      console.log('\n🎉 Connection test passed!');
      
    } catch (error) {
      console.error('   ❌ Basic operation test failed:', error.message);
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully');
    process.exit(0);
    
  })
  .catch((error) => {
    console.error('\n❌ MongoDB connection failed!');
    console.error('\n🔍 Error Analysis:');
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('   Error Type: Server Selection Error');
      console.error('   This usually means:');
      console.error('     • Your IP address is not whitelisted in MongoDB Atlas');
      console.error('     • Network connectivity issues');
      console.error('     • Atlas cluster is down or paused');
    } else if (error.name === 'MongoParseError') {
      console.error('   Error Type: URI Parse Error');
      console.error('   This means your MONGODB_URI format is incorrect');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   Error Type: DNS Resolution Error');
      console.error('   This means the hostname cannot be resolved');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   Error Type: Connection Timeout');
      console.error('   This usually means:');
      console.error('     • Your IP address is not whitelisted');
      console.error('     • Firewall blocking the connection');
    }
    
    console.error('\n📋 Error Details:');
    console.error(`   Name: ${error.name}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    
    console.error('\n🛠️  Immediate Action Required:');
    console.error('   1. Add your IP address 103.196.28.171 to MongoDB Atlas Network Access');
    console.error('   2. Go to: https://cloud.mongodb.com');
    console.error('   3. Select cluster: wt-project');
    console.error('   4. Click "Network Access" → "Add IP Address"');
    console.error('   5. Add IP: 103.196.28.171');
    console.error('   6. Click "Confirm"');
    console.error('\nAfter whitelisting, restart your backend server!');
    
    process.exit(1);
  });

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('✅ Connection closed');
  }
  process.exit(0);
});

