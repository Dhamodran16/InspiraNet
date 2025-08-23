// Environment configuration
import { productionConfig, validateProductionConfig } from './production';

const isProduction = import.meta.env.PROD;

// Use production config in production mode, fallback to development values
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://inspiranet-backend.onrender.com',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'https://inspiranet-backend.onrender.com',
  meetingUrl: import.meta.env.VITE_MEETING_URL || 'https://inspiranet-backend.onrender.com',
  environment: import.meta.env.MODE || 'production'
};

// Validate production config on app startup
if (isProduction) {
  validateProductionConfig();
}

// Helper function to get authentication headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (!token) {
    console.warn('No auth token found in localStorage');
  }
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Export configuration
export default config;