// Debug script to check current URL configuration
// Run this in browser console to see what URLs are being used

console.log('🔍 InspiraNet URL Configuration Debug');
console.log('=====================================');

// Check environment variables
console.log('Environment Variables:');
console.log('- VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
console.log('- VITE_SOCKET_URL:', import.meta.env.VITE_SOCKET_URL);
console.log('- VITE_MEETING_URL:', import.meta.env.VITE_MEETING_URL);
console.log('- VITE_FRONTEND_URL:', import.meta.env.VITE_FRONTEND_URL);
console.log('- VITE_ENVIRONMENT:', import.meta.env.VITE_ENVIRONMENT);
console.log('- MODE:', import.meta.env.MODE);

// Check current location
console.log('\nCurrent Location:');
console.log('- URL:', window.location.href);
console.log('- Origin:', window.location.origin);
console.log('- Hostname:', window.location.hostname);

// Test API endpoints
console.log('\nTesting API Endpoints:');

// Test backend health
fetch('https://inspiranet-backend.onrender.com/health')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Backend Health:', data);
  })
  .catch(err => {
    console.log('❌ Backend Health Error:', err.message);
  });

// Test config endpoints
fetch('https://inspiranet-backend.onrender.com/api/config/departments')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Departments API:', data);
  })
  .catch(err => {
    console.log('❌ Departments API Error:', err.message);
  });

// Test current frontend API calls
fetch('/api/config/departments')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Frontend API Call:', data);
  })
  .catch(err => {
    console.log('❌ Frontend API Call Error:', err.message);
  });

console.log('\n🎯 Expected Results:');
console.log('- Backend should be accessible');
console.log('- Frontend API calls should fail (404)');
console.log('- Environment variables should be set correctly');
