import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import api from '@/services/api';

export interface User {
  _id: string;
  name: string;
  email: {
    college?: string;
    personal?: string;
  };
  type: 'student' | 'alumni' | 'faculty';
  avatar?: string;
  department?: string;
  batch?: string;
  isVerified: boolean;
  isProfileComplete: boolean;
  // Additional properties needed by Settings component
  phone?: string;
  location?: string;
  designation?: string;
  company?: string;
  bio?: string;
  professionalEmail?: string;
  experience?: string;
  skills?: string[];
  languages?: string[];
  interests?: string[];
  joinYear?: number;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    personalWebsite?: string;
  };
  // Student-specific information
  studentInfo?: {
    department?: string;
    graduationYear?: string;
    rollNumber?: string;
    studentId?: string;
    batch?: string;
    section?: string;
    currentSemester?: string;
    cgpa?: string;
    specialization?: string;
    subjects?: string[];
    placementStatus?: string;
    placementCompany?: string;
    placementPackage?: string;
    placementDate?: string;
    currentYear?: string;
  };
  // Alumni-specific information
  alumniInfo?: {
    currentCompany?: string;
    jobTitle?: string;
    experience?: string;
    salary?: string;
    workLocation?: string;
    industry?: string;
    mentorshipOffering?: boolean;
    mentorshipAreas?: string[];
  };
  // Faculty-specific information
  facultyInfo?: {
    department?: string;
    designation?: string;
    qualification?: string;
    researchAreas?: string[];
    teachingSubjects?: string[];
    officeLocation?: string;
    officeHours?: string;
    consultationAvailable?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<any>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token management utilities
const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string, rememberMe: boolean = false): void => {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
};

export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Verify token with backend
        const response = await api.get('/api/auth/verify');

        if (response.data && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          // Token invalid, remove it
          removeAuthToken();
          toast({
            title: "Session Expired",
            description: "Please log in again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        removeAuthToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await api.post('/api/auth/login', { email, password });

      if (response.data && response.data.token) {
        // Store token (you can add a rememberMe checkbox to your login form)
        setAuthToken(response.data.token, true);
        
        // Set user data
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${response.data.user.name}!`,
        });
        
        navigate('/dashboard');
        return true;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error types
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
      } else if (error.response?.status >= 500) {
        toast({
          title: "Server Error",
          description: "Something went wrong on our end. Please try again later.",
          variant: "destructive",
        });
      } else if (error.response?.status === 401) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please check your credentials.",
          variant: "destructive",
        });
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast({
          title: "Connection Timeout",
          description: "The request took too long. Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Error",
          description: "Unable to connect to the server. Please try again.",
          variant: "destructive",
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const response = await api.post('/api/auth/register', userData);
      if (response.data && response.data.token) {
        setAuthToken(response.data.token, true);
        setUser(response.data.user);
        setIsAuthenticated(true);
        toast({
          title: "Registration Successful",
          description: `Welcome, ${response.data.user.name}!`,
        });
        // Do not navigate here; let the caller decide next route
        return response.data;
      } else {
        toast({
          title: "Registration Failed",
          description: response.data?.error || 'Registration failed',
          variant: "destructive",
        });
        return response.data;
      }
    } catch (error: any) {
      const serverMsg = error?.response?.data?.error || error?.message || 'Registration failed';
      console.error('Registration error:', serverMsg);
      toast({
        title: "Registration Error",
        description: serverMsg,
        variant: "destructive",
      });
      throw new Error(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    removeAuthToken();
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    
    navigate('/signin');
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) return false;

      const response = await api.post('/api/auth/refresh');

      if (response.data && response.data.token) {
        setAuthToken(response.data.token, true);
        return true;
      } else {
        removeAuthToken();
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};







