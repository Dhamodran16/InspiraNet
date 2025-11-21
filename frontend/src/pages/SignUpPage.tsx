import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Users, 
  GraduationCap, 
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Simplified signup form: removed department/company/phone fields

const SignUpPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  
  // Refs for GSAP animations
  const backgroundRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const formElementsRef = useRef<HTMLFormElement>(null);
  
  // State
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'alumni' as 'alumni' | 'student' | 'faculty',
    currentYear: ''
  });
  
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleSignupInputChange = (field: string, value: string) => {
    setSignupData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleUserTypeChange = (userType: 'alumni' | 'student' | 'faculty') => {
    setSignupData(prev => ({
      ...prev,
      userType
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!signupData.firstName.trim()) errors.firstName = 'First name is required';
    if (!signupData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!signupData.email.trim()) errors.email = 'Email is required';
    if (!signupData.password) errors.password = 'Password is required';
    if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (signupData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Kongu email requirement for student/faculty
    if ((signupData.userType === 'student' || signupData.userType === 'faculty') && !signupData.email.toLowerCase().endsWith('@kongu.edu')) {
      errors.email = 'Use your official Kongu email (@kongu.edu)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoadingAuth(true);
    setError('');

    try {
      // Store signup data in localStorage instead of creating account immediately
      localStorage.setItem('pendingSignupData', JSON.stringify(signupData));
      
        toast({
        title: "✅ Information Saved",
        description: "Please complete your profile to create your account",
        });
      
      // Navigate to profile completion page
        navigate('/profile-completion');
    } catch (error: any) {
      console.error('Error saving signup data:', error);
      setError(error.message || 'Failed to save information. Please try again.');
      toast({
        title: "❌ Error",
        description: error.message || 'Failed to save information. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Full Background Image */}
      <div
        ref={backgroundRef}
        className="fixed inset-0 w-full h-full"
        style={{
          backgroundImage: "url('/signin_signup.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="fixed inset-0 bg-black/20"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen w-full flex">
        {/* Left Side - Empty for background visibility */}
        <div className="flex-1"></div>

        {/* Right Panel - Sign Up Form */}
        <div ref={formRef} className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 flex flex-col shadow-2xl min-h-screen">
          <div className="flex-1 flex flex-col justify-center p-8">
                     {/* Header */}
            <div ref={headerRef} className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
               <img
                 src="/logo.png"
                 alt="KEC Alumni Network Logo"
                  className="h-10 w-10"
               />
               <h2 className="text-2xl font-bold text-white">KEC Alumni Network</h2>
             </div>
           </div>

                       {/* Navigation Tabs */}
            <div className="flex bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-6">
              <button 
                onClick={() => navigate('/signin')}
                className="flex-1 py-3 px-4 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Sign In
              </button>
              <button className="flex-1 bg-gradient-to-r from-cyan-500/90 to-blue-500/90 text-white py-3 px-4 rounded-md text-sm font-medium shadow-lg backdrop-blur-sm">
                Sign Up
              </button>
            </div>

           {/* Welcome Message */}
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-white mb-2">Create your account</h3>
              <p className="text-white/90">Join our platform for advanced alumni networking</p>
           </div>

                       {/* Quote */}
            {/* Removed quote to reduce vertical space */}

                       {/* Form */}
            <form ref={formElementsRef} onSubmit={handleAuth} className="space-y-3 pr-2">
                         {/* User Type Selection */}
              <div>
                <Label className="text-white text-sm font-medium mb-2 block">I am a *</Label>
                <div className="grid grid-cols-3 gap-2">
                                                    <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      signupData.userType === 'alumni' ? 'ring-2 ring-blue-500 bg-blue-500/20' : 'hover:bg-white/10 bg-white/10'
                     }`}
                    onClick={() => handleUserTypeChange('alumni')}
                 >
                    <CardContent className="p-3 text-center">
                      <Users className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                     <div className="font-medium text-white text-xs">Alumni</div>
                      <div className="text-xs text-white/80">Graduated</div>
                   </CardContent>
                 </Card>
                                                    <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      signupData.userType === 'student' ? 'ring-2 ring-green-500 bg-green-500/20' : 'hover:bg-white/10 bg-white/10'
                     }`}
                    onClick={() => handleUserTypeChange('student')}
                 >
                    <CardContent className="p-3 text-center">
                      <GraduationCap className="h-4 w-4 mx-auto mb-1 text-green-400" />
                     <div className="font-medium text-white text-xs">Student</div>
                      <div className="text-xs text-white/80">Current</div>
                   </CardContent>
                 </Card>
                                                    <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      signupData.userType === 'faculty' ? 'ring-2 ring-purple-500 bg-purple-500/20' : 'hover:bg-white/10 bg-white/10'
                     }`}
                    onClick={() => handleUserTypeChange('faculty')}
                 >
                    <CardContent className="p-3 text-center">
                      <BookOpen className="h-4 w-4 mx-auto mb-1 text-purple-400" />
                     <div className="font-medium text-white text-xs">Faculty</div>
                      <div className="text-xs text-white/80">Teaching</div>
                   </CardContent>
                 </Card>
              </div>
            </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" className="text-white text-sm font-medium">First Name *</Label>
                  <div className="relative mt-2">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                  <Input 
                    id="firstName"
                    type="text" 
                    value={signupData.firstName}
                    onChange={(e) => handleSignupInputChange('firstName', e.target.value)}
                    placeholder="John"
                    required 
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder-white/90 focus:border-blue-400 focus:ring-blue-400 backdrop-blur-sm"
                  />
                </div>
                {fieldErrors.firstName && (
                    <p className="text-red-300 text-xs mt-1">{fieldErrors.firstName}</p>
                )}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-white text-sm font-medium">Last Name *</Label>
                  <div className="relative mt-2">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                  <Input 
                      id="lastName"
                      type="text" 
                      value={signupData.lastName}
                      onChange={(e) => handleSignupInputChange('lastName', e.target.value)}
                      placeholder="Doe"
                      required 
                      className="pl-10 bg-white/20 border-white/30 text-white placeholder-white/90 focus:border-blue-400 focus:ring-blue-400 backdrop-blur-sm"
                  />
                </div>
                {fieldErrors.lastName && (
                    <p className="text-red-300 text-xs mt-1">{fieldErrors.lastName}</p>
                )}
                </div>
              </div>

              {/* Email */}
              <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                  <Label htmlFor="email" className="text-white text-sm font-medium">
                    {signupData.userType === 'student' ? 'College Email (@kongu.edu) *' : 
                     signupData.userType === 'faculty' ? 'College Email (@kongu.edu) *' : 
                     'Email *'}
                  </Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                <Input 
                      id="email"
                  type="email" 
                  value={signupData.email}
                  onChange={(e) => handleSignupInputChange('email', e.target.value)}
                      placeholder={
                        signupData.userType === 'student' ? 'student@kongu.edu' :
                        signupData.userType === 'faculty' ? 'faculty@kongu.edu' :
                        'alumni@example.com'
                      }
                  required 
                      className="pl-10 bg-white/20 border-white/30 text-white placeholder-white/90 focus:border-blue-400 focus:ring-blue-400 backdrop-blur-sm"
                 />
               </div>
               {fieldErrors.email && (
                    <p className="text-red-300 text-xs mt-1">{fieldErrors.email}</p>
                  )}
                </div>
              </div>

              {/* Current Year Field - Only for Students, right after email */}
              {signupData.userType === 'student' && (
                <div>
                  <Label htmlFor="currentYear" className="text-white text-sm font-medium">Current Year *</Label>
                  <div className="relative mt-2">
                    <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                    <select
                      id="currentYear"
                      value={signupData.currentYear || ''}
                      onChange={(e) => handleSignupInputChange('currentYear', e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 text-white focus:border-blue-400 focus:ring-blue-400 backdrop-blur-sm rounded-md"
                    >
                      <option value="" className="bg-white text-gray-900">Select current year</option>
                      <option value="1" className="bg-white text-gray-900">1st Year</option>
                      <option value="2" className="bg-white text-gray-900">2nd Year</option>
                      <option value="3" className="bg-white text-gray-900">3rd Year</option>
                      <option value="4" className="bg-white text-gray-900">4th Year</option>
                    </select>
                  </div>
                  {fieldErrors.currentYear && (
                    <p className="text-red-300 text-xs mt-1">{fieldErrors.currentYear}</p>
                  )}
                </div>
              )}

              {/* Removed: phone, department/current year, company, designation */}

              {/* Password Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="signupPassword" className="text-white text-sm font-medium">Password *</Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                  <Input 
                    id="signupPassword"
                    type={showPassword ? "text" : "password"}
                    value={signupData.password}
                    onChange={(e) => handleSignupInputChange('password', e.target.value)}
                      placeholder="Create password"
                    required
                      className="pl-10 pr-10 bg-white/20 border-white/30 text-white placeholder-white/90 focus:border-blue-400 focus:ring-blue-400 backdrop-blur-sm"
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
                {fieldErrors.password && (
                    <p className="text-red-300 text-xs mt-1">{fieldErrors.password}</p>
                )}
              </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-white text-sm font-medium">Confirm Password *</Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                  <Input 
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={signupData.confirmPassword}
                    onChange={(e) => handleSignupInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm password"
                    required
                      className="pl-10 pr-10 bg-white/20 border-white/30 text-white placeholder-white/90 focus:border-blue-400 focus:ring-blue-400 backdrop-blur-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-white/70 hover:text-white"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {fieldErrors.confirmPassword && (
                    <p className="text-red-300 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

              {error && (
                <div className="text-sm text-red-300 bg-red-900/30 p-3 rounded-md border border-red-500/30 backdrop-blur-sm">
                  {error}
                </div>
              )}

              {/* Terms and Privacy Policy Acceptance */}
              <div className="text-xs text-white/80 text-center space-y-2">
                <p>
                  By creating an account, you agree to our{' '}
                  <button 
                    type="button"
                    onClick={() => window.open('/terms', '_blank')} 
                    className="text-cyan-300 hover:text-cyan-200 underline"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button 
                    type="button"
                    onClick={() => window.open('/privacy-policy', '_blank')} 
                    className="text-cyan-300 hover:text-cyan-200 underline"
                  >
                    Privacy Policy
                  </button>
                </p>
                <p>
                  We use cookies to enhance your experience. See our{' '}
                  <button 
                    type="button"
                    onClick={() => window.open('/cookie-policy', '_blank')} 
                    className="text-cyan-300 hover:text-cyan-200 underline"
                  >
                    Cookie Policy
                  </button>
                  {' '}for more information.
                </p>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-2.5 font-medium shadow-lg" disabled={isLoadingAuth}>
                {isLoadingAuth ? "Submitting..." : "Submit"}
              </Button>
            </form>
            
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
