// URL Configuration Utility
// Centralized management of all application URLs

export interface URLConfig {
  apiUrl: string;
  socketUrl: string;
  meetingUrl: string;
  frontendUrl: string;
  environment: string;
}

// Development configuration
export const devConfig: URLConfig = {
  apiUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
  meetingUrl: import.meta.env.VITE_MEETING_URL || 'http://localhost:5000',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:8083',
  environment: 'development'
};

// Production configuration
export const prodConfig: URLConfig = {
  apiUrl: 'https://inspiranet-backend.onrender.com',
  socketUrl: 'https://inspiranet-backend.onrender.com',
  meetingUrl: 'https://inspiranet-backend.onrender.com',
  frontendUrl: 'https://inspiranet.onrender.com',
  environment: 'production'
};

// Staging configuration
export const stagingConfig: URLConfig = {
  apiUrl: import.meta.env.VITE_BACKEND_URL || 'https://inspiranet-backend-staging.onrender.com',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'https://inspiranet-backend-staging.onrender.com',
  meetingUrl: import.meta.env.VITE_MEETING_URL || 'https://inspiranet-backend-staging.onrender.com',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'https://inspiranet-staging.onrender.com',
  environment: 'staging'
};

// Get current configuration based on environment
export const getCurrentConfig = (): URLConfig => {
  const mode = import.meta.env.MODE;
  const env = import.meta.env.VITE_ENVIRONMENT || mode;
  
  switch (env) {
    case 'development':
      return devConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
    default:
      return prodConfig;
  }
};

// Get specific URL by type
export const getUrl = (type: keyof URLConfig): string => {
  const config = getCurrentConfig();
  return config[type];
};

// Get appropriate backend URL based on current environment
export const getBackendUrl = (): string => {
  return getUrl('apiUrl');
};

// Get appropriate socket URL based on current environment
export const getSocketUrl = (): string => {
  return getUrl('socketUrl');
};

// Get appropriate meeting URL based on current environment
export const getMeetingUrl = (): string => {
  return getUrl('meetingUrl');
};

// Validate URL configuration
export const validateConfig = (): boolean => {
  const config = getCurrentConfig();
  const requiredUrls = ['apiUrl', 'socketUrl', 'meetingUrl'];
  
  for (const url of requiredUrls) {
    if (!config[url as keyof URLConfig]) {
      console.error(`Missing required URL configuration: ${url}`);
      return false;
    }
  }
  
  return true;
};

// Export default configuration
export default getCurrentConfig();
