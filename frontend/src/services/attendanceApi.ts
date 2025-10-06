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
  const response = await api.get(`/api/meetings/${meetingId}/attendance/pdf`, { responseType: 'blob' as any });
  return response.data as Blob;
};

export const logJoin = async (meetingId: string, payload: { email: string; name?: string }) => {
  const response = await api.post(`/api/meetings/${meetingId}/log-join`, payload);
  return response.data;
};

export const logLeave = async (meetingId: string, payload: { email: string; name?: string }) => {
  const response = await api.post(`/api/meetings/${meetingId}/log-leave`, payload);
  return response.data;
};


