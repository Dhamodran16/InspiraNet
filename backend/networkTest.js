#!/usr/bin/env node

/**
 * Network Connectivity Test for MongoDB Atlas
 * This script tests basic network connectivity to MongoDB Atlas
 */

const dns = require('dns').promises;
const net = require('net');

console.log('🌐 Network Connectivity Test for MongoDB Atlas');
console.log('=============================================\n');

const hostname = 'wt-project.zr3ux3r.mongodb.net';
const port = 27017;

async function testConnectivity() {
  console.log(`🔍 Testing connectivity to: ${hostname}:${port}\n`);
  
  // Test 1: DNS Resolution
  console.log('1️⃣ DNS Resolution Test:');
  try {
    const addresses = await dns.resolve4(hostname);
    console.log(`   ✅ DNS resolution successful`);
    console.log(`   📍 IP Addresses: ${addresses.join(', ')}`);
  } catch (error) {
    console.log(`   ❌ DNS resolution failed: ${error.message}`);
    console.log(`   💡 This suggests a DNS or network configuration issue`);
    return false;
  }
  
  // Test 2: TCP Connection Test
  console.log('\n2️⃣ TCP Connection Test:');
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;
    
    socket.setTimeout(10000); // 10 second timeout
    
    socket.on('connect', () => {
      connected = true;
      console.log(`   ✅ TCP connection successful to ${hostname}:${port}`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`   ❌ TCP connection timeout to ${hostname}:${port}`);
      console.log(`   💡 This usually means your IP is not whitelisted`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (error) => {
      if (!connected) {
        console.log(`   ❌ TCP connection failed: ${error.message}`);
        if (error.code === 'ECONNREFUSED') {
          console.log(`   💡 Connection refused - server not accepting connections`);
        } else if (error.code === 'ENOTFOUND') {
          console.log(`   💡 Host not found - DNS resolution issue`);
        } else if (error.code === 'ETIMEDOUT') {
          console.log(`   💡 Connection timeout - likely IP whitelist issue`);
        }
      }
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, hostname);
  });
}

async function main() {
  const isConnectable = await testConnectivity();
  
  console.log('\n📋 Summary:');
  if (isConnectable) {
    console.log('   ✅ Network connectivity is working');
    console.log('   💡 MongoDB connection should work if credentials are correct');
  } else {
    console.log('   ❌ Network connectivity issues detected');
    console.log('\n🛠️  Troubleshooting Steps:');
    console.log('   1. Check if your IP 103.196.28.171 is whitelisted in MongoDB Atlas');
    console.log('   2. Go to: https://cloud.mongodb.com');
    console.log('   3. Select cluster: wt-project');
    console.log('   4. Click "Network Access" → "Add IP Address"');
    console.log('   5. Add IP: 103.196.28.171');
    console.log('   6. Click "Confirm"');
    console.log('   7. Wait 1-2 minutes for changes to take effect');
    console.log('   8. Try the connection test again');
  }
  
  console.log('\n🔍 Additional Checks:');
  console.log('   • Verify your MongoDB Atlas cluster is running (not paused)');
  console.log('   • Check if you have any firewall software blocking connections');
  console.log('   • Try connecting from a different network (mobile hotspot)');
}

main().catch(console.error);

