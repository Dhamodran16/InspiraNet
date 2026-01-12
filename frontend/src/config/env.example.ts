// Example Environment Configuration
// Copy this file to .env.local and update the values

export const exampleConfig = {
  // Backend API URL
  VITE_BACKEND_URL: 'http://localhost:5000',
  
  // Frontend URL
  VITE_FRONTEND_URL: 'http://localhost:8083',
  
  // Socket URL
  VITE_SOCKET_URL: 'http://localhost:5000',
  
  // API Configuration
  VITE_API_TIMEOUT: '10000',
  
  // Feature Flags
  VITE_ENABLE_NOTIFICATIONS: 'true',
  VITE_ENABLE_SOCKETS: 'true',
  VITE_ENABLE_PUSH_NOTIFICATIONS: 'true'
};

/*
To use this configuration:

1. Create a file named `.env.local` in your project root
2. Add the following lines (update values as needed):

VITE_BACKEND_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:8083
VITE_SOCKET_URL=http://localhost:5000
VITE_API_TIMEOUT=10000
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_SOCKETS=true
VITE_ENABLE_PUSH_NOTIFICATIONS=true

3. Restart your development server

Note: All environment variables must start with VITE_ to be accessible in the frontend.
*/
