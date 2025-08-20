import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerified?: boolean;
  requireProfileComplete?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireVerified = false,
  requireProfileComplete = false,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If user is not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If verification is required but user is not verified
  if (requireVerified && !user.isVerified) {
    return (
      <Navigate 
        to="/verification" 
        state={{ 
          from: location,
          message: "Please verify your account to access this page." 
        }} 
        replace 
      />
    );
  }

  // If profile completion is required but profile is incomplete
  if (requireProfileComplete && !user.isProfileComplete) {
    // Check if user has basic profile information
    const hasBasicProfile = user.name && user.email && (user.department || user.bio || user.skills?.length > 0);
    
    // Only redirect if user truly has an incomplete profile
    if (!hasBasicProfile) {
      return (
        <Navigate 
          to="/profile-completion" 
          state={{ 
            from: location,
            message: "Please complete your profile to access this page." 
          }} 
          replace 
        />
      );
    }
  }

  // For dashboard route, check if user has basic profile information
  if (location.pathname === '/dashboard') {
    const hasBasicProfile = user.name && user.email && (user.department || user.bio || user.skills?.length > 0);
    
    if (!hasBasicProfile) {
      return (
        <Navigate 
          to="/profile-completion" 
          state={{ 
            from: location,
            message: "Please complete your profile to access the dashboard." 
          }} 
          replace 
        />
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default ProtectedRoute;
