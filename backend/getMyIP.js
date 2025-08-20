#!/usr/bin/env node

/**
 * Get Current IP Address Script
 * This script helps you get your current public IP address for MongoDB Atlas whitelisting
 */

const https = require('https');

console.log('🌐 Getting your current public IP address...\n');

// Function to get IP from multiple services
const getIPFromService = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
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
};

// Try multiple IP services
const ipServices = [
  'https://ipinfo.io/ip',
  'https://icanhazip.com/',
  'https://ifconfig.me/ip',
  'https://checkip.amazonaws.com/'
];

async function getCurrentIP() {
  for (const service of ipServices) {
    try {
      console.log(`🔍 Trying ${service}...`);
      const ip = await getIPFromService(service);
      console.log(`✅ Your current public IP address is: ${ip}`);
      console.log('\n📋 Next Steps:');
      console.log('1. Go to MongoDB Atlas: https://cloud.mongodb.com');
      console.log('2. Select your cluster: wt-project');
      console.log('3. Click "Network Access" in the left sidebar');
      console.log('4. Click "Add IP Address"');
      console.log(`5. Add this IP: ${ip}`);
      console.log('6. Click "Confirm"');
      console.log('\nAfter whitelisting, restart your backend server!');
      return;
    } catch (error) {
      console.log(`❌ Failed to get IP from ${service}: ${error.message}`);
    }
  }
  
  console.log('❌ All IP services failed. Please visit:');
  console.log('   https://whatismyipaddress.com/');
  console.log('   or');
  console.log('   https://ipinfo.io/');
}

getCurrentIP().catch(console.error);

