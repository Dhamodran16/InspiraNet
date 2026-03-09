import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SignInPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  // Refs for GSAP animations
  const backgroundRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const formElementsRef = useRef<HTMLFormElement>(null);

  // State
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // GSAP Animations
  useEffect(() => {
    if (backgroundRef.current && formRef.current && headerRef.current && formElementsRef.current) {
      // Parallax effect for background
      gsap.to(backgroundRef.current, {
        yPercent: -20,
        ease: "none",
        scrollTrigger: {
          trigger: backgroundRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });

      // Form entrance animation
      gsap.fromTo(formRef.current,
        {
          x: 100,
          opacity: 0,
          scale: 0.95
        },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: "power3.out"
        }
      );

      // Header animation
      gsap.fromTo(headerRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.3, ease: "power2.out" }
      );

      // Form elements stagger animation
      gsap.fromTo(formElementsRef.current.children,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          delay: 0.5,
          ease: "power2.out"
        }
      );
    }

    // Cleanup ScrollTriggers
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const handleLoginInputChange = (field: string, value: string) => {
    setLoginData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoadingAuth(true);

    try {
      const success = await login(loginData.email, loginData.password);

      if (success) {
        toast({
          title: "✅ Welcome Back!",
          description: "Successfully signed in to KEC Alumni Network!",
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden bg-[#0a0a0b]">
      {/* Full Background Image */}
      <div
        ref={backgroundRef}
        className="fixed inset-0 w-full h-full"
        style={{
          backgroundImage: "url('/signin_signup.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          height: '100dvh'
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Content Container */}
      {/* Mobile: centered card overlay | Desktop: right-panel split */}
      <div className="relative z-10 min-h-[100dvh] w-full flex items-stretch">
        {/* Left Side - Empty for background visibility (hidden on mobile) */}
        <div className="hidden md:flex flex-1"></div>

        {/* Right Panel / Mobile-centered Form */}
        <div
          ref={formRef}
          className="
            w-full md:max-w-md md:min-h-screen
            flex flex-col
            md:bg-white/10 md:backdrop-blur-md md:border-l md:border-white/20 md:shadow-2xl
          "
        >
          {/* Mobile: Use a centered card approach */}
          <div className="flex-1 flex flex-col justify-center md:p-8 min-h-screen">
            {/* Mobile glass card wrapper */}
            <div className="md:contents mx-4 my-4 md:mx-0 md:my-0 bg-white/10 md:bg-transparent backdrop-blur-md md:backdrop-blur-none rounded-2xl md:rounded-none border border-white/20 md:border-0 p-5 md:p-0 shadow-2xl md:shadow-none">

              <div ref={headerRef} className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <img
                    src="/logo.png"
                    alt="KEC Alumni Network Logo"
                    className="h-10 w-10"
                  />
                  <h2 className="text-2xl font-bold text-white">KEC Alumni Network</h2>
                </div>
              </div>

              <div className="flex bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-4">
                <button className="flex-1 bg-gradient-to-r from-cyan-500/90 to-blue-500/90 text-white py-2.5 px-4 rounded-md text-sm font-medium shadow-lg">
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="flex-1 py-2.5 px-4 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  Sign Up
                </button>
              </div>

              <div className="text-center mb-3">
                <h3 className="text-lg font-semibold text-white mb-0.5">Welcome back</h3>
                <p className="text-white/80 text-xs">Sign in to access your alumni dashboard</p>
              </div>

              <div className="hidden sm:block bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-lg p-2.5 mb-4 backdrop-blur-sm">
                <p className="text-white text-xs italic">"Success is not final, failure is not fatal."</p>
              </div>

              {/* Form */}
              <form ref={formElementsRef} onSubmit={handleAuth} className="space-y-4">
                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-white text-sm font-medium">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                    <Input
                      id="email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => handleLoginInputChange('email', e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="pl-10 bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="password" className="text-white text-sm font-medium">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => handleLoginInputChange('password', e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="pl-10 pr-10 bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-white/70 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-2.5 font-medium shadow-lg"
                  disabled={isLoadingAuth}
                >
                  {isLoadingAuth ? "Signing In..." : "Sign In"}
                </Button>
              </form>

            </div>{/* end mobile card wrapper */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;



