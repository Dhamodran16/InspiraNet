import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, ArrowUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import PostFeed from "@/components/posts/PostFeed";
import AlumniDirectory from "@/components/AlumniDirectory";
import MessagesPage from "@/pages/MessagesPage";
import PlacementPortal from "@/components/placements/PlacementPortal";
import GoogleMeetIntegration from "@/components/meet/GoogleMeetIntegration";
// import Events from "@/components/Events";
import Settings from "@/components/Settings";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfileView from "@/components/profile/ProfileView";
import ErrorBoundary from "@/components/ErrorBoundary";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState("home");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  
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

  const renderSection = () => {
    switch (currentSection) {
      case "home":
        return <PostFeed />;
      case "network":
        return <AlumniDirectory />;
      case "messages":
        return <MessagesPage />;
      case "notifications":
        return <NotificationsPage />;
      // case "events":
      //   return <Events />;
      case "placements":
        return <PlacementPortal />;
      case "meetings":
        return <GoogleMeetIntegration />;
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

  // If user is not authenticated, don't render dashboard
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="dashboard-container">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="floating-element absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="floating-element absolute top-40 right-32 w-24 h-24 bg-gradient-to-r from-pink-400/20 to-red-400/20 rounded-full blur-xl"></div>
        <div className="floating-element absolute bottom-32 left-32 w-28 h-28 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-xl"></div>
        <div className="floating-element absolute bottom-20 right-20 w-20 h-20 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-full blur-xl"></div>
      </div>
      
      <Sidebar 
        currentSection={currentSection} 
        onSectionChange={setCurrentSection} 
        onLogout={onLogout} 
        onCollapseChange={setIsSidebarCollapsed}
      />
      <main className="dashboard-main">
        <div className="h-full flex flex-col min-h-0">
          {/* Section Content - Each section displays independently */}
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary>
              <div className={`dashboard-section dashboard-scroll section-${currentSection} h-full overflow-y-auto overflow-x-hidden`}>
                <div className="p-6 min-h-full w-full">
                  {renderSection()}
                </div>
              </div>
            </ErrorBoundary>
          </div>
        </div>
        
        {/* Create Post Floating Action Button */}
        <Button
          onClick={() => navigate('/create-post')}
          className="fixed bottom-6 right-20 z-50 rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
            size="sm"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;