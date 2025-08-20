import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import UserInfo from "./pages/UserInfo";
import NotFound from "./pages/NotFound";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ProtectedRoute from "@/routes/ProtectedRoute";
import ProfileView from "@/components/profile/ProfileView";
import ProfileCompletionPage from "./pages/ProfileCompletionPage";
import DashboardPage from "./pages/DashboardPage";
import CreatePostPage from "./pages/CreatePostPage";
import TeamPage from "./pages/TeamPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import CookiePolicyPage from "./pages/CookiePolicyPage";

const queryClient = new QueryClient();

const App = () => {
  return (
    <div className="viewport-container">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Landing Page - Entry Point */}
                <Route path="/" element={<Index />} />
                
                {/* Authentication Routes - Updated to use new split-screen pages */}
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                
                {/* Legal and Information Pages */}
                <Route path="/team" element={<TeamPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-of-service" element={<TermsPage />} />
                <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                
                {/* Profile Completion Route - Required for new users */}
                <Route 
                  path="/profile-completion" 
                  element={
                    <ProtectedRoute>
                      <ProfileCompletionPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Main Dashboard - All features available here */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute requireProfileComplete={true}>
                      <DashboardPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Create Post Route */}
                <Route 
                  path="/create-post" 
                  element={
                    <ProtectedRoute requireProfileComplete={true}>
                      <CreatePostPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Profile View Route */}
                <Route
                  path="/profile/:userId"
                  element={
                    <ProtectedRoute>
                      <ProfileView />
                    </ProtectedRoute>
                  }
                />
                
                {/* User Info Route */}
                <Route path="/user-info" element={<UserInfo />} />
                
                {/* Catch all other routes */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;