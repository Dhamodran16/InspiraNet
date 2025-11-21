import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LogoHeader from "@/components/LogoHeader";
import ImageCarousel from "@/components/ImageCarousel";
import LandingHero from "@/components/LandingHero";
import EnhancedFeatureShowcase from "@/components/EnhancedFeatureShowcase";
import Footer from "@/components/Footer";

export default function LandingPage() {
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
    <div className="min-h-screen bg-transparent flex flex-col">
      <ImageCarousel />
      <LogoHeader />

      <main className="flex-1">
        <LandingHero />
        <EnhancedFeatureShowcase />
      </main>

      <Footer transparent />
    </div>
  );
}
