#!/usr/bin/env node

/**
 * Deep MongoDB Connection Test Script
 * This script provides comprehensive diagnostics for MongoDB connection issues
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const https = require('https');
const dns = require('dns').promises;

console.log('🔍 Deep MongoDB Connection Diagnostic Tool');
console.log('==========================================\n');

// Function to get current IP
const getCurrentIP = async () => {
  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.get('https://checkip.amazonaws.com/', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data.trim()));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
    return response;
  } catch (error) {
    return 'Unable to determine IP';
  }
};

// Function to test DNS resolution
const testDNS = async (hostname) => {
  try {
    const addresses = await dns.resolve4(hostname);
    return { success: true, addresses };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Function to test network connectivity
const testNetworkConnectivity = async (hostname, port) => {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(10000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve({ success: true, message: 'Connection successful' });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, message: 'Connection timeout' });
    });
    
    socket.on('error', (error) => {
      resolve({ success: false, message: error.message });
    });
    
    socket.connect(port, hostname);
  });
};

async function runDeepDiagnostics() {
  console.log('📋 Environment Check:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'EXISTS' : 'MISSING'}`);
  console.log(`   PORT: ${process.env.PORT || 'not set'}`);
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in config.env');
    process.exit(1);
  }
  
  // Get current IP
  console.log('\n🌐 Network Information:');
  const currentIP = await getCurrentIP();
  console.log(`   Current Public IP: ${currentIP}`);
  
  // Parse MongoDB URI
  const uri = process.env.MONGODB_URI;
  console.log(`\n🔗 MongoDB URI Analysis:`);
  console.log(`   Protocol: ${uri.startsWith('mongodb+srv://') ? '✅ mongodb+srv://' : '❌ Invalid protocol'}`);
  console.log(`   Has username: ${uri.includes('@') ? '✅ Yes' : '❌ No'}`);
  console.log(`   Has database: ${uri.includes('/infranet') ? '✅ Yes' : '❌ No'}`);
  
  // Extract hostname from URI
  const hostnameMatch = uri.match(/@([^/]+)/);
  if (hostnameMatch) {
    const hostname = hostnameMatch[1];
    console.log(`   Hostname: ${hostname}`);
    
    // Test DNS resolution
    console.log('\n🔍 DNS Resolution Test:');
    const dnsResult = await testDNS(hostname);
    if (dnsResult.success) {
      console.log(`   ✅ DNS resolution successful: ${dnsResult.addresses.join(', ')}`);
    } else {
      console.log(`   ❌ DNS resolution failed: ${dnsResult.error}`);
    }
    
    // Test network connectivity to port 27017
    console.log('\n🌐 Network Connectivity Test:');
    const networkResult = await testNetworkConnectivity(hostname, 27017);
    if (networkResult.success) {
      console.log(`   ✅ Network connectivity to ${hostname}:27017 successful`);
    } else {
      console.log(`   ❌ Network connectivity to ${hostname}:27017 failed: ${networkResult.message}`);
    }
  }
  
  // Test MongoDB connection with detailed options
  console.log('\n🔄 Testing MongoDB Connection...');
  
  const connectionOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    family: 4,
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 1,
    minPoolSize: 1,
    retryReads: true
    // Removed unsupported options: keepAlive, keepAliveInitialDelay, autoReconnect
  };
  
  console.log('   Connection options:', JSON.stringify(connectionOptions, null, 2));
  
  // Set up connection event listeners for detailed monitoring
  mongoose.connection.on('connecting', () => {
    console.log('   🔄 Connecting...');
  });
  
  mongoose.connection.on('connected', () => {
    console.log('   ✅ Connected successfully');
  });
  
  mongoose.connection.on('disconnected', () => {
    console.log('   ⚠️ Disconnected');
  });
  
  mongoose.connection.on('error', (error) => {
    console.log('   ❌ Connection error:', error.message);
  });
  
  try {
    await mongoose.connect(uri, connectionOptions);
    console.log('✅ MongoDB connection successful!');
    
    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (mongoose.connection.readyState === 1) {
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
      
    } else {
      console.log('⚠️ Connection not ready after 3 seconds');
      await mongoose.connection.close();
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ MongoDB connection failed!');
    console.error('\n🔍 Detailed Error Analysis:');
    
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
      console.error('   This usually means:');
      console.error('     • Your IP address is not whitelisted');
      console.error('     • Firewall blocking the connection');
      console.error('     • Network issues');
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
    
    console.error('\n🛠️  Immediate Action Required:');
    console.error(`   1. Add your IP address ${currentIP} to MongoDB Atlas Network Access`);
    console.error('   2. Go to: https://cloud.mongodb.com');
    console.error('   3. Select cluster: wt-project');
    console.error('   4. Click "Network Access" → "Add IP Address"');
    console.error('   5. Add IP: ' + currentIP);
    console.error('   6. Click "Confirm"');
    console.error('\nAfter whitelisting, restart your backend server!');
    
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('✅ Connection closed');
  }
  process.exit(0);
});

runDeepDiagnostics().catch(console.error);
