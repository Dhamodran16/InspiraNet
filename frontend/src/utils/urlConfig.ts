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
  apiUrl: 'http://localhost:5000',
  socketUrl: 'http://localhost:5000',
  meetingUrl: 'http://localhost:5000',
  frontendUrl: 'http://localhost:8083',
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

// Get current configuration based on environment
export const getCurrentConfig = (): URLConfig => {
  const isDev = import.meta.env.MODE === 'development';
  return isDev ? devConfig : prodConfig;
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

// Export default configuration
export default getCurrentConfig();
