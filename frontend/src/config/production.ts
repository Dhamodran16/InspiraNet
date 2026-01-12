// Production Environment Configuration
// This file contains production-specific settings and fallbacks

interface ProductionConfig {
  backendUrl: string;
  frontendUrl: string;
  socketUrl: string;
  meetingUrl: string;
  // 🚀 Dev Tunnel URL for external access
  devTunnelUrl: string;
  cloudinary: {
    cloudName: string;
    uploadPreset: string;
  };
  features: {
    notifications: boolean;
    sockets: boolean;
    pushNotifications: boolean;
  };
  api: {
    timeout: number;
    retryAttempts: number;
  };
  environment: string;
}

// Validate and get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Environment variable ${key} not set, using fallback: ${fallback}`);
    return fallback;
  }
  return value;
};

const getBoolEnvVar = (key: string, fallback: boolean): boolean => {
  const value = import.meta.env[key];
  if (value === undefined) {
    console.warn(`Environment variable ${key} not set, using fallback: ${fallback}`);
    return fallback;
  }
  return value === 'true';
};

const getNumberEnvVar = (key: string, fallback: number): number => {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Environment variable ${key} not set, using fallback: ${fallback}`);
    return fallback;
  }
  const num = parseInt(value, 10);
  return isNaN(num) ? fallback : num;
};

export const productionConfig: ProductionConfig = {
  backendUrl: getEnvVar('VITE_BACKEND_URL', 'http://localhost:5000'),
  frontendUrl: getEnvVar('VITE_FRONTEND_URL', 'http://localhost:8083'),
  socketUrl: getEnvVar('VITE_SOCKET_URL', getEnvVar('VITE_BACKEND_URL', 'http://localhost:5000')),
  meetingUrl: getEnvVar('VITE_MEETING_URL', getEnvVar('VITE_BACKEND_URL', 'http://localhost:5000')),

  cloudinary: {
    cloudName: getEnvVar('VITE_CLOUDINARY_CLOUD_NAME', ''),
    uploadPreset: getEnvVar('VITE_CLOUDINARY_UPLOAD_PRESET', ''),
  },
  features: {
    notifications: getBoolEnvVar('VITE_ENABLE_NOTIFICATIONS', true),
    sockets: getBoolEnvVar('VITE_ENABLE_SOCKETS', true),
    pushNotifications: getBoolEnvVar('VITE_ENABLE_PUSH_NOTIFICATIONS', true),
  },
  api: {
    timeout: getNumberEnvVar('VITE_API_TIMEOUT', 30000),
    retryAttempts: getNumberEnvVar('VITE_API_RETRY_ATTEMPTS', 3),
  },
  environment: 'production'
};

// Validation function
export const validateProductionConfig = (): boolean => {
  const requiredVars = [
    'VITE_BACKEND_URL',
    'VITE_FRONTEND_URL',
    'VITE_SOCKET_URL',
    'VITE_MEETING_URL',
  ];

  const missingVars = requiredVars.filter(
    (key) => !import.meta.env[key]
  );

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    console.error('Please set these variables in your Vercel dashboard');
    return false;
  }

  return true;
};

// Export default config for backward compatibility
export default productionConfig;
