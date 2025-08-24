import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import CookieConsent from '@/components/CookieConsent';
import ScrollToTop from '@/components/ScrollToTop';

// Lazy load components for better performance
const LandingPage = React.lazy(() => import('@/pages/LandingPage'));
const SignInPage = React.lazy(() => import('@/pages/SignInPage'));
const SignUpPage = React.lazy(() => import('@/pages/SignUpPage'));
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const Profile = React.lazy(() => import('@/pages/Profile'));
const EditProfile = React.lazy(() => import('@/pages/EditProfile'));
const MessagesPage = React.lazy(() => import('@/pages/MessagesPage'));
const NotificationsPage = React.lazy(() => import('@/pages/NotificationsPage'));
const CreatePostPage = React.lazy(() => import('@/pages/CreatePostPage'));
const ProfileCompletionPage = React.lazy(() => import('@/pages/ProfileCompletionPage'));
const PrivacyPolicyPage = React.lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsPage = React.lazy(() => import('@/pages/TermsPage'));
const CookiePolicyPage = React.lazy(() => import('@/pages/CookiePolicyPage'));
const TeamPage = React.lazy(() => import('@/pages/TeamPage'));
const MeetingRoom = React.lazy(() => import('@/pages/MeetingRoom'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

function App() {
  useEffect(() => {
    // Initialize basic performance optimizations
    const initializePerformance = async () => {
      try {
        // Preload critical resources
        const criticalResources = [
          'https://inspiranet-backend.onrender.com/api/config/departments',
          'https://inspiranet-backend.onrender.com/api/config/designations',
          'https://inspiranet-backend.onrender.com/api/config/placement-statuses'
        ];

        // Preload critical resources using fetch
        criticalResources.forEach(resource => {
          fetch(resource, { method: 'HEAD' }).catch(() => {
            // Silently fail for preload attempts
          });
        });

        console.log('Performance optimizations initialized');
      } catch (error) {
        console.warn('Performance initialization failed:', error);
      }
    };

    initializePerformance();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="App">
          <ScrollToTop />
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/edit" element={<EditProfile />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/create-post" element={<CreatePostPage />} />
                <Route path="/profile-completion" element={<ProfileCompletionPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/meeting/:roomId" element={<MeetingRoom />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </React.Suspense>
          </ErrorBoundary>
          <CookieConsent />
          <Toaster />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;