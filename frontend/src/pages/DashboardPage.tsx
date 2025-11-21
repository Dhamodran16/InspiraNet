import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import PostFeed from '@/components/posts/PostFeed';
import AlumniDirectory from '@/components/AlumniDirectory';
import EnhancedMessagesPage from '@/pages/EnhancedMessagesPage';
import NotificationsPage from '@/pages/NotificationsPage';
import PlacementPortal from '@/components/placements/PlacementPortal';
import ProfileView from '@/components/profile/ProfileView';
import Settings from '@/components/Settings';
import GoogleCalendarHostDashboard from '@/components/meetings/GoogleCalendarHostDashboard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSection, setCurrentSection] = useState("home");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Handle URL parameters for section navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const section = searchParams.get('section');
    if (section && ['home', 'network', 'messages', 'notifications', 'meetings', 'placements', 'profile', 'settings'].includes(section)) {
      setCurrentSection(section);
    } else if (!section && location.pathname === '/dashboard') {
      // Default to home if no section specified
      setCurrentSection('home');
    }
  }, [location.search, location.pathname]);
  
  // Scroll to top functionality
  const scrollToTop = () => {
    const sectionContent = document.querySelector('.dashboard-section');
    if (sectionContent) {
      sectionContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      const sectionContent = document.querySelector('.dashboard-section');
      if (sectionContent) {
        setShowScrollTop(sectionContent.scrollTop > 300);
      }
    };
    
    const sectionContent = document.querySelector('.dashboard-section');
    if (sectionContent) {
      sectionContent.addEventListener('scroll', handleScroll);
      return () => sectionContent.removeEventListener('scroll', handleScroll);
    }
  }, [currentSection]);

  // Redirect logic based on authentication only
  useEffect(() => {
    if (isLoading) return; // Wait for auth to load

    if (!isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    // Removed profile completion check - sign-in users go directly to dashboard
    // Profile completion is only required for new signup users
  }, [isAuthenticated, isLoading, navigate]);

  const onLogout = () => {
    navigate('/', { replace: true });
  };

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    // Update URL without page reload
    navigate(`/dashboard?section=${section}`, { replace: true });
  };

  const renderSection = () => {
    switch (currentSection) {
      case "home":
        return <PostFeed />;
      case "network":
        return <AlumniDirectory />;
      case "messages":
        return <EnhancedMessagesPage />;
      case "notifications":
        return <NotificationsPage />;
      case "meetings":
        return <GoogleCalendarHostDashboard />;
      case "placements":
        return <PlacementPortal />;
      case "profile":
        return <ProfileView />;
      case "settings":
        return <Settings />;
      default:
        return <PostFeed />;
    }
  };

  // Show loading spinner while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Fixed to left side */}
      <Sidebar 
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        onLogout={onLogout}
      />

      {/* Main Content - Adjusted for fixed sidebar */}
      <div className="flex-1 ml-16 flex flex-col">
        {/* Content Area */}
        <main className="flex-1">
          <div className="h-full dashboard-section">
            <ErrorBoundary>
              {renderSection()}
            </ErrorBoundary>
          </div>
        </main>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 rounded-full w-12 h-12 p-0 shadow-lg z-50"
            size="icon"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;