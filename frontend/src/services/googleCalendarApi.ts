import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Create axios instance for Google Calendar API calls
const googleCalendarApi = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
googleCalendarApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
googleCalendarApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.response?.status, error.message);
    
    // Handle specific error types
    if (error.response?.status === 401) {
      console.error('Authentication failed - token may be expired');
    } else if (error.response?.status === 403) {
      console.error('Access forbidden - insufficient permissions or Google Calendar not connected');
    } else if (error.response?.status === 404) {
      console.error('API endpoint not found - check backend URL');
    } else if (error.code === 'ERR_NAME_NOT_RESOLVED') {
      console.error('Cannot resolve backend URL - check network connection');
    }
    
    return Promise.reject(error);
  }
);

// Types
export interface Meeting {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  meet_link: string;
  event_link?: string;
  calendar_link?: string;
  host_id?: string;
  host_name: string;
  host_email: string;
  status: 'active' | 'deleted' | 'cancelled';
  meeting_status: 'upcoming' | 'active' | 'past' | 'deleted' | 'cancelled';
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  created_at: string;
  updated_at?: string;
}

export interface CreateMeetingData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  attendees?: Array<{
    email: string;
    name?: string;
  }>;
  settings?: {
    allowJoinBeforeHost?: boolean;
    muteOnEntry?: boolean;
    recordMeeting?: boolean;
  };
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

// Google OAuth 2.0
export const getGoogleAuthUrl = async (): Promise<string> => {
  try {
    const response = await googleCalendarApi.get('/auth/google');
    return response.data.authUrl;
  } catch (error) {
    console.error('Error getting Google auth URL:', error);
    throw error;
  }
};

export const handleGoogleCallback = async (code: string): Promise<GoogleTokens> => {
  const response = await googleCalendarApi.post('/auth/google/callback', { code });
  return response.data.tokens;
};

export const refreshGoogleTokens = async (refreshToken: string): Promise<GoogleTokens> => {
  const response = await googleCalendarApi.post('/auth/refresh-token', { refresh_token: refreshToken });
  return response.data.tokens;
};

export const validateGoogleConnection = async (): Promise<boolean> => {
  try {
    const response = await googleCalendarApi.get('/auth/validate');
    return response.data.connected;
  } catch (error) {
    console.error('Error validating Google connection:', error);
    return false;
  }
};

// Meeting Management
export const createMeeting = async (meetingData: CreateMeetingData): Promise<Meeting> => {
  try {
    const response = await googleCalendarApi.post('/create-meeting', meetingData);
    return response.data.meeting;
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }
};

// Simple meeting creation for testing (without Google Calendar)
export const createSimpleMeeting = async (meetingData: CreateMeetingData): Promise<Meeting> => {
  try {
    // Try the new route first, fallback to existing route
    const response = await googleCalendarApi.post('/create-simple-meeting', meetingData);
    return response.data.meeting;
  } catch (error) {
    console.error('Error creating simple meeting:', error);
    // Fallback to existing route if new route doesn't exist
    try {
      const response = await googleCalendarApi.post('/create-meeting', meetingData);
      return response.data.meeting;
    } catch (fallbackError) {
      console.error('Error with fallback route:', fallbackError);
      throw fallbackError;
    }
  }
};

export const getMeetings = async (): Promise<Meeting[]> => {
  try {
    const response = await googleCalendarApi.get('/meetings');
    return response.data.meetings;
  } catch (error) {
    console.error('Error getting meetings:', error);
    throw error;
  }
};

export const getMeeting = async (id: string): Promise<Meeting> => {
  const response = await googleCalendarApi.get(`/meetings/${id}`);
  return response.data.meeting;
};

export const deleteMeeting = async (id: string): Promise<void> => {
  try {
    const response = await googleCalendarApi.delete(`/delete-meeting/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting meeting:', error);
    throw error;
  }
};

export const updateMeetingStatus = async (id: string, status: 'active' | 'cancelled' | 'deleted'): Promise<Meeting> => {
  const response = await googleCalendarApi.patch(`/meetings/${id}/status`, { status });
  return response.data.meeting;
};

// Utility functions
export const formatMeetingTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
};

export const isMeetingUpcoming = (meeting: Meeting): boolean => {
  return meeting.meeting_status === 'upcoming';
};

export const isMeetingActive = (meeting: Meeting): boolean => {
  return meeting.meeting_status === 'active';
};

export const isMeetingPast = (meeting: Meeting): boolean => {
  return meeting.meeting_status === 'past';
};

export const getMeetingDuration = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  
  if (durationMinutes < 60) {
    return `${durationMinutes} minutes`;
  } else {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

export default googleCalendarApi;
