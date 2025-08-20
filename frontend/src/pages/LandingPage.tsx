import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import FeatureShowcase from "@/components/FeatureShowcase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Calendar, 
  Briefcase, 
  MessageSquare, 
  Bell, 
  BarChart3, 
  Shield, 
  Smartphone,
  ArrowRight,
  GraduationCap,
  Building2,
  Globe
} from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log("LandingPage rendering - isAuthenticated:", isAuthenticated, "isLoading:", isLoading, "user:", user);

  // Redirect logic based on authentication only
  useEffect(() => {
    console.log("LandingPage useEffect - isAuthenticated:", isAuthenticated, "isLoading:", isLoading);
    
    if (isLoading) {
      console.log("Still loading, waiting...");
      return; // Wait for auth to load
    }

    if (isAuthenticated) {
      console.log("User is authenticated, redirecting to dashboard...");
      // All authenticated users go directly to dashboard
      // Profile completion is only required for new signup users
      navigate('/dashboard', { replace: true });
    } else {
      console.log("User not authenticated, showing landing page");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const onJoinNetwork = () => {
    console.log("onJoinNetwork called");
    navigate('/signup');
  };

  const onLogin = () => {
    console.log("onLogin called");
    navigate('/signin');
  };

  const onExploreFeature = (feature: string) => {
    console.log(`Exploring feature: ${feature}`);
    // For non-authenticated users, redirect to signup
    navigate('/signup');
  };

  // Scroll to 'Why Choose KEC Alumni Platform?' section
  const onScrollToWhyChoose = () => {
    const section = document.getElementById('why-choose-kec');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Show loading spinner while auth is initializing
  if (isLoading) {
    console.log("Showing loading spinner");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated, don't render landing page content
  if (isAuthenticated) {
    console.log("User authenticated, not rendering landing page content");
    return null;
  }

  console.log("Rendering landing page content");
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto">
      <Header onLogin={onLogin} />
      <main className="flex-1">
        <Hero onJoinNetwork={onJoinNetwork} />
        <FeatureShowcase />
        
        {/* Enhanced Navigation Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Explore Our Platform
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Discover all the features and capabilities of our alumni network platform
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Alumni Directory */}
              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" 
                    onClick={() => onExploreFeature('alumni-directory')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Alumni Directory</CardTitle>
                  <CardDescription>
                    Connect with fellow alumni, search by batch, department, or location
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button variant="outline" className="group-hover:bg-blue-50">
                    Explore Directory
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>

              {/* Events & Meetups */}
              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => onExploreFeature('events')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                    <Calendar className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Events & Meetups</CardTitle>
                  <CardDescription>
                    Attend virtual and in-person events, workshops, and networking sessions
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button variant="outline" className="group-hover:bg-green-50">
                    View Events
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>

              {/* Job Portal */}
              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => onExploreFeature('jobs')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                    <Briefcase className="w-8 h-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Job Portal</CardTitle>
                  <CardDescription>
                    Find job opportunities, internships, and career guidance from alumni
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button variant="outline" className="group-hover:bg-purple-50">
                    Browse Jobs
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>

              {/* Messaging System */}
              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => onExploreFeature('messaging')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                    <MessageSquare className="w-8 h-8 text-orange-600" />
                  </div>
                  <CardTitle className="text-xl">Private Messaging</CardTitle>
                  <CardDescription>
                    Connect privately with alumni for mentorship and networking
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button variant="outline" className="group-hover:bg-orange-50">
                    Start Chatting
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => onExploreFeature('notifications')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-200 transition-colors">
                    <Bell className="w-8 h-8 text-red-600" />
                  </div>
                  <CardTitle className="text-xl">Smart Notifications</CardTitle>
                  <CardDescription>
                    Stay updated with personalized alerts and follow requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button variant="outline" className="group-hover:bg-red-50">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>

              {/* Analytics Dashboard */}
              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => onExploreFeature('analytics')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
                    <BarChart3 className="w-8 h-8 text-indigo-600" />
                  </div>
                  <CardTitle className="text-xl">Analytics Dashboard</CardTitle>
                  <CardDescription>
                    Track engagement, connections, and platform insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button variant="outline" className="group-hover:bg-indigo-50">
                    View Analytics
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Call to Action */}
            <div className="text-center mt-16">
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                Ready to Join the Network?
              </h3>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Connect with thousands of alumni, access exclusive opportunities, and grow your professional network.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={onJoinNetwork} className="bg-primary hover:bg-primary/90">
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Join Now - It's Free
                </Button>
                <Button size="lg" variant="outline" onClick={onScrollToWhyChoose}>
                  <Globe className="mr-2 h-5 w-5" />
                  Why Choose KEC Alumni Platform?
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;