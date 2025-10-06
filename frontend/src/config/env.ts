// Environment configuration
import { productionConfig, validateProductionConfig } from './production';

const isProduction = import.meta.env.PROD;

// Use proper environment-based configuration
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:5000' : 'https://inspiranet-backend.onrender.com'),
  socketUrl: import.meta.env.VITE_SOCKET_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:5000' : 'https://inspiranet-backend.onrender.com'),
  meetingUrl: import.meta.env.VITE_MEETING_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:5000' : 'https://inspiranet-backend.onrender.com'),
  environment: import.meta.env.MODE || 'development'
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