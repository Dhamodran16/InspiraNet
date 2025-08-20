import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import { toast } from '@/hooks/use-toast';
import { validatePasswordStrength, sanitizeUserData } from '@/utils/mongoDBUtils';

interface UseAuthReturn {
  // State
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  user: any;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
  validateCredentials: (email: string, password: string) => { isValid: boolean; errors: string[] };
}

export const useAuth = (): UseAuthReturn => {
  const navigate = useNavigate();
  const { user, login: contextLogin, logout: contextLogout, isAuthenticated } = useAuthContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-refresh token if user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const refreshInterval = setInterval(async () => {
        try {
          await refreshAuth();
        } catch (error) {
          console.warn('Auto token refresh failed:', error);
        }
      }, 14 * 60 * 1000); // Refresh every 14 minutes (tokens expire in 15)

      return () => clearInterval(refreshInterval);
    }
  }, [isAuthenticated, user]);

  // Validate credentials before sending to server
  const validateCredentials = useCallback((email: string, password: string) => {
    const errors: string[] = [];

    // Email validation
    if (!email.trim()) {
      errors.push('Email is required');
    } else if (!email.includes('@')) {
      errors.push('Please enter a valid email address');
    }

    // Password validation
    if (!password.trim()) {
      errors.push('Password is required');
    } else {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Enhanced login function
  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔐 Starting login process...');

      // Client-side validation
      const validation = validateCredentials(email, password);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Sanitize input
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPassword = password.trim();

      console.log('✅ Credentials validated, attempting login...');

      const response = await authService.login({
        email: sanitizedEmail,
        password: sanitizedPassword
      });

      if (response.token && response.refreshToken && response.user) {
        console.log('✅ Login successful, setting user data...');
        
        // Store tokens securely
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('userInfo', JSON.stringify(response.user));
        
        // Update context
        contextLogin(response.user, response.token, response.refreshToken);
        
        toast({
          title: "🎉 Welcome back!",
          description: `Successfully logged in as ${response.user.name}`,
        });

        // Redirect based on profile completion for new users
        if (response.user.isProfileComplete === false) {
          console.log('📝 Redirecting to profile completion...');
          navigate('/profile-completion', { replace: true });
        } else {
          console.log('🏠 Redirecting to dashboard...');
          navigate('/dashboard', { replace: true });
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Unable to connect')) {
          errorMessage = 'Unable to connect to server. Please check your connection.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Please try again.';
        } else if (error.message.includes('expired') || error.message.includes('deactivated')) {
          errorMessage = 'Account access expired. Please contact support.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast({
        title: "❌ Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, contextLogin, validateCredentials]);

  // Enhanced register function
  const register = useCallback(async (userData: any) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Starting registration process...');

      // Sanitize user data
      const sanitizedData = sanitizeUserData(userData);

      // Validate required fields
      if (!sanitizedData.name || !sanitizedData.password || !sanitizedData.type) {
        throw new Error('Missing required fields: name, password, and type');
      }

      // Type-specific validation
      if (sanitizedData.type === 'student') {
        if (!sanitizedData.department || !sanitizedData.joinYear) {
          throw new Error('Students must provide department and join year');
        }
      }

      if (sanitizedData.type === 'faculty') {
        if (!sanitizedData.department || !sanitizedData.email) {
          throw new Error('Faculty must provide department and email');
        }
        if (!sanitizedData.email.includes('@kongu.edu')) {
          throw new Error('Faculty must use Kongu email address');
        }
      }

      console.log('✅ Registration data validated, sending to server...');

      const response = await authService.register(sanitizedData);

      if (response.token && response.refreshToken && response.user) {
        console.log('✅ Registration successful, setting user data...');
        
        // Store tokens securely
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('userInfo', JSON.stringify(response.user));
        
        // Update context
        contextLogin(response.user, response.token, response.refreshToken);
        
        toast({
          title: "🎉 Welcome to KEC Alumni Network!",
          description: `Account created successfully for ${response.user.name}`,
        });

        // Redirect to profile completion
        console.log('📝 Redirecting to profile completion...');
        navigate('/profile-completion', { replace: true });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          errorMessage = 'User with this email already exists. Please try logging in.';
        } else if (error.message.includes('Unable to connect')) {
          errorMessage = 'Unable to connect to server. Please check your connection.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast({
        title: "❌ Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, contextLogin]);

  // Enhanced logout function
  const logout = useCallback(() => {
    console.log('🚪 Logging out user...');
    
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    
    // Clear context
    contextLogout();
    
    // Show success message
    toast({
      title: "👋 Goodbye!",
      description: "You have been successfully logged out.",
    });
    
    // Redirect to home
    navigate('/', { replace: true });
  }, [navigate, contextLogout]);

  // Enhanced token refresh
  const refreshAuth = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('🔄 Refreshing authentication token...');
      
      const response = await authService.refreshToken(refreshToken);
      
      if (response.token && response.refreshToken) {
        // Update stored tokens
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        
        // Update context if user data changed
        if (response.user) {
          localStorage.setItem('userInfo', JSON.stringify(response.user));
          contextLogin(response.user, response.token, response.refreshToken);
        }
        
        console.log('✅ Token refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      // If refresh fails, logout the user
      logout();
    }
  }, [contextLogin, logout]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    isAuthenticated,
    user,
    
    // Actions
    login,
    register,
    logout,
    clearError,
    refreshAuth,
    validateCredentials
  };
};
