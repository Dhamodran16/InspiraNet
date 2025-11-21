import { api } from './api';

export interface GoogleMeetRoom {
  room_id: string;
  room_name: string;
  meet_link: string;
  host_name: string;
  description?: string;
  scheduled_for?: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  current_participants: number;
  max_participants: number;
  room_url: string;
  is_host: boolean;
}

export interface CreateRoomData {
  room_name: string;
  meet_link: string;
  description?: string;
  scheduled_for?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface UpdateRoomData extends CreateRoomData {}

export interface RoomsResponse {
  success: boolean;
  rooms: GoogleMeetRoom[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_rooms: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface RoomResponse {
  success: boolean;
  room: GoogleMeetRoom;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

class GoogleMeetApiService {
  private baseUrl = '/api/google-meet';

  // Create a new Google Meet room
  async createRoom(data: CreateRoomData): Promise<RoomResponse> {
    const response = await api.post(`${this.baseUrl}/create-room`, data);
    return response.data;
  }

  // Get all rooms with optional filters
  async getRooms(params?: {
    search?: string;
    host_only?: boolean;
    limit?: number;
    page?: number;
  }): Promise<RoomsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.search) queryParams.append('search', params.search);
    if (params?.host_only) queryParams.append('host_only', 'true');
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());

    const response = await api.get(`${this.baseUrl}/rooms?${queryParams.toString()}`);
    return response.data;
  }

  // Get a specific room by ID
  async getRoom(roomId: string): Promise<RoomResponse> {
    const response = await api.get(`${this.baseUrl}/rooms/${roomId}`);
    return response.data;
  }

  // Update a room (host only)
  async updateRoom(roomId: string, data: UpdateRoomData): Promise<RoomResponse> {
    const response = await api.put(`${this.baseUrl}/rooms/${roomId}`, data);
    return response.data;
  }

  // Delete a room (host only)
  async deleteRoom(roomId: string): Promise<ApiResponse> {
    const response = await api.delete(`${this.baseUrl}/rooms/${roomId}`);
    return response.data;
  }

  // Join a room
  async joinRoom(roomId: string): Promise<RoomResponse> {
    const response = await api.post(`${this.baseUrl}/rooms/${roomId}/join`);
    return response.data;
  }

  // Leave a room
  async leaveRoom(roomId: string): Promise<ApiResponse> {
    const response = await api.post(`${this.baseUrl}/rooms/${roomId}/leave`);
    return response.data;
  }

  // Get room statistics (host only)
  async getRoomStats(roomId: string): Promise<{
    success: boolean;
    stats: {
      room_id: string;
      room_name: string;
      current_participants: number;
      max_participants: number;
      created_at: string;
      total_views: number;
      is_active: boolean;
    };
  }> {
    const response = await api.get(`${this.baseUrl}/rooms/${roomId}/stats`);
    return response.data;
  }

  // Search rooms
  async searchRooms(query: string, filters?: {
    host_only?: boolean;
    limit?: number;
    page?: number;
  }): Promise<RoomsResponse> {
    return this.getRooms({
      search: query,
      ...filters
    });
  }

  // Get rooms by host
  async getHostRooms(limit?: number, page?: number): Promise<RoomsResponse> {
    return this.getRooms({
      host_only: true,
      limit,
      page
    });
  }

  // Get public rooms
  async getPublicRooms(limit?: number, page?: number): Promise<RoomsResponse> {
    return this.getRooms({
      host_only: false,
      limit,
      page
    });
  }

  // Validate Google Meet URL
  validateMeetUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('meet.google.com');
    } catch {
      return false;
    }
  }

  // Format Google Meet URL
  formatMeetUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('meet.google.com')) {
        return urlObj.toString();
      }
      throw new Error('Invalid Google Meet URL');
    } catch {
      throw new Error('Invalid URL format');
    }
  }
}

export const googleMeetApi = new GoogleMeetApiService();
export default googleMeetApi;
