#!/usr/bin/env node

/**
 * DNS Resolution Test with Multiple DNS Servers
 * This script tests DNS resolution using different DNS servers
 */

const dns = require('dns');

console.log('🔍 DNS Resolution Test with Multiple DNS Servers');
console.log('================================================\n');

const hostname = 'wt-project.zr3ux3r.mongodb.net';

// Different DNS servers to test
const dnsServers = [
  { name: 'Google DNS', servers: ['8.8.8.8', '8.8.4.4'] },
  { name: 'Cloudflare DNS', servers: ['1.1.1.1', '1.0.0.1'] },
  { name: 'OpenDNS', servers: ['208.67.222.222', '208.67.220.220'] },
  { name: 'Quad9 DNS', servers: ['9.9.9.9', '149.112.112.112'] },
  { name: 'System Default', servers: [] }
];

async function testDNSWithServer(dnsServer, serverIPs) {
  console.log(`\n🔍 Testing with ${dnsServer}:`);
  
  if (serverIPs.length > 0) {
    // Test with specific DNS servers
    for (const ip of serverIPs) {
      try {
        console.log(`   📡 Using DNS server: ${ip}`);
        dns.setServers([ip]);
        
        const addresses = await new Promise((resolve, reject) => {
          dns.resolve4(hostname, (err, addresses) => {
            if (err) reject(err);
            else resolve(addresses);
          });
        });
        
        console.log(`   ✅ Success! IP addresses: ${addresses.join(', ')}`);
        return true;
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
  } else {
    // Test with system default DNS
    try {
      console.log(`   📡 Using system default DNS`);
      dns.setServers([]); // Reset to system default
      
      const addresses = await new Promise((resolve, reject) => {
        dns.resolve4(hostname, (err, addresses) => {
          if (err) reject(err);
          else resolve(addresses);
        });
      });
      
      console.log(`   ✅ Success! IP addresses: ${addresses.join(', ')}`);
      return true;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  return false;
}

async function main() {
  console.log(`🎯 Target hostname: ${hostname}\n`);
  
  let anySuccess = false;
  
  for (const dnsConfig of dnsServers) {
    const success = await testDNSWithServer(dnsConfig.name, dnsConfig.servers);
    if (success) {
      anySuccess = true;
      break; // Stop if we find a working DNS
    }
  }
  
  console.log('\n📋 Summary:');
  if (anySuccess) {
    console.log('   ✅ DNS resolution successful with at least one DNS server');
    console.log('   💡 MongoDB connection should work now');
    console.log('\n🔄 Next Steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test MongoDB connection again');
  } else {
    console.log('   ❌ All DNS servers failed to resolve the hostname');
    console.log('\n🚨 This indicates a deeper issue:');
    console.log('   • The MongoDB Atlas cluster might be paused or deleted');
    console.log('   • The hostname might be incorrect');
    console.log('   • There might be a network-level block');
    console.log('\n🛠️  Immediate Actions:');
    console.log('   1. Check MongoDB Atlas cluster status');
    console.log('   2. Verify the connection string in Atlas');
    console.log('   3. Try connecting from a different network');
    console.log('   4. Contact MongoDB Atlas support if needed');
  }
}

main().catch(console.error);

