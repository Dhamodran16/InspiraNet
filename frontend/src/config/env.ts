// Environment configuration
import { productionConfig, validateProductionConfig } from './production';

const isProduction = import.meta.env.PROD;

// Use production config in production mode, fallback to development values
const config = isProduction ? {
  backendUrl: productionConfig.backendUrl,
  frontendUrl: productionConfig.frontendUrl,
  socketUrl: productionConfig.socketUrl,
  environment: 'production',
} : {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:8084',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
  environment: import.meta.env.MODE || 'development',
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
