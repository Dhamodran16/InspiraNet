import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, removeAuthToken } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { getBackendUrl } from '../utils/urlConfig';

// 🚀 Dynamic API base URL based on environment
const API_BASE_URL = getBackendUrl();

// API service configuration
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL, // Use the dynamic URL from urlConfig
  timeout: 60000, // Increased to 60s to handle slower backend responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If FormData is being sent, remove Content-Type header to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Check if this is a token refresh request to avoid infinite loops
      if (originalRequest._retry) {
        // Token refresh failed, redirect to login
        removeAuthToken();
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });

        // Redirect to login page
        window.location.href = '/signin';
        return Promise.reject(error);
      }

      // Try to refresh token
      try {
        originalRequest._retry = true;
        const token = getAuthToken();

        if (token) {
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (refreshResponse.data.token) {
            // Store new token
            localStorage.setItem('authToken', refreshResponse.data.token);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }

      // If refresh fails, remove token and redirect
      removeAuthToken();
      toast({
        title: "Authentication Failed",
        description: "Please log in again.",
        variant: "destructive",
      });

      window.location.href = '/signin';
    }

    // Handle other errors
    if (error.response?.status === 403) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to perform this action.",
        variant: "destructive",
      });
    } else if (error.response?.status >= 500) {
      if (error.response?.status === 503) {
        // Check if it's a database-specific error
        const responseData = error.response.data as any;
        if (responseData?.database?.readyState === 0) {
          toast({
            title: "Database Disconnected",
            description: "Database connection has been lost. Please try again in a few moments.",
            variant: "destructive",
          });
        } else if (responseData?.database?.readyState === 2) {
          toast({
            title: "Database Connecting",
            description: "Database is establishing connection. Please try again in a few moments.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Service Temporarily Unavailable",
            description: "Our database is currently unavailable. Please try again in a few moments.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Server Error",
          description: "Something went wrong on our end. Please try again later.",
          variant: "destructive",
        });
      }
    } else if (error.code === 'ECONNABORTED') {
      toast({
        title: "Request Timeout",
        description: "The request took too long. Please try again.",
        variant: "destructive",
      });
    }

    return Promise.reject(error);
  }
);

// Helper function for making authenticated requests
export const makeAuthenticatedRequest = async <T>(
  config: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api(config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('No authentication token found');
      }
      throw new Error(error.response?.data?.error || error.message);
    }
    throw error;
  }
};

// Helper function for handling file uploads
export const uploadFile = async (
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Upload failed');
    }
    throw error;
  }
};

