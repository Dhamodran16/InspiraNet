import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, FC } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { uploadResumeToCloudinary } from '@/services/cloudinary';
import { ConfigService } from '@/services/config';
import { authService } from '@/services/auth';
import api from '@/services/api';
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
import { Loader2, Upload, FileText, User, GraduationCap, Briefcase, Calendar, Link2, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

interface UserInfoData {
  personalEmail?: string;
  dateOfBirth?: string;
  phone?: string;
  gender?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  department?: string;
  bio?: string;
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
    leetcode?: string;
    customLinks?: { label: string; url: string }[];
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

const ProfileCompletionPage: FC = () => {
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
    socialLinks: {
      customLinks: []
    },
    studentInfo: {},
    alumniInfo: {},
    facultyInfo: {}
  });

  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [placementStatuses, setPlacementStatuses] = useState<string[]>([]);
  const [customLinkName, setCustomLinkName] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validation function for mandatory fields based on user type and year
  const validateMandatoryFields = () => {
    const errors: string[] = [];

    // Get user type from pending signup data or existing user
    const pendingSignupDataStr = localStorage.getItem('pendingSignupData');
    const pendingSignupData = pendingSignupDataStr ? JSON.parse(pendingSignupDataStr) : null;
    const pendingUserType = pendingSignupData?.userType;
    const pendingEmail = pendingSignupData?.email?.trim().toLowerCase();
    const currentUserType = user?.type || pendingSignupData?.userType;

    // Email validation function
    const isValidEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    // URL validation function
    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    if (currentUserType === 'faculty') {
      // Faculty mandatory fields
      if (!formData.personalEmail?.trim()) {
        errors.push('Personal Email is required for faculty');
      } else if (!isValidEmail(formData.personalEmail.trim())) {
        errors.push('Please enter a valid personal email address');
      }

      if (!formData.bio?.trim()) errors.push('Bio is required for faculty');
      if (!formData.facultyInfo?.department) errors.push('Department is required for faculty');
      if (!formData.facultyInfo?.designation) errors.push('Designation is required for faculty');
      if (!formData.skills || formData.skills.length === 0) errors.push('Skills are required for faculty');

      if (!formData.socialLinks?.linkedin) {
        errors.push('LinkedIn Profile is required for faculty');
      } else if (!isValidUrl(formData.socialLinks.linkedin)) {
        errors.push('Please enter a valid LinkedIn URL');
      }

    } else if (currentUserType === 'alumni') {
      // Alumni mandatory fields - More reasonable requirements
      if (!formData.personalEmail?.trim()) {
        errors.push('Personal Email is required for alumni');
      } else if (!isValidEmail(formData.personalEmail.trim())) {
        errors.push('Please enter a valid personal email address');
      }

      if (!formData.bio?.trim()) errors.push('Bio is required for alumni');
      if (!formData.interests || formData.interests.length === 0) errors.push('Interests are required for alumni');
      if (!formData.studentInfo?.graduationYear) errors.push('Graduation Year is required for alumni');
      if (!formData.studentInfo?.department) errors.push('Department is required for alumni');
      if (!formData.alumniInfo?.jobTitle) errors.push('Job Title is required for alumni');
      if (!formData.skills || formData.skills.length === 0) errors.push('Skills are required for alumni');

      // LinkedIn is required but GitHub is optional for alumni
      if (!formData.socialLinks?.linkedin) {
        errors.push('LinkedIn Profile is required for alumni');
      } else if (!isValidUrl(formData.socialLinks.linkedin)) {
        errors.push('Please enter a valid LinkedIn URL');
      }

      // Optional fields with validation if provided
      if (formData.socialLinks?.github && !isValidUrl(formData.socialLinks.github)) {
        errors.push('Please enter a valid GitHub URL');
      }

      if (formData.portfolio && !isValidUrl(formData.portfolio)) {
        errors.push('Please enter a valid Portfolio URL');
      }



    } else if (currentUserType === 'student') {
      // Student mandatory fields based on year
      const currentYear = user?.studentInfo?.currentYear || formData.studentInfo?.currentYear;

      // Common mandatory fields for all students
      if (!formData.personalEmail?.trim()) {
        errors.push('Personal Email is required for students');
      } else if (!isValidEmail(formData.personalEmail.trim())) {
        errors.push('Please enter a valid personal email address');
      }

      if (!formData.bio?.trim()) errors.push('Bio is required for students');
      if (!formData.interests || formData.interests.length === 0) errors.push('Interests are required for students');
      if (!formData.studentInfo?.graduationYear) errors.push('Graduation Year is required for students');
      if (!formData.studentInfo?.department) errors.push('Department is required for students');
      if (!formData.skills || formData.skills.length === 0) errors.push('Skills are required for students');

      // LinkedIn is required for all students
      if (!formData.socialLinks?.linkedin) {
        errors.push('LinkedIn Profile is required for students');
      } else if (!isValidUrl(formData.socialLinks.linkedin)) {
        errors.push('Please enter a valid LinkedIn URL');
      }

      // ── Cross-field validations for Roll Number, Joining Year & Graduation Year ──

      // Extract email year from college email (e.g. "name.23aim@kongu.edu" → emailYear = 23)
      const collegeEmail = (user?.email?.college || pendingEmail || '').toLowerCase();
      const emailYearMatch = collegeEmail.match(/^[a-z]+\.(\d{2})[a-z]+@kongu\.edu$/);
      const emailYear = emailYearMatch ? parseInt(emailYearMatch[1], 10) : null;

      // Determine joining year (from studentInfo.batch entered in profile form)
      const joiningYearRaw = formData.studentInfo?.batch?.trim();
      const joiningYear = joiningYearRaw ? parseInt(joiningYearRaw, 10) : null;

      // 1️⃣ Roll Number: first 2 digits must match email year AND joining year (last 2 digits)
      const rollNumber = formData.studentInfo?.rollNumber?.trim();
      if (rollNumber) {
        const rollFirst2 = parseInt(rollNumber.substring(0, 2), 10);
        if (!isNaN(rollFirst2)) {
          if (emailYear !== null && rollFirst2 !== emailYear) {
            errors.push(
              `Roll number first 2 digits (${rollFirst2}) must match your email joining year (${emailYear}). ` +
              `e.g. for email "name.${emailYear}aim@kongu.edu", roll number should start with "${String(emailYear).padStart(2, '0')}".`
            );
          }
          if (joiningYear !== null && rollFirst2 !== joiningYear % 100) {
            errors.push(
              `Roll number first 2 digits (${rollFirst2}) must match the last 2 digits of your Joining Year (${joiningYear % 100}). ` +
              `Double-check your roll number and joining year.`
            );
          }
        }
      }

      // 2️⃣ Joining year last 2 digits must match email year
      if (joiningYear !== null && emailYear !== null) {
        if (joiningYear % 100 !== emailYear) {
          errors.push(
            `Joining Year (${joiningYear}) last 2 digits (${joiningYear % 100}) must match your email year (${emailYear}). ` +
            `Your email "${collegeEmail}" indicates you joined in 20${String(emailYear).padStart(2, '0')}.`
          );
        }
      }

      // 3️⃣ Graduation Year – Joining Year gap must be 4 years (3 years for MCA/MBA/M.Tech PG programs)
      const graduationYear = formData.studentInfo?.graduationYear?.trim();
      const dept = (formData.studentInfo?.department || '').toLowerCase();
      // Departments with 3-year program duration (PG / integrated courses)
      const threeYearDepts = ['mca', 'mba', 'm.tech', 'mtech', 'me', 'm.e', 'msc', 'm.sc'];
      const expectedGap = threeYearDepts.some(d => dept.includes(d)) ? 3 : 4;

      if (joiningYear !== null && graduationYear) {
        const gradYear = parseInt(graduationYear, 10);
        if (!isNaN(gradYear)) {
          const gap = gradYear - joiningYear;
          if (gap !== expectedGap) {
            errors.push(
              `Graduation Year (${gradYear}) must be exactly ${expectedGap} years after your Joining Year (${joiningYear}). ` +
              `Expected graduation year: ${joiningYear + expectedGap}.`
            );
          }
        }
      }

      // Additional fields for 2nd, 3rd, and 4th year students
      if (currentYear === '2' || currentYear === '3' || currentYear === '4') {
        if (!formData.socialLinks?.github) {
          errors.push('GitHub Profile is required for 2nd, 3rd, and 4th year students');
        } else if (!isValidUrl(formData.socialLinks.github)) {
          errors.push('Please enter a valid GitHub URL');
        }

        if (formData.portfolio && !isValidUrl(formData.portfolio)) {
          errors.push('Please enter a valid Portfolio URL');
        }
      }

      // Specialization is required for 3rd and 4th year students
      if ((currentYear === '3' || currentYear === '4') && !formData.studentInfo?.specialization) {
        errors.push('Specialization is required for 3rd and 4th year students');
      }
    }

    return errors;
  };

  useEffect(() => {
    // Check if there's pending signup data (user not yet created)
    const pendingSignupDataStr = localStorage.getItem('pendingSignupData');

    if (!pendingSignupDataStr && !user) {
      // No pending signup and no user - redirect to signup
      navigate('/signup');
      return;
    }

    // If user exists and profile is complete, go to dashboard
    if (user && user.isProfileComplete) {
      navigate('/dashboard');
      return;
    }

    // Pre-fill personal email for alumni (they sign up with their personal email)
    if (pendingSignupDataStr) {
      const pendingData = JSON.parse(pendingSignupDataStr);
      if (pendingData?.userType === 'alumni' && pendingData?.email) {
        setFormData(prev => ({
          ...prev,
          personalEmail: prev.personalEmail || pendingData.email
        }));
      }
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
          'Mechanical Engineering',
          'Artificial Intelligence and Data Science',
          'Artificial Intelligence and Machine Learning',
          'Mechatronics Engineering',
          'Automobile Engineering',
          'Electrical and Electronics Engineering',
          'Electronics and Communication Engineering',
          'Electronics and Instrumentation Engineering',
          'Computer Science and Engineering',
          'Information Technology',
          'Computer Science and Design'
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

  const handleAddCustomLink = () => {
    if (!customLinkName.trim() || !customLinkUrl.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a label and URL for your custom link.",
        variant: "destructive"
      });
      return;
    }

    try {
      new URL(customLinkUrl.trim());
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL that starts with http or https.",
        variant: "destructive"
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...(prev.socialLinks || {}),
        customLinks: [
          ...(prev.socialLinks?.customLinks || []),
          { label: customLinkName.trim(), url: customLinkUrl.trim() }
        ]
      }
    }));
    setCustomLinkName('');
    setCustomLinkUrl('');
  };

  const handleRemoveCustomLink = (index: number) => {
    setFormData(prev => {
      const updatedLinks = (prev.socialLinks?.customLinks || []).filter((_, i) => i !== index);
      return {
        ...prev,
        socialLinks: {
          ...(prev.socialLinks || {}),
          customLinks: updatedLinks
        }
      };
    });
  };

  const extractCollegeEmail = (emailData: any) => {
    if (!emailData) return undefined;
    if (typeof emailData === 'string') {
      return emailData.includes('@') ? emailData : undefined;
    }
    return emailData.college || undefined;
  };

  const buildProfilePayload = (sourceUser?: any) => {
    // Get pendingSignupData from localStorage if needed
    const pendingSignupDataStr = localStorage.getItem('pendingSignupData');
    const pendingSignupData = pendingSignupDataStr ? JSON.parse(pendingSignupDataStr) : null;

    // Start with formData but ensure required fields
    const payload: any = {
      // REQUIRED: Backend requires 'name' field
      name: sourceUser?.name || user?.name || (pendingSignupData ? `${pendingSignupData.firstName || ''} ${pendingSignupData.lastName || ''}`.trim() : '') || 'User',
      // Basic profile fields
      phone: formData.phone || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender || undefined,
      bio: formData.bio || undefined,
      location: formData.location || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      country: formData.country || undefined,
      timezone: formData.timezone || undefined,
      // Array fields - ensure they're arrays
      skills: Array.isArray(formData.skills) ? formData.skills.filter(Boolean) : [],
      languages: Array.isArray(formData.languages) ? formData.languages.filter(Boolean) : [],
      extraCurricularActivities: Array.isArray(formData.extraCurricularActivities) ? formData.extraCurricularActivities.filter(Boolean) : [],
      interests: Array.isArray(formData.interests) ? formData.interests.filter(Boolean) : [],
      goals: Array.isArray(formData.goals) ? formData.goals.filter(Boolean) : [],
      // Optional fields
      resume: formData.resume || undefined,
      portfolio: formData.portfolio || undefined,
    };

    // Handle email - backend expects { college: string, personal: string }
    const pendingUserType: string | undefined = pendingSignupData?.userType;
    const pendingEmail: string | undefined = pendingSignupData?.email?.trim().toLowerCase();
    const trimmedPersonal = formData.personalEmail?.trim();
    const emailPayload: Record<string, string> = {};
    const collegeEmail = extractCollegeEmail(sourceUser?.email)
      || (user?.email?.college || '').trim()
      || ((pendingUserType === 'student' || pendingUserType === 'faculty') ? pendingEmail : undefined);

    if (collegeEmail) {
      emailPayload.college = collegeEmail.toLowerCase();
    }
    if (trimmedPersonal) {
      emailPayload.personal = trimmedPersonal.toLowerCase();
    } else if (pendingUserType === 'alumni' && pendingEmail) {
      emailPayload.personal = pendingEmail;
    }
    if (Object.keys(emailPayload).length > 0) {
      payload.email = emailPayload;
    }

    // Handle department - set at root level
    if (formData.department || formData.studentInfo?.department || formData.facultyInfo?.department) {
      payload.department = formData.department || formData.studentInfo?.department || formData.facultyInfo?.department;
    }

    // Handle type-specific information
    if (formData.studentInfo && Object.keys(formData.studentInfo).length > 0) {
      payload.studentInfo = {
        ...formData.studentInfo,
        department: payload.department || formData.studentInfo.department
      };
    }
    if (formData.alumniInfo && Object.keys(formData.alumniInfo).length > 0) {
      payload.alumniInfo = formData.alumniInfo;
    }
    if (formData.facultyInfo && Object.keys(formData.facultyInfo).length > 0) {
      payload.facultyInfo = {
        ...formData.facultyInfo,
        department: payload.department || formData.facultyInfo.department
      };
    }

    // Handle socialLinks - clean up empty values
    if (formData.socialLinks) {
      const socialLinks: any = {};

      // Add non-empty social links
      if (formData.socialLinks.linkedin?.trim()) socialLinks.linkedin = formData.socialLinks.linkedin.trim();
      if (formData.socialLinks.github?.trim()) socialLinks.github = formData.socialLinks.github.trim();
      if (formData.socialLinks.personalWebsite?.trim()) socialLinks.personalWebsite = formData.socialLinks.personalWebsite.trim();
      if (formData.socialLinks.twitter?.trim()) socialLinks.twitter = formData.socialLinks.twitter.trim();
      if (formData.socialLinks.instagram?.trim()) socialLinks.instagram = formData.socialLinks.instagram.trim();
      if (formData.socialLinks.facebook?.trim()) socialLinks.facebook = formData.socialLinks.facebook.trim();
      if (formData.socialLinks.leetcode?.trim()) socialLinks.leetcode = formData.socialLinks.leetcode.trim();

      // Handle customLinks
      if (Array.isArray(formData.socialLinks.customLinks) && formData.socialLinks.customLinks.length > 0) {
        const validCustomLinks = formData.socialLinks.customLinks
          .filter(link => link?.label?.trim() && link?.url?.trim())
          .map(link => ({
            label: link.label.trim(),
            url: link.url.trim()
          }));
        if (validCustomLinks.length > 0) {
          socialLinks.customLinks = validCustomLinks;
        }
      }

      // Only include socialLinks if it has at least one value
      if (Object.keys(socialLinks).length > 0) {
        payload.socialLinks = socialLinks;
      }
    }

    // Remove undefined and null values
    const cleanPayload: any = {};
    Object.keys(payload).forEach(key => {
      const value = payload[key];
      if (value !== undefined && value !== null) {
        // For objects, check if they have any properties
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          const hasProperties = Object.keys(value).length > 0;
          if (hasProperties) {
            cleanPayload[key] = value;
          }
        } else {
          cleanPayload[key] = value;
        }
      }
    });

    return cleanPayload;
  };

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
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
    // Check for pending signup data (account not yet created)
    const pendingSignupDataStr = localStorage.getItem('pendingSignupData');
    const pendingSignupData = pendingSignupDataStr ? JSON.parse(pendingSignupDataStr) : null;
    setSubmitError(null);

    // Validate mandatory fields based on user type and year
    const validationErrors = validateMandatoryFields();
    if (validationErrors.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: validationErrors.join(', '),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (pendingSignupData) {
        // Account not yet created - create account first, then update profile
        console.log('Creating account with signup data:', pendingSignupData);
        console.log('Profile form data:', formData);

        // Create account first using the register API
        let authResponse;
        try {
          authResponse = await api.post('/api/auth/register', pendingSignupData);
        } catch (registerError: any) {
          console.error('Registration error:', registerError);
          // Check if user was actually created (data might be saved even if response failed)
          // Try to login with the credentials to get the token
          if (registerError.response?.status === 400) {
            console.log('Registration returned 400, but checking if account was created...');
            try {
              // Try to login to see if account exists
              const loginResponse = await api.post('/api/auth/login', {
                email: pendingSignupData.email,
                password: pendingSignupData.password
              });

              if (loginResponse.data && loginResponse.data.token) {
                console.log('✅ Account was created, got token via login');
                authResponse = { data: loginResponse.data };
              } else {
                throw new Error('Account creation failed - could not verify account');
              }
            } catch (loginError) {
              console.error('Could not verify account creation:', loginError);
              throw new Error(registerError.response?.data?.message || registerError.response?.data?.error || 'Account creation failed');
            }
          } else {
            throw registerError;
          }
        }

        if (!authResponse?.data || !authResponse.data.token || !authResponse.data.user) {
          // If response is invalid but we have token, try to get user profile
          if (authResponse?.data?.token) {
            console.log('⚠️ Invalid response but token exists, fetching user profile...');
            api.defaults.headers.common['Authorization'] = `Bearer ${authResponse.data.token}`;
            try {
              const profileResponse = await api.get('/api/users/profile');
              if (profileResponse.data && profileResponse.data.user) {
                authResponse.data.user = profileResponse.data.user;
              }
            } catch (profileError) {
              console.error('Could not fetch user profile:', profileError);
            }
          }

          if (!authResponse?.data?.token) {
            throw new Error('Account creation failed - no token received');
          }
        }

        const authData = authResponse.data;

        // Store token
        localStorage.setItem('authToken', authData.token);
        if (authData.refreshToken) {
          localStorage.setItem('refreshToken', authData.refreshToken);
        }

        // Set the token in api service for subsequent requests
        api.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;

        // Build profile payload - use authData.user if available, otherwise build from formData
        const profilePayload = authData.user ? buildProfilePayload(authData.user) : buildProfilePayload();

        // Ensure name is set (required by backend)
        if (!profilePayload.name) {
          profilePayload.name = `${pendingSignupData.firstName} ${pendingSignupData.lastName}`.trim();
        }

        // Ensure email is set if not in payload
        if (!profilePayload.email && pendingSignupData.email) {
          profilePayload.email = {
            college: pendingSignupData.email,
            ...(formData.personalEmail && { personal: formData.personalEmail.trim() })
          };
        }

        // Log the exact payload being sent
        console.log('📤 PUT /api/users/profile - Request Details:');
        console.log('📤 URL:', '/api/users/profile');
        console.log('📤 Headers:', {
          'Content-Type': 'application/json',
          'Authorization': api.defaults.headers.common['Authorization'] ? 'Bearer [TOKEN_PRESENT]' : 'MISSING'
        });
        console.log('📤 Payload (full):', JSON.stringify(profilePayload, null, 2));
        console.log('📤 Payload (summary):', {
          name: profilePayload.name,
          email: profilePayload.email,
          hasStudentInfo: !!profilePayload.studentInfo,
          hasAlumniInfo: !!profilePayload.alumniInfo,
          hasFacultyInfo: !!profilePayload.facultyInfo,
          skillsCount: profilePayload.skills?.length || 0,
          hasSocialLinks: !!profilePayload.socialLinks,
          department: profilePayload.department
        });

        // Verify Authorization header
        const token = localStorage.getItem('authToken') || api.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '');
        if (!token) {
          throw new Error('No authentication token found. Please try again.');
        }

        // Ensure Authorization header is set
        if (!api.defaults.headers.common['Authorization']) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        const updateResponse = await api.put('/api/users/profile', profilePayload);

        const updateData = updateResponse.data;

        // Clear pending signup data
        localStorage.removeItem('pendingSignupData');

        // Update user in context - use the updated user from profile update
        const transformedUser = {
          ...updateData.user,
          email: {
            college: (() => {
              if (updateData.user.email && typeof updateData.user.email === 'object' && updateData.user.email !== null) {
                return (updateData.user.email as any).college || '';
              }
              return typeof updateData.user.email === 'string' ? updateData.user.email : '';
            })(),
            personal: (() => {
              if (updateData.user.email && typeof updateData.user.email === 'object' && updateData.user.email !== null) {
                return (updateData.user.email as any).personal || '';
              }
              return formData.personalEmail || '';
            })()
          }
        };

        // Update user in context
        updateUser(transformedUser, { replace: true });

        toast({
          title: "✅ Account Created Successfully!",
          description: "Welcome to the alumni network!",
        });

        // Redirect to dashboard without reloading the entire SPA
        navigate('/dashboard', { replace: true });
      } else {
        // User already exists - just update profile
        if (!user) {
          toast({
            title: "Authentication Error",
            description: "Please log in again to complete your profile",
            variant: "destructive",
          });
          return;
        }

        if (!user?._id) {
          toast({
            title: "Authentication Error",
            description: "No user data found. Please log in again.",
            variant: "destructive",
          });
          return;
        }

        const payload = buildProfilePayload(user);

        // Ensure name is set (required by backend)
        if (!payload.name && user?.name) {
          payload.name = user.name;
        }

        // Log the exact payload being sent
        console.log('📤 PUT /api/users/profile - Request Details (existing user):');
        console.log('📤 URL:', '/api/users/profile');
        console.log('📤 Payload (full):', JSON.stringify(payload, null, 2));
        console.log('📤 Payload (summary):', {
          name: payload.name,
          email: payload.email,
          hasStudentInfo: !!payload.studentInfo,
          hasAlumniInfo: !!payload.alumniInfo,
          hasFacultyInfo: !!payload.facultyInfo,
          skillsCount: payload.skills?.length || 0,
          hasSocialLinks: !!payload.socialLinks,
          department: payload.department
        });

        // Verify Authorization header
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No authentication token found. Please log in again.');
        }

        const data = await authService.updateUserInfo(payload);
        console.log('Success response:', data);

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

        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Submit error:', error);

      if (error instanceof Error) {
        if (error.message.includes('No authentication token found') || error.message.includes('401') || error.message.includes('Unauthorized')) {
          const authMessage = "Please try again or log in";
          setSubmitError(authMessage);
          toast({
            title: "Authentication Error",
            description: authMessage,
            variant: "destructive",
          });
          return;
        }
      }

      let errorTitle = "Error";
      let errorDescription = "Failed to create account or update profile";

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as any;
        console.error('Submit error response:', responseData);
        const messages: string[] = [];
        if (responseData?.error && typeof responseData.error === 'string') {
          errorTitle = responseData.error;
          messages.push(responseData.error);
        }
        if (responseData?.message && typeof responseData.message === 'string' && responseData.message !== responseData.error) {
          messages.push(responseData.message);
        }
        if (responseData?.details && typeof responseData.details === 'string') {
          messages.push(responseData.details);
        }
        if (Array.isArray(responseData?.missingFields) && responseData.missingFields.length > 0) {
          messages.push(`Missing fields: ${responseData.missingFields.join(', ')}`);
        }
        if (responseData?.validationErrors && typeof responseData.validationErrors === 'object') {
          const validationMessages = Object.values(responseData.validationErrors)
            .map((item: any) => item?.message)
            .filter(Boolean);
          if (validationMessages.length > 0) {
            messages.push(validationMessages.join(', '));
          }
        }
        if (messages.length > 0) {
          errorDescription = messages.join(' • ');
        } else if (error.response?.status) {
          errorDescription = `Request failed with status ${error.response.status}`;
        }
      } else if (error instanceof Error && error.message) {
        errorDescription = error.message;
      }

      setSubmitError(errorDescription);
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check for pending signup data (user not yet created)
  const pendingSignupDataStr = localStorage.getItem('pendingSignupData');
  const pendingSignupData = pendingSignupDataStr ? JSON.parse(pendingSignupDataStr) : null;

  // Determine user type from pending signup data or existing user
  const userType = user?.type || pendingSignupData?.userType || 'student';

  // Allow rendering if there's pending signup data OR if user exists
  if (!user && !pendingSignupData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg mb-4">No signup data found</p>
          <Button onClick={() => navigate('/signup')}>Go to Sign Up</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
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
              {user ? (
                <>Welcome, <span className="text-blue-400 font-semibold">{user.name}</span>! Let's set up your profile to connect with the alumni network.</>
              ) : pendingSignupData ? (
                <>Welcome, <span className="text-blue-400 font-semibold">{pendingSignupData.firstName} {pendingSignupData.lastName}</span>! Let's complete your profile to create your account.</>
              ) : (
                <>Let's set up your profile to connect with the alumni network.</>
              )}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {submitError && (
              <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {submitError}
              </div>
            )}
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
                      {userType === 'student' && (
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
                              placeholder="2027"
                              value={formData.studentInfo?.graduationYear || ''}
                              onChange={(e) => handleInputChange('graduationYear', e.target.value, 'studentInfo')}
                              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Must be 4 years after your Joining Year (e.g. joined 2023 → graduate 2027)</p>
                          </div>
                          <div>
                            <Label htmlFor="rollNumber" className="text-gray-300">Roll Number</Label>
                            <Input
                              id="rollNumber"
                              placeholder="23AIM010"
                              value={formData.studentInfo?.rollNumber || ''}
                              onChange={(e) => handleInputChange('rollNumber', e.target.value.toUpperCase(), 'studentInfo')}
                              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">First 2 digits must match your email year &amp; joining year (e.g. <span className="text-purple-400">23</span>AIM010 for joined 20<span className="text-purple-400">23</span>)</p>
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
                            <p className="text-xs text-gray-500 mt-1">Must match the year in your Kongu email (e.g. name.<span className="text-purple-400">23</span>aim@kongu.edu → Joining Year <span className="text-purple-400">2023</span>)</p>
                          </div>

                          <div>
                            <Label htmlFor="specialization" className="text-gray-300">Specialization</Label>
                            <Input
                              id="specialization"
                              placeholder="e.g., AI/ML, Web Development, Data Science"
                              value={formData.studentInfo?.specialization || ''}
                              onChange={(e) => handleInputChange('specialization', e.target.value, 'studentInfo')}
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
                                    {{
                                      'seeking': 'Seeking Placement',
                                      'placed': 'Placed',
                                      'not_interested': 'Not Interested in Placement',
                                      'higher_studies': 'Higher Studies',
                                      'entrepreneur': 'Entrepreneur / Self-Employed'
                                    }[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      {userType === 'faculty' && (
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
                      {userType === 'alumni' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="alumniDepartment" className="text-gray-300">Department (Graduated)</Label>
                            <Select value={formData.studentInfo?.department || ''} onValueChange={(value) => handleInputChange('department', value, 'studentInfo')}>
                              <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white focus:border-purple-500">
                                <SelectValue placeholder="Select your department" />
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
                            <Label htmlFor="alumniGraduationYear" className="text-gray-300">Graduation Year</Label>
                            <Input
                              id="alumniGraduationYear"
                              placeholder="2024"
                              value={formData.studentInfo?.graduationYear || ''}
                              onChange={(e) => handleInputChange('graduationYear', e.target.value, 'studentInfo')}
                              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <Label htmlFor="alumniJobTitle" className="text-gray-300">Current Job Title</Label>
                            <Input
                              id="alumniJobTitle"
                              placeholder="e.g., Software Engineer, Data Scientist"
                              value={formData.alumniInfo?.jobTitle || ''}
                              onChange={(e) => handleInputChange('jobTitle', e.target.value, 'alumniInfo')}
                              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <Label htmlFor="alumniCompany" className="text-gray-300">Current Company</Label>
                            <Input
                              id="alumniCompany"
                              placeholder="e.g., Google, Microsoft"
                              value={formData.alumniInfo?.currentCompany || ''}
                              onChange={(e) => handleInputChange('currentCompany', e.target.value, 'alumniInfo')}
                              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <Label htmlFor="alumniExperience" className="text-gray-300">Years of Experience</Label>
                            <Input
                              id="alumniExperience"
                              type="number"
                              min="0"
                              placeholder="2"
                              value={formData.alumniInfo?.experience || ''}
                              onChange={(e) => handleInputChange('experience', e.target.value, 'alumniInfo')}
                              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                            />
                          </div>
                        </div>
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
                    <CardContent className="space-y-6">
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
                        <div>
                          <Label htmlFor="leetcode" className="text-gray-300">LeetCode Profile</Label>
                          <Input
                            id="leetcode"
                            type="url"
                            placeholder="https://leetcode.com/yourusername"
                            value={formData.socialLinks?.leetcode || ''}
                            onChange={(e) => handleInputChange('leetcode', e.target.value, 'socialLinks')}
                            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-300">Custom Social & Professional Links</Label>
                          <span className="text-xs text-gray-400">Add any other platforms (Behance, Medium, etc.)</span>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2">
                          <Input
                            placeholder="Label (e.g., Portfolio, Blog)"
                            value={customLinkName}
                            onChange={(e) => setCustomLinkName(e.target.value)}
                            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                          />
                          <Input
                            placeholder="https://example.com/your-link"
                            value={customLinkUrl}
                            onChange={(e) => setCustomLinkUrl(e.target.value)}
                            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                          />
                          <Button type="button" onClick={handleAddCustomLink} className="bg-orange-600 hover:bg-orange-700">
                            <Link2 className="h-4 w-4 mr-2" />
                            Add Link
                          </Button>
                        </div>
                        {formData.socialLinks?.customLinks && formData.socialLinks.customLinks.length > 0 && (
                          <div className="space-y-2">
                            {formData.socialLinks.customLinks.map((link, index) => (
                              <div key={`${link.label}-${index}`} className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-md px-3 py-2">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center text-orange-300 hover:text-orange-200 gap-2"
                                >
                                  <Link2 className="h-4 w-4" />
                                  <span className="font-medium">{link.label}</span>
                                </a>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveCustomLink(index)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <CloseIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
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
                        <Label htmlFor="resume-upload" className="text-gray-300 flex items-center gap-2">
                          Resume Upload
                          <span className="text-xs text-gray-400">(optional)</span>
                        </Label>
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
                        <Label htmlFor="portfolio-url" className="text-gray-300 flex items-center gap-2">
                          Portfolio URL
                          <span className="text-xs text-gray-400">(optional)</span>
                        </Label>
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
            {userType === 'student' && (user?.studentInfo?.currentYear === '1' || user?.studentInfo?.currentYear === '2') && (
              <Button
                variant="ghost"
                onClick={() => {
                  toast({
                    title: "Profile Completion Skipped",
                    description: "You can complete your profile later from the dashboard",
                  });
                  navigate('/dashboard', { replace: true });
                }}
                className="text-gray-400 hover:text-white"
              >
                Skip for Now
              </Button>
            )}

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
                    {localStorage.getItem('pendingSignupData') ? 'Creating Account...' : 'Saving...'}
                  </>
                ) : (
                  localStorage.getItem('pendingSignupData') ? 'Create Account' : 'Complete Profile'
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
