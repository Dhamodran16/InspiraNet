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
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2
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

  // Real-time availability checks
  type AvailabilityStatus = 'idle' | 'checking' | 'taken' | 'available';
  const [emailCheckStatus, setEmailCheckStatus] = useState<AvailabilityStatus>('idle');
  const [emailCheckMessage, setEmailCheckMessage] = useState('');
  const [nameCheckStatus, setNameCheckStatus] = useState<AvailabilityStatus>('idle');
  const [nameCheckMessage, setNameCheckMessage] = useState('');
  const availabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const newData = { ...signupData, [field]: value };
    setSignupData(newData);

    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Trigger debounced availability check
    if (availabilityTimer.current) clearTimeout(availabilityTimer.current);

    availabilityTimer.current = setTimeout(async () => {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      // Check Email Availability
      if (field === 'email') {
        if (!value.trim()) { setEmailCheckStatus('idle'); setEmailCheckMessage(''); return; }
        setEmailCheckStatus('checking');
        try {
          const res = await fetch(`${apiBase}/api/auth/check-availability?email=${encodeURIComponent(value.trim())}`);
          const data = await res.json();
          if (data.exists) {
            setEmailCheckStatus('taken');
            setEmailCheckMessage(data.message);
          } else {
            setEmailCheckStatus('available');
            setEmailCheckMessage('Email is available');
          }
        } catch { setEmailCheckStatus('idle'); }
      }

      // Check Name Availability
      if (field === 'firstName' || field === 'lastName') {
        const fullName = `${newData.firstName} ${newData.lastName}`.trim();
        if (fullName.length > 3) {
          setNameCheckStatus('checking');
          try {
            const res = await fetch(`${apiBase}/api/auth/check-availability?name=${encodeURIComponent(fullName)}`);
            const data = await res.json();
            if (data.exists) {
              setNameCheckStatus('taken');
              setNameCheckMessage(data.message);
            } else {
              setNameCheckStatus('available');
              setNameCheckMessage('Name is unique');
            }
          } catch { setNameCheckStatus('idle'); }
        } else {
          setNameCheckStatus('idle');
        }
      }
    }, 600);
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

    if (!validateForm()) return;

    if (emailCheckStatus === 'taken') {
      setFieldErrors(prev => ({ ...prev, email: emailCheckMessage }));
      toast({
        title: "Email already in use",
        description: emailCheckMessage,
        variant: "destructive",
      });
      return;
    }
    if (nameCheckStatus === 'taken') {
      setFieldErrors(prev => ({ ...prev, firstName: nameCheckMessage, lastName: nameCheckMessage }));
      toast({
        title: "Name already taken",
        description: nameCheckMessage,
        variant: "destructive",
      });
      return;
    }
    if (emailCheckStatus === 'checking' || nameCheckStatus === 'checking') {
      setError('Please wait while we verify your details...');
      toast({
        title: "Verification in progress",
        description: "Please wait a moment while we check your details.",
      });
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
    <div className="min-h-[100dvh] relative overflow-x-hidden bg-[#0c0c0e]">
      {/* Full Background Image */}
      <div
        ref={backgroundRef}
        className="fixed inset-0 w-full h-full z-0"
        style={{
          backgroundImage: "url('/signin_signup.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          height: '100dvh'
        }}
      >
        {/* Darker overlay for reduced background brightness */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content Container */}
      {/* Mobile: centered card overlay | Desktop: right-panel split */}
      <div className="relative z-10 min-h-[100dvh] w-full flex items-stretch">
        {/* Left Side - Empty for background visibility (hidden on mobile) */}
        <div className="hidden md:flex flex-1"></div>

        {/* Right Panel / Mobile Full-Width Form */}
        <div
          ref={formRef}
          className="w-full md:max-w-md flex flex-col md:bg-white/10 md:backdrop-blur-md md:border-l md:border-white/20 md:shadow-2xl"
        >
          {/* Scrollable form area */}
          <div className="flex-1 flex flex-col justify-center md:p-8 overflow-y-auto">
            {/* Mobile glass card wrapper */}
            <div className="md:contents mx-4 my-3 md:mx-0 md:my-0 bg-white/10 md:bg-transparent backdrop-blur-md md:backdrop-blur-none rounded-2xl md:rounded-none border border-white/20 md:border-0 p-4 md:p-0 shadow-2xl md:shadow-none">

              {/* Header */}
              <div ref={headerRef} className="text-center mb-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <img src="/logo.png" alt="KEC Alumni Network Logo" className="h-10 w-10" />
                  <h2 className="text-2xl font-bold text-white">KEC Alumni Network</h2>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-4">
                <button
                  onClick={() => navigate('/signin')}
                  className="flex-1 py-2.5 px-4 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  Sign In
                </button>
                <button className="flex-1 bg-gradient-to-r from-cyan-500/90 to-blue-500/90 text-white py-2.5 px-4 rounded-md text-sm font-medium shadow-lg">
                  Sign Up
                </button>
              </div>

              {/* Welcome Message */}
              <div className="text-center mb-3">
                <h3 className="text-lg font-semibold text-white mb-1">Create your account</h3>
                <p className="text-white/80 text-sm">Join our platform for advanced alumni networking</p>
              </div>

              {/* Form */}
              <form ref={formElementsRef} onSubmit={handleAuth} className="space-y-3">
                {/* User Type Selection */}
                <div>
                  <Label className="text-white text-sm font-medium mb-1.5 block">I am a *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Card
                      className={`cursor-pointer transition-all duration-200 ${signupData.userType === 'alumni' ? 'ring-2 ring-blue-500 bg-blue-500/20' : 'hover:bg-white/10 bg-white/10'
                        }`}
                      onClick={() => handleUserTypeChange('alumni')}
                    >
                      <CardContent className="p-2.5 text-center">
                        <Users className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                        <div className="font-medium text-white text-xs">Alumni</div>
                        <div className="text-xs text-white/70">Graduated</div>
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-all duration-200 ${signupData.userType === 'student' ? 'ring-2 ring-green-500 bg-green-500/20' : 'hover:bg-white/10 bg-white/10'
                        }`}
                      onClick={() => handleUserTypeChange('student')}
                    >
                      <CardContent className="p-2.5 text-center">
                        <GraduationCap className="h-4 w-4 mx-auto mb-1 text-green-400" />
                        <div className="font-medium text-white text-xs">Student</div>
                        <div className="text-xs text-white/70">Current</div>
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-all duration-200 ${signupData.userType === 'faculty' ? 'ring-2 ring-purple-500 bg-purple-500/20' : 'hover:bg-white/10 bg-white/10'
                        }`}
                      onClick={() => handleUserTypeChange('faculty')}
                    >
                      <CardContent className="p-2.5 text-center">
                        <BookOpen className="h-4 w-4 mx-auto mb-1 text-purple-400" />
                        <div className="font-medium text-white text-xs">Faculty</div>
                        <div className="text-xs text-white/70">Teaching</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Label htmlFor="firstName" className="text-white text-sm font-medium">First Name *</Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                      <Input
                        id="firstName"
                        type="text"
                        value={signupData.firstName}
                        onChange={(e) => handleSignupInputChange('firstName', e.target.value)}
                        placeholder="John"
                        required
                        className={`pl-10 bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400 ${nameCheckStatus === 'taken' ? 'border-red-400' :
                          nameCheckStatus === 'available' ? 'border-green-400' : ''
                          }`}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Label htmlFor="lastName" className="text-white text-sm font-medium">Last Name *</Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                      <Input
                        id="lastName"
                        type="text"
                        value={signupData.lastName}
                        onChange={(e) => handleSignupInputChange('lastName', e.target.value)}
                        placeholder="Doe"
                        required
                        className={`pl-10 bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400 ${nameCheckStatus === 'taken' ? 'border-red-400' :
                          nameCheckStatus === 'available' ? 'border-green-400' : ''
                          }`}
                      />
                    </div>
                  </div>
                  {nameCheckStatus === 'taken' && (
                    <p className="col-span-2 text-red-300 text-[10px] mt-0.5">{nameCheckMessage}</p>
                  )}
                  {nameCheckStatus === 'checking' && (
                    <p className="col-span-2 text-white/60 text-[10px] mt-0.5 flex items-center gap-1">
                      <Loader2 className="h-2 w-2 animate-spin" /> Verifying name...
                    </p>
                  )}
                  {nameCheckStatus === 'available' && signupData.firstName && signupData.lastName && (
                    <p className="col-span-2 text-green-300 text-[10px] mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-2 w-2" /> Name is unique
                    </p>
                  )}
                  {(fieldErrors.firstName || fieldErrors.lastName) && (
                    <p className="col-span-2 text-red-300 text-xs mt-1">{fieldErrors.firstName || fieldErrors.lastName}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-white text-sm font-medium">
                    {signupData.userType === 'student' || signupData.userType === 'faculty'
                      ? 'College Email (@kongu.edu) *'
                      : 'Email *'}
                  </Label>
                  <div className="relative mt-1.5">
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
                      className={`pl-10 pr-10 bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400 ${emailCheckStatus === 'taken' ? 'border-red-400 focus:border-red-400' :
                        emailCheckStatus === 'available' ? 'border-green-400 focus:border-green-400' : ''
                        }`}
                    />
                    {/* Right-side status indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {emailCheckStatus === 'checking' && <Loader2 className="h-4 w-4 text-white/60 animate-spin" />}
                      {emailCheckStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                      {emailCheckStatus === 'taken' && <XCircle className="h-4 w-4 text-red-400" />}
                    </div>
                  </div>
                  {/* Field error OR check message */}
                  {fieldErrors.email && <p className="text-red-300 text-xs mt-1">{fieldErrors.email}</p>}
                  {!fieldErrors.email && emailCheckStatus === 'taken' && (
                    <p className="text-red-300 text-xs mt-1">{emailCheckMessage}</p>
                  )}
                  {!fieldErrors.email && emailCheckStatus === 'available' && (
                    <p className="text-green-300 text-xs mt-1">✓ Email is available</p>
                  )}
                </div>

                {/* Current Year - Students only */}
                {signupData.userType === 'student' && (
                  <div>
                    <Label htmlFor="currentYear" className="text-white text-sm font-medium">Current Year *</Label>
                    <div className="relative mt-1.5">
                      <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                      <select
                        id="currentYear"
                        value={signupData.currentYear || ''}
                        onChange={(e) => handleSignupInputChange('currentYear', e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 text-white focus:border-blue-400 rounded-md"
                      >
                        <option value="" className="bg-gray-800 text-white">Select current year</option>
                        <option value="1" className="bg-gray-800 text-white">1st Year</option>
                        <option value="2" className="bg-gray-800 text-white">2nd Year</option>
                        <option value="3" className="bg-gray-800 text-white">3rd Year</option>
                        <option value="4" className="bg-gray-800 text-white">4th Year</option>
                      </select>
                    </div>
                    {fieldErrors.currentYear && <p className="text-red-300 text-xs mt-1">{fieldErrors.currentYear}</p>}
                  </div>
                )}

                {/* Password Fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="signupPassword" className="text-white text-sm font-medium">Password *</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                      <Input
                        id="signupPassword"
                        type={showPassword ? "text" : "password"}
                        value={signupData.password}
                        onChange={(e) => handleSignupInputChange('password', e.target.value)}
                        placeholder="Password"
                        required
                        className="pl-10 pr-8 bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400"
                      />
                      <Button type="button" variant="ghost" size="sm"
                        className="absolute right-0 top-0 h-full px-2 hover:bg-transparent text-white/70 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {fieldErrors.password && <p className="text-red-300 text-xs mt-1">{fieldErrors.password}</p>}
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-white text-sm font-medium">Confirm *</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={signupData.confirmPassword}
                        onChange={(e) => handleSignupInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirm"
                        required
                        className="pl-10 pr-8 bg-white/20 border-white/30 text-white placeholder-white/60 focus:border-blue-400"
                      />
                      <Button type="button" variant="ghost" size="sm"
                        className="absolute right-0 top-0 h-full px-2 hover:bg-transparent text-white/70 hover:text-white"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {fieldErrors.confirmPassword && <p className="text-red-300 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-300 bg-red-900/30 p-2.5 rounded-md border border-red-500/30">
                    {error}
                  </div>
                )}

                {/* Terms */}
                <div className="text-xs text-white/70 text-center space-y-1">
                  <p>
                    By signing up, you agree to our{' '}
                    <button type="button" onClick={() => window.open('/terms', '_blank')} className="text-cyan-300 hover:text-cyan-200 underline">Terms</button>
                    {' '}and{' '}
                    <button type="button" onClick={() => window.open('/privacy-policy', '_blank')} className="text-cyan-300 hover:text-cyan-200 underline">Privacy Policy</button>
                    .{' '}
                    <button type="button" onClick={() => window.open('/cookie-policy', '_blank')} className="text-cyan-300 hover:text-cyan-200 underline">Cookie Policy</button>
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-2.5 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoadingAuth || emailCheckStatus === 'taken' || nameCheckStatus === 'taken' || emailCheckStatus === 'checking' || nameCheckStatus === 'checking'}
                >
                  {isLoadingAuth ? "Submitting..." :
                    (emailCheckStatus === 'checking' || nameCheckStatus === 'checking') ? "Verifying..." :
                      (emailCheckStatus === 'taken' || nameCheckStatus === 'taken') ? "Please fix errors" :
                        "Submit"}
                </Button>
              </form>

            </div>{/* end mobile card wrapper */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
