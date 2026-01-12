// URL Configuration Utility
// Centralized management of all application URLs

export interface URLConfig {
  apiUrl: string;
  socketUrl: string;
  meetingUrl: string;
  frontendUrl: string;
  environment: string;
}

const DEFAULT_BACKEND = 'http://localhost:5000';
const DEFAULT_FRONTEND = 'http://localhost:8083';

// Development configuration
export const devConfig: URLConfig = {
  apiUrl: import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND,
  socketUrl: import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND,
  meetingUrl: import.meta.env.VITE_MEETING_URL || import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND,
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || DEFAULT_FRONTEND,
  environment: 'development'
};

// Production configuration (uses same environment-driven URLs to support local hosting)
export const prodConfig: URLConfig = {
  apiUrl: import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND,
  socketUrl: import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND,
  meetingUrl: import.meta.env.VITE_MEETING_URL || import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND,
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || DEFAULT_FRONTEND,
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
