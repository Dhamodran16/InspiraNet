import api from './api';

export const completeMeeting = async (meetingId: string, conferenceId: string) => {
  const response = await api.post(`/api/meetings/${meetingId}/complete`, { conferenceId });
  return response.data;
};

export const getAttendance = async (meetingId: string) => {
  const response = await api.get(`/api/meetings/${meetingId}/attendance`);
  return response.data;
};

export const downloadAttendancePdf = async (meetingId: string): Promise<Blob> => {
  try {
    const response = await api.get(`/api/meetings/${meetingId}/attendance/pdf`, { 
      responseType: 'blob' as any 
    });
    
    // Check if the response is actually JSON (text) wrapped in a blob
    if (response.data instanceof Blob) {
      // Check if it's actually JSON by reading the first few bytes
      const text = await response.data.text();
      try {
        // Try to parse as JSON - if successful, it means we got JSON instead of binary
        const jsonData = JSON.parse(text);
        // If it's valid JSON, create a new blob from the text
        return new Blob([text], { type: 'application/json' });
      } catch {
        // If it's not JSON, return the blob as-is
        return response.data;
      }
    }
    
    return response.data as Blob;
  } catch (error: any) {
    console.error('Error downloading attendance PDF:', error);
    
    // If we get a blob response but it's actually a JSON error, try to parse it
    if (error.response && error.response.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const jsonError = JSON.parse(text);
        const errorMessage = jsonError.message || jsonError.error || 'Failed to download attendance PDF';
        console.error('Backend error:', errorMessage);
        throw new Error(errorMessage);
      } catch (parseError) {
        // If it's not JSON, check the status code
        if (error.response?.status === 400) {
          throw new Error('Bad request: Please check that the meeting exists and you have permission to download attendance.');
        } else if (error.response?.status === 403) {
          throw new Error('Access denied: Only the meeting host can download attendance.');
        } else if (error.response?.status === 404) {
          throw new Error('Meeting not found.');
        }
        // Re-throw the original error
        throw error;
      }
    }
    
    // Handle non-blob errors
    if (error.response?.data?.error || error.response?.data?.message) {
      throw new Error(error.response.data.message || error.response.data.error);
    }
    
    throw error;
  }
};

export const logJoin = async (meetingId: string, payload: { email: string; name?: string }) => {
  const response = await api.post(`/api/meetings/${meetingId}/log-join`, payload);
  return response.data;
};

export const logLeave = async (meetingId: string, payload: { email: string; name?: string }) => {
  const response = await api.post(`/api/meetings/${meetingId}/log-leave`, payload);
  return response.data;
};