// Helper function to fetch user stats
export const getUserStats = async (userId: string): Promise<any> => {
  try {
    const response = await api.get(`/api/users/${userId}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};

// Helper function to check server health
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/api/health');
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

// ===== NETWORKING & FOLLOW SYSTEM =====

// Get users directory with filters
export const getUsersDirectory = async (params: {
  page?: number;
  search?: string;
  batch?: string;
  department?: string;
  type?: string;
}): Promise<any> => {
  try {
    const response = await api.get('/api/follows/users', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching users directory:', error);
    throw error;
  }
};

// Send follow request
export const sendFollowRequest = async (userId: string): Promise<any> => {
  try {
    const response = await api.post(`/api/follows/request/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error sending follow request:', error);
    throw error;
  }
};

// Follow user directly
export const followUser = async (userId: string): Promise<any> => {
  try {
    // Backend expects /request/:userId for initiating follow
    const response = await api.post(`/api/follows/request/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

// Unfollow user
export const unfollowUser = async (userId: string): Promise<any> => {
  try {
    const response = await api.delete(`/api/follows/unfollow/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
};

// Accept follow request - requestId is the _id of the FollowRequest document
export const acceptFollowRequest = async (requestId: string): Promise<any> => {
  try {
    // Backend route: POST /api/follows/accept/:requestId
    const response = await api.post(`/api/follows/accept/${requestId}`);
    return response.data;
  } catch (error) {
    console.error('Error accepting follow request:', error);
    throw error;
  }
};

// Reject follow request
export const rejectFollowRequest = async (requestId: string): Promise<any> => {
  try {
    // Backend route: POST /api/follows/reject/:requestId
    const response = await api.post(`/api/follows/reject/${requestId}`);
    return response.data;
  } catch (error) {
    console.error('Error rejecting follow request:', error);
    throw error;
  }
};

// Cancel follow request
export const cancelFollowRequest = async (requestId: string): Promise<any> => {
  try {
    const response = await api.delete(`/api/follows/request/${requestId}`);
    return response.data;
  } catch (error) {
    console.error('Error cancelling follow request:', error);
    throw error;
  }
};

// Get follow requests
export const getFollowRequests = async (): Promise<any> => {
  try {
    // Get all types of follow requests
    const [pending, sent, accepted] = await Promise.all([
      api.get('/api/follows/pending'),
      api.get('/api/follows/sent'),
      api.get('/api/follows/accepted')
    ]);

    return {
      data: [
        ...(pending.data.requests || []),
        ...(sent.data.requests || []),
        ...(accepted.data.requests || [])
      ]
    };
  } catch (error) {
    console.error('Error fetching follow requests:', error);
    throw error;
  }
};

// Get pending follow requests (incoming)
export const getPendingFollowRequests = async (): Promise<any> => {
  try {
    const response = await api.get('/api/follows/pending');
    return response.data;
  } catch (error) {
    console.error('Error fetching pending follow requests:', error);
    throw error;
  }
};

// Get sent follow requests (outgoing)
export const getSentFollowRequests = async (): Promise<any> => {
  try {
    const response = await api.get('/api/follows/sent');
    return response.data;
  } catch (error) {
    console.error('Error fetching sent follow requests:', error);
    throw error;
  }
};

// Get accepted connections for messaging
export const getAcceptedConnections = async () => {
  try {
    const response = await api.get('/api/follows/connections/accepted');
    return response.data;
  } catch (error) {
    console.error('Error fetching accepted connections:', error);
    throw error;
  }
};

// Get mutual connections
export const getMutualConnections = async (userId: string): Promise<any> => {
  try {
    const response = await api.get(`/api/follows/mutual/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching mutual connections:', error);
    throw error;
  }
};

// ===== MESSAGING SYSTEM =====

// Get conversations (only with mutually followed users)
export const getConversations = async (): Promise<any> => {
  try {
    const response = await api.get('/api/conversations');
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

// Create new conversation
export const createConversation = async (participantId: string): Promise<any> => {
  try {
    const response = await api.post('/api/conversations', { participantId });
    return response.data;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

// Get messages for a conversation
export const getMessages = async (conversationId: string, page = 1, limit = 50): Promise<any> => {
  try {
    const response = await api.get(`/api/messages/conversations/${conversationId}/messages`, {
      params: { page, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

// Send message
export const sendMessage = async (conversationId: string, content: string, messageType = 'text', mediaUrl?: string): Promise<any> => {
  try {
    const response = await api.post(`/api/messages/conversations/${conversationId}/messages`, {
      content,
      messageType,
      mediaUrl
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string): Promise<any> => {
  try {
    const response = await api.patch(`/api/conversations/${conversationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// ===== NOTIFICATIONS SYSTEM =====

// Get notifications
export const getNotifications = async (params: {
  page?: number;
  limit?: number;
  category?: string;
  priority?: string;
  unreadOnly?: boolean;
}): Promise<any> => {
  try {
    const response = await api.get('/api/notifications', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (): Promise<any> => {
  try {
    const response = await api.get('/api/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<any> => {
  try {
    const response = await api.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<any> => {
  try {
    const response = await api.patch('/api/notifications/mark-all-read');
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (preferences: any): Promise<any> => {
  try {
    const response = await api.put('/api/notifications/preferences', preferences);
    return response.data;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

// Get notification preferences
export const getNotificationPreferences = async (): Promise<any> => {
  try {
    const response = await api.get('/api/notifications/preferences');
    return response.data;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }
};

// ===== USER PROFILE & SETTINGS =====

// Get user profile
export const getUserProfile = async (userId: string): Promise<any> => {
  try {
    const response = await api.get(`/api/users/${userId}/profile`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (profileData: any): Promise<any> => {
  try {
    const response = await api.put('/api/users/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Update user settings
export const updateUserSettings = async (settings: any): Promise<any> => {
  try {
    const response = await api.put('/api/users/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};

// ===== FILE UPLOAD =====

// Upload avatar
export const uploadAvatar = async (file: File, onProgress?: (progress: number) => void): Promise<any> => {
  return uploadFile('/api/users/avatar', file, onProgress);
};

// Upload resume
export const uploadResume = async (file: File, onProgress?: (progress: number) => void): Promise<any> => {
  return uploadFile('/api/users/resume', file, onProgress);
};

// Upload portfolio
export const uploadPortfolio = async (file: File, onProgress?: (progress: number) => void): Promise<any> => {
  return uploadFile('/api/users/portfolio', file, onProgress);
};

export default api;
