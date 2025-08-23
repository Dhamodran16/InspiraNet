import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Ensure landing page opens at the top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    
    // Redirect authenticated users to dashboard
    if (isAuthenticated && user) {
      // If profile is incomplete, redirect to profile completion
      if (!user.isProfileComplete) {
        navigate('/profile-completion', { replace: true });
      } else {
        // If profile is complete, redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  // Only show landing page for unauthenticated users
  if (isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Innovation Platform</h1>
        <p className="text-lg text-muted-foreground mb-8">Redirecting to landing page...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}