import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { uploadResumeToCloudinary } from '@/services/cloudinary';
import { ConfigService } from '@/services/config';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TagInput from '@/components/ui/TagInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, User, GraduationCap, Briefcase, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

interface UserInfoData {
  personalEmail?: string;
  dateOfBirth?: string;
  bio?: string;
  areaOfInterest?: string; // New field for area of interest
  skills?: string[];
  languages?: string[];
  extraCurricularActivities?: string[];
  interests?: string[];
  goals?: string[];
  socialLinks?: {
    linkedin?: string;
    github?: string;
    personalWebsite?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  resume?: string;
  portfolio?: string;
  studentInfo?: {
    department?: string;
    graduationYear?: string;
    rollNumber?: string;
    studentId?: string;
    batch?: string;
    section?: string;
    currentSemester?: string;
    cgpa?: string;
    specialization?: string;
    subjects?: string[];
    placementStatus?: string;
    placementCompany?: string;
    placementPackage?: string;
    placementDate?: string;
    currentYear?: string; // Changed from yearsInRomman to currentYear
  };
  alumniInfo?: {
    currentCompany?: string;
    jobTitle?: string;
    experience?: string;
    salary?: string;
    workLocation?: string;
    industry?: string;
    mentorshipOffering?: boolean;
    mentorshipAreas?: string[];
  };
  facultyInfo?: {
    department?: string;
    designation?: string;
    qualification?: string;
    researchAreas?: string[];
    teachingSubjects?: string[];
    officeLocation?: string;
    officeHours?: string;
    consultationAvailable?: boolean;
  };
}

const ProfileCompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState<UserInfoData>({
    skills: [],
    languages: [],
    extraCurricularActivities: [],
    interests: [],
    goals: [],
    socialLinks: {},
    studentInfo: {},
    alumniInfo: {},
    facultyInfo: {}
  });

  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [placementStatuses, setPlacementStatuses] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (user.isProfileComplete) {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  // Fetch configuration data from MongoDB
  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        console.log('Fetching configuration data...');
        const [deptData, desigData, statusData] = await Promise.all([
          ConfigService.getDepartments(),
          ConfigService.getDesignations(),
          ConfigService.getPlacementStatuses()
        ]);
        
        console.log('Configuration data loaded:', {
          departments: deptData.length,
          designations: desigData.length,
          placementStatuses: statusData.length
        });
        
        setDepartments(deptData);
        setDesignations(desigData);
        setPlacementStatuses(statusData);
      } catch (error) {
        console.error('Error fetching configuration data:', error);
        // Use fallback data if configuration fails
        setDepartments([
          'Civil Engineering',
          'Mechanical Engineering',
          'Mechatronics Engineering',
          'Automobile Engineering',
          'Electrical and Electronics Engineering (EEE)',
          'Electronics and Communication Engineering (ECE)',
          'Electronics and Instrumentation Engineering (EIE)',
          'Computer Science and Engineering (CSE)',
          'Information Technology (IT)',
          'Artificial Intelligence and Machine Learning (AIML)',
          'Food Technology'
        ]);
        setDesignations([
          'Professor',
          'Associate Professor',
          'Assistant Professor',
          'Lecturer',
          'Senior Lecturer',
          'Head of Department',
          'Dean',
          'Principal',
          'Director'
        ]);
        setPlacementStatuses([
          'seeking',
          'placed',
          'not_interested',
          'higher_studies',
          'entrepreneur'
        ]);
      }
    };

    fetchConfigData();
  }, []);

  const handleInputChange = (field: string, value: string | boolean, section?: string) => {
    if (section) {
      setFormData(prev => {
        const currentSection = prev[section as keyof UserInfoData] as Record<string, any>;
        const updatedSection = currentSection ? { ...currentSection, [field]: value } : { [field]: value };
        return {
          ...prev,
          [section]: updatedSection
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayInputChange = (field: string, value: string, section?: string) => {
    console.log('🔄 handleArrayInputChange called:', { field, value, section });
    
    // Split by comma and clean up each item
    const arrayValue = value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    console.log('📝 Parsed array value:', arrayValue);
    console.log('📝 Original value:', value);
    console.log('📝 Split result:', value.split(','));
    
    if (section) {
      setFormData(prev => {
        const currentSection = prev[section as keyof UserInfoData] as Record<string, any>;
        const updatedSection = currentSection ? { ...currentSection, [field]: arrayValue } : { [field]: arrayValue };
        console.log('✅ Updated section data:', updatedSection);
        return {
          ...prev,
          [section]: updatedSection
        };
      });
    } else {
      setFormData(prev => {
        console.log('📝 Previous form data:', prev);
        const updated = {
          ...prev,
          [field]: arrayValue
        };
        console.log('✅ Updated form data:', updated);
        return updated;
      });
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('Starting resume upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      setUploadingResume(true);
      const resumeUrl = await uploadResumeToCloudinary(file);
      
      console.log('Resume uploaded successfully:', resumeUrl);
      
      setFormData(prev => ({
        ...prev,
        resume: resumeUrl
      }));
      
      toast({
        title: "Resume uploaded successfully!",
        description: "Your resume has been uploaded and saved.",
      });
    } catch (error) {
      console.error('Resume upload error:', error);
      
      let errorMessage = "Failed to upload resume";
      if (error instanceof Error) {
        if (error.message.includes('Invalid file type')) {
          errorMessage = "Please select a PDF or image file for your resume";
        } else if (error.message.includes('File size too large')) {
          errorMessage = "File size must be less than 10MB";
        } else if (error.message.includes('Failed to upload resume')) {
          errorMessage = "Upload failed. Please check your internet connection and try again";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in again to complete your profile",
        variant: "destructive",
      });
      return;
    }

    // Check if user has a valid token from context
    if (!user?._id) {
      toast({
        title: "Authentication Error",
        description: "No user data found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Form data:', formData);
      console.log('User ID:', user._id);
      console.log('User authenticated:', !!user._id);

      // Test authentication first
      try {
        const authTest = await authService.testAuth();
        console.log('Auth test successful:', authTest);
      } catch (authError) {
        console.error('Auth test failed:', authError);
        toast({
          title: "Authentication Error",
          description: "Authentication failed. Please log in again.",
          variant: "destructive",
        });
        navigate('/signin', { replace: true });
        return;
      }

      const data = await authService.updateUserInfo(formData);
      console.log('Success response:', data);
      
      // Transform the response data to match the User interface structure
      const transformedUser = {
        ...data.user,
        email: {
          college: (() => {
            if (data.user.email && typeof data.user.email === 'object' && data.user.email !== null) {
              return (data.user.email as any).college || '';
            }
            return typeof data.user.email === 'string' ? data.user.email : '';
          })(),
          personal: (() => {
            if (data.user.email && typeof data.user.email === 'object' && data.user.email !== null) {
              return (data.user.email as any).personal || '';
            }
            return formData.personalEmail || '';
          })()
        }
      };
      
      updateUser(transformedUser);
      
      toast({
        title: "Profile completed successfully!",
        description: "Welcome to the alumni network!",
      });

      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Submit error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('No authentication token found')) {
          toast({
            title: "Authentication Error",
            description: "Please log in again to complete your profile",
            variant: "destructive",
          });
          // Redirect to login
          navigate('/signin', { replace: true });
          return;
        }
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          // Redirect to login
          navigate('/signin', { replace: true });
          return;
        }
      }
      
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update user information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Geometric Shapes */}
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-40 right-20 w-24 h-24 bg-purple-500/10 rounded-full blur-xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 0.8, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div
          className="absolute bottom-20 left-1/4 w-40 h-40 bg-green-500/10 rounded-full blur-xl"
          animate={{
            x: [0, 120, 0],
            y: [0, -80, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-full blur-3xl"
          animate={{
            scale: [1.5, 1, 1.5],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="mb-8 text-center"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1 
              className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              Complete Your Profile
            </motion.h1>
            <motion.p 
              className="text-gray-300 text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Welcome, <span className="text-blue-400 font-semibold">{user.name}</span>! Let's set up your profile to connect with the alumni network.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
                <TabsTrigger value="basic" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300">Basic Info</TabsTrigger>
                <TabsTrigger value="academic" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300">Academic</TabsTrigger>
                <TabsTrigger value="professional" className="data-[state=active]:bg-green-600/20 data-[state=active]:text-green-300">Professional</TabsTrigger>
                <TabsTrigger value="social" className="data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-300">Social Links</TabsTrigger>
                <TabsTrigger value="resume" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300">Resume</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-300">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                  <CardDescription className="text-gray-400">
                  Tell us about yourself
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="personalEmail" className="text-gray-300">Personal Email</Label>
                    <Input
                      id="personalEmail"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.personalEmail || ''}
                      onChange={(e) => handleInputChange('personalEmail', e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth" className="text-gray-300 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      Date of Birth
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={formData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="areaOfInterest" className="text-gray-300">Area of Interest</Label>
                    <Input
                      id="areaOfInterest"
                      placeholder="e.g., Software Development, AI/ML, Data Science"
                      value={formData.areaOfInterest || ''}
                      onChange={(e) => handleInputChange('areaOfInterest', e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="academic" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-300">
                  <GraduationCap className="h-5 w-5" />
                  Academic Information
                </CardTitle>
                  <CardDescription className="text-gray-400">
                  Your academic details and placement information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.type === 'student' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="department" className="text-gray-300">Department</Label>
                      <Select value={formData.studentInfo?.department || ''} onValueChange={(value) => handleInputChange('department', value, 'studentInfo')}>
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white focus:border-purple-500">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept} className="text-white hover:bg-purple-500 focus:bg-purple-600 focus:text-white">
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="graduationYear" className="text-gray-300">Graduation Year</Label>
                      <Input
                        id="graduationYear"
                        placeholder="2024"
                        value={formData.studentInfo?.graduationYear || ''}
                        onChange={(e) => handleInputChange('graduationYear', e.target.value, 'studentInfo')}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rollNumber" className="text-gray-300">Roll Number</Label>
                      <Input
                        id="rollNumber"
                        placeholder="CS2024001"
                        value={formData.studentInfo?.rollNumber || ''}
                        onChange={(e) => handleInputChange('rollNumber', e.target.value, 'studentInfo')}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="batch" className="text-gray-300">Joining Year</Label>
                      <Input
                        id="batch"
                        placeholder="2023"
                        value={formData.studentInfo?.batch || ''}
                        onChange={(e) => handleInputChange('batch', e.target.value, 'studentInfo')}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="placementStatus" className="text-gray-300">Placement Status</Label>
                      <Select value={formData.studentInfo?.placementStatus || ''} onValueChange={(value) => handleInputChange('placementStatus', value, 'studentInfo')}>
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white focus:border-purple-500">
                          <SelectValue placeholder="Select placement status" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {placementStatuses.map((status) => (
                            <SelectItem key={status} value={status} className="text-white hover:bg-orange-500 focus:bg-orange-600 focus:text-white">
                              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {user.type === 'faculty' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="facultyDepartment" className="text-gray-300">Department</Label>
                      <Select value={formData.facultyInfo?.department || ''} onValueChange={(value) => handleInputChange('department', value, 'facultyInfo')}>
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white focus:border-purple-500">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept} className="hover:bg-purple-500 text-white focus:bg-purple-600 focus:text-white">
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="designation" className="text-gray-300">Designation</Label>
                      <Select value={formData.facultyInfo?.designation || ''} onValueChange={(value) => handleInputChange('designation', value, 'facultyInfo')}>
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white focus:border-purple-500">
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {designations.map((desig) => (
                            <SelectItem key={desig} value={desig} className="text-white hover:bg-purple-500 focus:bg-purple-600 focus:text-white">
                              {desig}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {user.type === 'alumni' && (
                  <p className="text-gray-400">
                    Academic information is not required for alumni. Please proceed to the Professional tab.
                  </p>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="professional" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-300">
                    <Briefcase className="h-5 w-5" />
                    Professional Development
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Your skills, languages, and interests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="skills" className="text-gray-300">Skills</Label>
                    <TagInput
                      id="skills"
                      values={formData.skills || []}
                      onChange={(vals) => handleArrayInputChange('skills', vals.join(','))}
                      placeholder="Type a skill and press Enter (e.g., React)"
                      className="bg-gray-700/50 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="languages" className="text-gray-300">Languages</Label>
                    <TagInput
                      id="languages"
                      values={formData.languages || []}
                      onChange={(vals) => handleArrayInputChange('languages', vals.join(','))}
                      placeholder="Type a language and press Enter"
                      className="bg-gray-700/50 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="interests" className="text-gray-300">Interests</Label>
                    <TagInput
                      id="interests"
                      values={formData.interests || []}
                      onChange={(vals) => handleArrayInputChange('interests', vals.join(','))}
                      placeholder="Type an interest and press Enter"
                      className="bg-gray-700/50 border-gray-600 text-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-300">
                    <User className="h-5 w-5" />
                    Social & Professional Links
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Connect your social and professional profiles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="linkedin" className="text-gray-300">LinkedIn Profile</Label>
                      <Input
                        id="linkedin"
                        type="url"
                        placeholder="https://linkedin.com/in/yourprofile"
                        value={formData.socialLinks?.linkedin || ''}
                        onChange={(e) => handleInputChange('linkedin', e.target.value, 'socialLinks')}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="github" className="text-gray-300">GitHub Profile</Label>
                      <Input
                        id="github"
                        type="url"
                        placeholder="https://github.com/yourusername"
                        value={formData.socialLinks?.github || ''}
                        onChange={(e) => handleInputChange('github', e.target.value, 'socialLinks')}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="resume" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-300">
                    <FileText className="h-5 w-5" />
                    Resume & Portfolio
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Upload your resume and portfolio to showcase your work
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="resume-upload" className="text-gray-300">Resume Upload</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        id="resume-upload"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                        onChange={handleResumeUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="resume-upload"
                        className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-500 rounded-lg cursor-pointer hover:border-gray-400 transition-colors bg-gray-700/30"
                      >
                        <div className="text-center text-gray-300">
                          {uploadingResume ? (
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-red-400" />
                          ) : formData.resume ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-8 w-8 text-green-400" />
                              <span>Resume uploaded successfully!</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Upload className="h-8 w-8 text-red-400" />
                              <span>Click to upload resume (PDF or Image)</span>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                    {formData.resume && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-green-600/20 text-green-300 border-green-500/30">
                          <FileText className="h-3 w-3" />
                          Resume uploaded
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="portfolio-url" className="text-gray-300">Portfolio URL</Label>
                    <Input
                      id="portfolio-url"
                      type="url"
                      placeholder="https://yourportfolio.com"
                      value={formData.portfolio || ''}
                      onChange={(e) => handleInputChange('portfolio', e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
          </motion.div>
        </div>

        <motion.div 
          className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Button
            variant="outline"
            onClick={() => {
              const tabs = ['basic', 'academic', 'professional', 'social', 'resume'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1]);
              }
            }}
            disabled={activeTab === 'basic'}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {activeTab !== 'resume' && (
              <Button
                onClick={() => {
                  const tabs = ['basic', 'academic', 'professional', 'social', 'resume'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
              >
                Next
              </Button>
            )}
            
            {activeTab === 'resume' && (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileCompletionPage;
