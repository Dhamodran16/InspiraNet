import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authService, LoginCredentials, RegisterData } from "@/services/auth";
import { getBackendUrl } from "@/utils/urlConfig";

interface AuthModalProps {
  children: React.ReactNode;
  onAuthSuccess?: () => void;
  defaultOpen?: boolean;
  defaultMode?: 'login' | 'signup';
}

export default function AuthModal({ children, onAuthSuccess, defaultOpen, defaultMode }: AuthModalProps) {
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<"alumni" | "student" | "faculty">("alumni");
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentNames, setDepartmentNames] = useState<Record<string, string>>({});
  const [isLogin, setIsLogin] = useState(defaultMode ? defaultMode === 'login' : true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(!!defaultOpen);
  
  useEffect(() => {
    if (defaultMode) setIsLogin(defaultMode === 'login');
  }, [defaultMode]);

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/auth/departments`);
        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments);
          setDepartmentNames(data.departmentNames);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    };

    fetchDepartments();
  }, []);
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Separate state for login and signup
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    joinYear: "",
    personalEmail: ""
  });

  const onClose = () => {
    setIsOpen(false);
    setError('');
    setLoginData({
      email: "",
      password: ""
    });
    setSignupData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      department: "",
      joinYear: "",
      personalEmail: ""
    });
    // Reset password visibility
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowConfirmPassword(false);
    if (defaultOpen) {
      navigate('/');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let response;
      if (isLogin) {
        // Validate login data
        if (!loginData.email.trim() || !loginData.password.trim()) {
          throw new Error('Email and password are required');
        }
        
        response = await authService.login(loginData);
        if (response.token && response.refreshToken && response.user) {
          login(response.user, response.token, response.refreshToken);
          onClose();
          toast({
            title: "Success",
            description: "Login successful!",
          });
          // If profile incomplete, go to completion; else dashboard
          if (response.user?.isProfileComplete === false) {
            navigate('/user-info', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          if (onAuthSuccess) {
            onAuthSuccess();
          }
        }
      } else {
        // Validate signup data
        if (!signupData.firstName.trim() || !signupData.lastName.trim() || 
            !signupData.email.trim() || !signupData.password.trim()) {
          throw new Error('Please fill in all required fields');
        }
        
        if (signupData.password !== signupData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        if (signupData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        
        // Validate role-specific fields
        if (userType === 'student') {
          if (!signupData.joinYear) {
            throw new Error('Students must provide join year');
          }
          // Department is now optional during registration, will be collected in profile completion
        } else if (userType === 'faculty') {
          if (!signupData.email) {
            throw new Error('Faculty must provide official Kongu email');
          }
        }

        const registerData: RegisterData = {
          name: `${signupData.firstName} ${signupData.lastName}`,
          email: signupData.email,
          password: signupData.password,
          type: userType,
          department: signupData.department,
          joinYear: userType === 'student' ? parseInt(signupData.joinYear) : undefined,
          personalEmail: signupData.personalEmail || undefined
        };
        
        response = await authService.register(registerData);
        if (response.token && response.refreshToken && response.user) {
          login(response.user, response.token, response.refreshToken);
          onClose();
          toast({
            title: "Success",
            description: "Registration successful! Welcome to KEC Alumni Network!",
          });
          // After signup always go to profile completion
          navigate('/user-info', { replace: true });
          if (onAuthSuccess) {
            onAuthSuccess();
          }
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || 'Authentication failed. Please try again.');
      toast({
        title: "Error",
        description: error.message || 'Authentication failed. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginInputChange = (field: string, value: string) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignupInputChange = (field: string, value: string) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
  };

  const renderSignupForm = () => {
    return (
      <form onSubmit={handleAuth} className="space-y-4">
        {/* User Type Selection */}
        <div className="space-y-3">
          <Label>I am a:</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Card 
              className={`cursor-pointer transition-all ${
                userType === 'alumni' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setUserType('alumni')}
            >
              <CardContent className="p-4 text-center">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">Alumni</div>
                <div className="text-xs text-muted-foreground">Graduated from KEC</div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all ${
                userType === 'student' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setUserType('student')}
            >
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">Student</div>
                <div className="text-xs text-muted-foreground">Currently studying</div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all ${
                userType === 'faculty' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setUserType('faculty')}
            >
              <CardContent className="p-4 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">Faculty</div>
                <div className="text-xs text-muted-foreground">Teaching staff</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Basic Information - Only Essential Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input 
              id="firstName" 
              value={signupData.firstName}
              onChange={(e) => handleSignupInputChange('firstName', e.target.value)}
              required 
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input 
              id="lastName" 
              value={signupData.lastName}
              onChange={(e) => handleSignupInputChange('lastName', e.target.value)}
              required 
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">
            {userType === 'student' ? 'Personal Email (Optional)' : 
             userType === 'faculty' ? 'Official Kongu Email *' : 'Email *'}
          </Label>
          <Input 
            id="email" 
            type="email" 
            placeholder={
              userType === 'student' ? 'your.email@gmail.com' :
              userType === 'faculty' ? 'name.dept@kongu.edu' :
              'your.email@gmail.com'
            }
            value={signupData.email}
            onChange={(e) => handleSignupInputChange('email', e.target.value)}
            required={userType === 'faculty'}
          />
          {userType === 'student' && (
            <p className="text-xs text-muted-foreground mt-1">
              Your college email will be auto-generated as: name.yrdept@kongu.edu
            </p>
          )}
          {userType === 'faculty' && (
            <p className="text-xs text-muted-foreground mt-1">
              Must be your official Kongu email (e.g., ravi.cse@kongu.edu)
            </p>
          )}
        </div>

        {/* Role-specific fields */}
        {(userType === 'student' || userType === 'faculty') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="department">Department *</Label>
              <Select 
                value={signupData.department} 
                onValueChange={(value) => handleSignupInputChange('department', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {departmentNames[dept] || dept.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {userType === 'student' && (
              <div>
                <Label htmlFor="joinYear">Join Year *</Label>
                <Select 
                  value={signupData.joinYear} 
                  onValueChange={(value) => handleSignupInputChange('joinYear', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Personal Email for Students */}
        {userType === 'student' && signupData.email && (
          <div>
            <Label htmlFor="personalEmail">Personal Email (Optional)</Label>
            <Input 
              id="personalEmail" 
              type="email" 
              placeholder="your.email@gmail.com"
              value={signupData.personalEmail}
              onChange={(e) => handleSignupInputChange('personalEmail', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Add a personal email for backup notifications
            </p>
          </div>
        )}

        {/* Password */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="relative">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
                <Input 
                id="password"
                type={showSignupPassword ? "text" : "password"}
                value={signupData.password}
                onChange={(e) => handleSignupInputChange('password', e.target.value)}
                  required 
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowSignupPassword(!showSignupPassword)}
              >
                {showSignupPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
              </div>
          <div className="relative">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
                <Input 
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={signupData.confirmPassword}
                onChange={(e) => handleSignupInputChange('confirmPassword', e.target.value)}
                  required 
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
              </div>
            </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    );
  };

  const renderLoginForm = () => {
    return (
      <form onSubmit={handleAuth} className="space-y-4">
            <div>
          <Label htmlFor="loginEmail">Email</Label>
              <Input 
            id="loginEmail"
                type="email" 
            value={loginData.email}
            onChange={(e) => handleLoginInputChange('email', e.target.value)}
                required 
              />
            </div>
        <div className="relative">
          <Label htmlFor="loginPassword">Password</Label>
          <div className="relative">
              <Input 
              id="loginPassword"
              type={showLoginPassword ? "text" : "password"}
              value={loginData.password}
              onChange={(e) => handleLoginInputChange('password', e.target.value)}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
            >
              {showLoginPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            </div>
          </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>
      </form>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[90vw] p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-center text-lg sm:text-xl">
            {isLogin ? "Welcome Back" : "Join KEC Alumni Network"}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={isLogin ? "login" : "signup"} onValueChange={(value) => setIsLogin(value === "login")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 scrollbar-thin">
            {renderLoginForm()}
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4 scrollbar-thin">
                {renderSignupForm()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
