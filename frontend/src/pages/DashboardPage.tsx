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
import { ArrowUp, Search, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSection, setCurrentSection] = useState("home");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
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

  // Handle refresh posts
  const handleRefresh = () => {
    if (currentSection === 'home') {
      setRefreshing(true);
      const event = new CustomEvent('refreshPosts');
      window.dispatchEvent(event);
      // Reset refreshing state after a delay
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

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
        {/* Header with Create Post, Search, and Refresh */}
        {currentSection === "home" && (
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center justify-between px-4 py-2">
              {/* Left side - Create Post button */}
              <Button
                onClick={() => navigate('/create-post')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
              
              {/* Right side - Search and Refresh buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch(true)}
                  className="h-9 w-9"
                  title="Search posts"
                >
                  <Search className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-9 w-9"
                  title="Refresh posts"
                >
                  {refreshing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        
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

      {/* Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Search Posts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by tags, title, company name, or poll question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  // Pass search query to PostFeed
                  const event = new CustomEvent('searchPosts', { detail: searchQuery.trim() });
                  window.dispatchEvent(event);
                  setShowSearch(false);
                }
              }}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">
              <p>Search filters:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Tags</li>
                <li>Post titles (all post types)</li>
                <li>Company names (job posts)</li>
                <li>Poll questions (poll posts)</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setSearchQuery("");
                const event = new CustomEvent('searchPosts', { detail: "" });
                window.dispatchEvent(event);
                setShowSearch(false);
              }}>
                Clear
              </Button>
              <Button onClick={() => {
                if (searchQuery.trim()) {
                  const event = new CustomEvent('searchPosts', { detail: searchQuery.trim() });
                  window.dispatchEvent(event);
                  setShowSearch(false);
                }
              }}>
                Search
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;