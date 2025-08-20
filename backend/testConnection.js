#!/usr/bin/env node

/**
 * MongoDB Connection Test Script
 * This script helps diagnose MongoDB connection issues
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');

console.log('🔍 MongoDB Connection Diagnostic Tool');
console.log('=====================================\n');

// Check environment variables
console.log('📋 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'EXISTS' : 'MISSING'}`);
console.log(`   PORT: ${process.env.PORT || 'not set'}`);

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

// Test connection with detailed options
console.log('\n🔄 Testing MongoDB Connection...');

const connectionOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 5,
  minPoolSize: 1,
  retryReads: true
};

console.log('   Connection options:', JSON.stringify(connectionOptions, null, 2));

mongoose.connect(uri, connectionOptions)
  .then(async () => {
    console.log('✅ MongoDB connection successful!');
    
    // Test database operations
    console.log('\n🧪 Testing Database Operations...');
    
    try {
      // Test ping
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - pingStart;
      console.log(`   ✅ Ping test: ${pingTime}ms`);
      
      // Test list collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`   ✅ Collections found: ${collections.length}`);
      
      // Test a simple query
      const stats = await mongoose.connection.db.stats();
      console.log(`   ✅ Database stats: ${stats.collections} collections, ${stats.dataSize} bytes`);
      
      console.log('\n🎉 All database tests passed!');
      
    } catch (error) {
      console.error('   ❌ Database operation test failed:', error.message);
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
      console.error('     • Firewall blocking the connection');
    } else if (error.name === 'MongoParseError') {
      console.error('   Error Type: URI Parse Error');
      console.error('   This means your MONGODB_URI format is incorrect');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   Error Type: DNS Resolution Error');
      console.error('   This means the hostname cannot be resolved');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Error Type: Connection Refused');
      console.error('   This means the server is not accepting connections');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   Error Type: Connection Timeout');
      console.error('   This means the connection took too long');
    }
    
    console.error('\n📋 Error Details:');
    console.error(`   Name: ${error.name}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    
    if (error.reason) {
      console.error('\n🔍 Connection Reason:');
      console.error(`   Type: ${error.reason.type}`);
      console.error(`   Servers: ${error.reason.servers ? error.reason.servers.size : 'N/A'}`);
    }
    
    console.error('\n🛠️  Troubleshooting Steps:');
    console.error('   1. Check if your IP is whitelisted in MongoDB Atlas');
    console.error('   2. Verify your Atlas cluster is running (not paused)');
    console.error('   3. Check your internet connection');
    console.error('   4. Verify the MONGODB_URI in config.env');
    console.error('   5. Try connecting from a different network');
    
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
