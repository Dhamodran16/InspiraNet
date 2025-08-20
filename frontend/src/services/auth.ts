const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  type: 'alumni' | 'student' | 'faculty';
  department?: string;
  personalEmail?: string;
}

export interface AuthResponse {
  message?: string;
  token: string;
  refreshToken: string;
  user: {
    _id: string;
    name: string;
    email: string;
    type: 'student' | 'alumni' | 'faculty';
    department?: string;
    company?: string;
    designation?: string;
    location?: string;
    experience?: string;
    bio?: string;
    professionalEmail?: string;
    avatar?: string;
    isVerified: boolean;
    batch?: string;
    isProfileComplete?: boolean;
    phone?: string;
    studentInfo?: any;
    alumniInfo?: any;
    facultyInfo?: any;
    skills?: string[];
    socialLinks?: any;
    resume?: string;
    portfolio?: string;
  };
}

export interface ProfileUpdateData {
  name?: string;
  batch?: string;
  department?: string;
  company?: string;
  designation?: string;
  location?: string;
  experience?: string;
  bio?: string;
  professionalEmail?: string;
}

class AuthService {
  private async makeRequest(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout to 15 seconds

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      
      // If unauthorized and we haven't retried yet, try to refresh token
      if (response.status === 401 && retryCount === 0) {
        try {
          await this.refreshToken();
          // Retry the request with new token
          return this.makeRequest(url, options, retryCount + 1);
        } catch (refreshError) {
          // If refresh fails, redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/';
          throw new Error('Session expired. Please log in again.');
        }
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - server may be down. Please check your connection.');
      }
      throw error;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Enhanced registration with MongoDB validation
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('🚀 Attempting user registration with data:', { ...data, password: '[HIDDEN]' });
      
      // Validate data before sending
      if (!data.name || !data.password || !data.type) {
        throw new Error('Missing required fields: name, password, and type are required');
      }

      if (data.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Type-specific validation
      if (data.type === 'student' && !data.department) {
        throw new Error('Students must provide department');
      }

      if (data.type === 'faculty' && (!data.department || !data.email)) {
        throw new Error('Faculty must provide department and email');
      }

      if (data.type === 'alumni' && !data.email) {
        throw new Error('Alumni must provide an email address');
      }

      // Enhanced email format validation
      if (data.email) {
        if (data.type === 'student') {
          // Students: name.yearDept@kongu.edu (e.g., boobalanj.23aim@kongu.edu)
          const studentEmailPattern = /^[a-zA-Z]+\.[0-9]{2}[a-z]+@kongu\.edu$/;
          if (!studentEmailPattern.test(data.email)) {
            throw new Error('Student email must follow format: name.yearDept@kongu.edu (e.g., boobalanj.23aim@kongu.edu)');
          }
        } else if (data.type === 'faculty') {
          // Faculty: name.dept@kongu.edu (e.g., boobalanj.aim@kongu.edu)
          const facultyEmailPattern = /^[a-zA-Z]+\.[a-z]+@kongu\.edu$/;
          if (!facultyEmailPattern.test(data.email)) {
            throw new Error('Faculty email must follow format: name.dept@kongu.edu (e.g., boobalanj.aim@kongu.edu)');
          }
        } else if (data.type === 'alumni') {
          // Alumni: any valid email (Gmail, Yahoo, etc.)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(data.email)) {
            throw new Error('Please enter a valid email address for alumni');
          }
        }
      }

      const response = await this.makeRequest(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      console.log('📡 Registration response:', response.status, responseData);

      if (!response.ok) {
        // Handle specific MongoDB errors
        if (responseData.error) {
          if (responseData.error.includes('already exists')) {
            throw new Error('User with this email already exists. Please try logging in instead.');
          }
          throw new Error(responseData.error);
        }
        throw new Error('Registration failed. Please check your information and try again.');
      }

      console.log('✅ Registration successful for user:', data.name);
      return responseData;
    } catch (error) {
      console.error('❌ Registration error:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }



  // Enhanced login with MongoDB user verification
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔐 Attempting user login with email:', credentials.email);
      
      // Validate input
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      if (!credentials.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      const response = await this.makeRequest(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const responseData = await response.json();
      console.log('📡 Login response:', response.status, responseData);

      if (!response.ok) {
        // Handle specific authentication errors
        if (response.status === 401) {
          if (responseData.error === 'Invalid email or password') {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          }
          throw new Error(responseData.error || 'Authentication failed');
        }
        
        if (response.status === 403) {
          if (responseData.error?.includes('expired') || responseData.error?.includes('deactivated')) {
            throw new Error('Your account access has expired. Please contact support.');
          }
          throw new Error(responseData.error || 'Access denied');
        }

        throw new Error(responseData.error || 'Login failed. Please try again.');
      }

      console.log('✅ Login successful for user:', credentials.email);
      return responseData;
    } catch (error) {
      console.error('❌ Login error:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // Enhanced profile fetching with MongoDB data
  async getProfile(token: string): Promise<{ user: AuthResponse['user'] }> {
    try {
      console.log('👤 Fetching user profile...');
      
      const response = await this.makeRequest(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
        throw new Error('Failed to fetch profile');
      }

      const profileData = await response.json();
      console.log('✅ Profile fetched successfully');
      return profileData;
    } catch (error) {
      console.error('❌ Profile fetch error:', error);
      throw error;
    }
  }

  // Enhanced profile update with MongoDB validation
  async updateProfile(data: ProfileUpdateData, token: string): Promise<AuthResponse> {
    try {
      console.log('✏️ Updating user profile...');
      
      const response = await this.makeRequest(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(responseData.error || 'Invalid profile data');
        }
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
        throw new Error(responseData.error || 'Profile update failed');
      }

      console.log('✅ Profile updated successfully');
      return responseData;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
  }

  // Enhanced user info update using existing Users API
  async updateUserInfo(data: any): Promise<AuthResponse> {
    try {
      console.log('📝 Updating comprehensive user information...');
      
      const headers = this.getAuthHeaders();

      // Ensure required fields for backend route if missing
      let payload = { ...data };
      if (!payload.name || !payload.email) {
        try {
          const verifyRes = await this.makeRequest(`${API_BASE_URL}/api/auth/verify`, {
            headers,
          });
          if (verifyRes.ok) {
            const { user } = await verifyRes.json();
            payload = {
              name: user?.name,
              email: user?.email,
              ...payload,
            };
          }
        } catch (e) {
          // If verify fails, continue; backend may still accept without these fields
        }
      }
      
      const response = await this.makeRequest(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log('📡 User info update response:', response.status);

      if (!response.ok) {
        if (response.status === 400) {
          const errorMsg = responseData.error || responseData.details || 'Invalid user information';
          throw new Error(errorMsg);
        }
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
        throw new Error(responseData.error || 'User information update failed');
      }

      console.log('✅ User information updated successfully');
      return responseData;
    } catch (error) {
      console.error('❌ User info update error:', error);
      throw error;
    }
  }

  // Enhanced password change with MongoDB security
  async changePassword(currentPassword: string, newPassword: string, token: string): Promise<{ message: string }> {
    try {
      console.log('🔒 Changing user password...');
      
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      const response = await this.makeRequest(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(responseData.error || 'Current password is incorrect');
        }
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
        throw new Error(responseData.error || 'Password change failed');
      }

      console.log('✅ Password changed successfully');
      return responseData;
    } catch (error) {
      console.error('❌ Password change error:', error);
      throw error;
    }
  }

  // Enhanced token verification with MongoDB user lookup
  async verifyToken(token: string): Promise<{ valid: boolean; user: AuthResponse['user'] }> {
    try {
      console.log('🔍 Verifying authentication token...');
      
      // Use fetch directly for verify endpoint to avoid header conflicts
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.log('❌ Token verification failed:', response.status);
        return { valid: false, user: null as AuthResponse['user'] };
      }

      const verificationData = await response.json();
      console.log('✅ Token verified successfully');
      return verificationData;
    } catch (error) {
      console.error('❌ Token verification error:', error);
      return { valid: false, user: null as AuthResponse['user'] };
    }
  }

  // Enhanced token refresh with MongoDB validation
  async refreshToken(refreshToken?: string): Promise<AuthResponse> {
    try {
      console.log('🔄 Refreshing authentication token...');
      
      const tokenToUse = refreshToken || localStorage.getItem('refreshToken');
      if (!tokenToUse) {
        throw new Error('Refresh token is required');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokenToUse }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Refresh token expired. Please log in again.');
        }
        throw new Error(responseData.error || 'Token refresh failed');
      }

      // Update tokens in localStorage
      localStorage.setItem('authToken', responseData.token);
      if (responseData.refreshToken) {
        localStorage.setItem('refreshToken', responseData.refreshToken);
      }

      console.log('✅ Token refreshed successfully');
      return responseData;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      throw error;
    }
  }

  // Authentication test using verify endpoint
  async testAuth(): Promise<any> {
    try {
      console.log('🧪 Testing authentication...');
      
      const headers = this.getAuthHeaders();
      
      const response = await this.makeRequest(`${API_BASE_URL}/api/auth/verify`, {
        headers,
      });

      console.log('📡 Test auth response status:', response.status);

      if (!response.ok) {
        throw new Error(`Authentication test failed: ${response.status}`);
      }

      const testData = await response.json();
      console.log('✅ Authentication test successful');
      return testData;
    } catch (error) {
      console.error('❌ Authentication test error:', error);
      throw error;
    }
  }

  // MongoDB health check
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      console.log('🏥 Checking database health...');
      
      const response = await this.makeRequest(`${API_BASE_URL}/api/health`, {
        method: 'GET',
      });

      if (response.ok) {
        console.log('✅ Database connection healthy');
        return true;
      } else {
        console.log('❌ Database connection unhealthy');
        return false;
      }
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();