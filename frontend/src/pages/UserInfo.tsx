import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { uploadResumeToCloudinary } from '@/services/cloudinary';
import { ConfigService } from '@/services/config';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, User, GraduationCap, Briefcase } from 'lucide-react';

interface UserInfoData {
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
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

const UserInfo: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState<UserInfoData>({
    // Don't initialize empty arrays/objects - only add them when user actually inputs data
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
        const [deptData, desigData, statusData] = await Promise.all([
          ConfigService.getDepartments(),
          ConfigService.getDesignations(),
          ConfigService.getPlacementStatuses()
        ]);
        
        setDepartments(deptData);
        setDesignations(desigData);
        setPlacementStatuses(statusData);
      } catch (error) {
        console.error('Error fetching configuration data:', error);
      }
    };

    fetchConfigData();
  }, []);

  const handleInputChange = (field: string, value: string | boolean, section?: string) => {
    if (section) {
      setFormData(prev => {
        const currentSection = prev[section as keyof UserInfoData] as Record<string, any>;
        // Only create the section object if it doesn't exist or if we're adding a value
        if (!currentSection && value) {
          return {
            ...prev,
            [section]: { [field]: value }
          };
        } else if (currentSection) {
          return {
            ...prev,
            [section]: { ...currentSection, [field]: value }
          };
        }
        return prev;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayInputChange = (field: string, value: string, section?: string) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
    
    if (section) {
      setFormData(prev => {
        const currentSection = prev[section as keyof UserInfoData] as Record<string, any>;
        // Only create the section object if we have array values
        if (arrayValue.length > 0) {
          if (!currentSection) {
            return {
              ...prev,
              [section]: { [field]: arrayValue }
            };
          } else {
            return {
              ...prev,
              [section]: { ...currentSection, [field]: arrayValue }
            };
          }
        } else if (currentSection) {
          // Remove the field if array is empty
          const { [field]: removed, ...rest } = currentSection;
          if (Object.keys(rest).length === 0) {
            // Remove the entire section if it's empty
            const newFormData = { ...prev };
            delete newFormData[section as keyof UserInfoData];
            return newFormData;
          }
          return {
            ...prev,
            [section]: rest
          };
        }
        return prev;
      });
    } else {
      if (arrayValue.length > 0) {
        setFormData(prev => ({
          ...prev,
          [field]: arrayValue
        }));
      } else {
        setFormData(prev => {
          const newFormData = { ...prev };
          delete newFormData[field as keyof UserInfoData];
          return newFormData;
        });
      }
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingResume(true);
      const resumeUrl = await uploadResumeToCloudinary(file);
      setFormData(prev => ({
        ...prev,
        resume: resumeUrl
      }));
      toast({
        title: "Resume uploaded successfully!",
        description: "Your resume has been uploaded and saved.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Basic validation - ensure at least some meaningful data is provided
    const hasBasicInfo = formData.phone || formData.bio || formData.location || formData.city || formData.state || formData.country;
    const hasTypeSpecificInfo = (user.type === 'student' && Object.keys(formData.studentInfo || {}).length > 0) || 
                               (user.type === 'alumni' && Object.keys(formData.alumniInfo || {}).length > 0) || 
                               (user.type === 'faculty' && Object.keys(formData.facultyInfo || {}).length > 0);
    
    if (!hasBasicInfo && !hasTypeSpecificInfo) {
      toast({
        title: "Validation Error",
        description: "Please fill in at least some basic information or type-specific information",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      console.log('Token present:', !!token);
      console.log('Form data:', formData);

            // Clean the form data before sending
      const cleanedFormData = { ...formData };
      
      // Remove empty strings and undefined values
      Object.keys(cleanedFormData).forEach(key => {
        if (cleanedFormData[key] === '' || cleanedFormData[key] === undefined) {
          delete cleanedFormData[key];
        }
      });

      // Ensure at least one field has meaningful data
      const hasData = Object.keys(cleanedFormData).some(key => {
        const value = cleanedFormData[key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return value && value !== '';
      });

      if (!hasData) {
        toast({
          title: "Validation Error",
          description: "Please fill in at least one field before submitting",
          variant: "destructive",
        });
        return;
      }

      // Clean nested objects - remove completely empty ones
      if (cleanedFormData.studentInfo && Object.keys(cleanedFormData.studentInfo).length === 0) {
        delete cleanedFormData.studentInfo;
      } else if (cleanedFormData.studentInfo) {
        Object.keys(cleanedFormData.studentInfo).forEach(key => {
          if (cleanedFormData.studentInfo[key] === '' || cleanedFormData.studentInfo[key] === undefined) {
            delete cleanedFormData.studentInfo[key];
          }
        });
        // Remove if it became empty after cleaning
        if (Object.keys(cleanedFormData.studentInfo).length === 0) {
          delete cleanedFormData.studentInfo;
        }
      }

      if (cleanedFormData.alumniInfo && Object.keys(cleanedFormData.alumniInfo).length === 0) {
        delete cleanedFormData.alumniInfo;
      } else if (cleanedFormData.alumniInfo) {
        Object.keys(cleanedFormData.alumniInfo).forEach(key => {
          if (cleanedFormData.alumniInfo[key] === '' || cleanedFormData.alumniInfo[key] === undefined) {
            delete cleanedFormData.alumniInfo[key];
          }
        });
        // Remove if it became empty after cleaning
        if (Object.keys(cleanedFormData.alumniInfo).length === 0) {
          delete cleanedFormData.alumniInfo;
        }
      }

      if (cleanedFormData.facultyInfo && Object.keys(cleanedFormData.facultyInfo).length === 0) {
        delete cleanedFormData.facultyInfo;
      } else if (cleanedFormData.facultyInfo) {
        Object.keys(cleanedFormData.facultyInfo).forEach(key => {
          if (cleanedFormData.facultyInfo[key] === '' || cleanedFormData.facultyInfo[key] === undefined) {
            delete cleanedFormData.facultyInfo[key];
          }
        });
        // Remove if it became empty after cleaning
        if (Object.keys(cleanedFormData.facultyInfo).length === 0) {
          delete cleanedFormData.facultyInfo;
        }
      }

      // Clean arrays - remove empty ones
      if (cleanedFormData.skills && cleanedFormData.skills.length === 0) delete cleanedFormData.skills;
      if (cleanedFormData.languages && cleanedFormData.languages.length === 0) delete cleanedFormData.languages;
      if (cleanedFormData.extraCurricularActivities && cleanedFormData.extraCurricularActivities.length === 0) delete cleanedFormData.extraCurricularActivities;
      if (cleanedFormData.interests && cleanedFormData.interests.length === 0) delete cleanedFormData.interests;
      if (cleanedFormData.goals && cleanedFormData.goals.length === 0) delete cleanedFormData.goals;

      console.log('Cleaned form data:', cleanedFormData);
      console.log('Form data keys:', Object.keys(cleanedFormData));
      console.log('User type:', user.type);

      const data = await authService.updateUserInfo(cleanedFormData);
      console.log('Success response:', data);
      updateUser(data.user);
      
      toast({
        title: "Profile completed successfully!",
        description: "Welcome to the alumni network!",
      });

      navigate('/#home');
    } catch (error) {
      console.error('Submit error:', error);
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Welcome, {user.name}! Let's set up your profile to connect with the alumni network.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="social">Social Links</TabsTrigger>
            <TabsTrigger value="resume">Resume</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Tell us about yourself
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={formData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="City"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      placeholder="State/Province"
                      value={formData.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="Country"
                      value={formData.country || ''}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Information
                </CardTitle>
                <CardDescription>
                  Your academic details and placement information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.type === 'student' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                       <Label htmlFor="department">Department</Label>
                                               <Select value={formData.studentInfo?.department || ''} onValueChange={(value) => handleInputChange('department', value, 'studentInfo')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                     </div>
                    <div>
                      <Label htmlFor="graduationYear">Graduation Year</Label>
                      <Input
                        id="graduationYear"
                        placeholder="2024"
                        value={formData.studentInfo?.graduationYear || ''}
                        onChange={(e) => handleInputChange('graduationYear', e.target.value, 'studentInfo')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="rollNumber">Roll Number</Label>
                      <Input
                        id="rollNumber"
                        placeholder="CS2024001"
                        value={formData.studentInfo?.rollNumber || ''}
                        onChange={(e) => handleInputChange('rollNumber', e.target.value, 'studentInfo')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="batch">Batch</Label>
                      <Input
                        id="batch"
                        placeholder="2020-2024"
                        value={formData.studentInfo?.batch || ''}
                        onChange={(e) => handleInputChange('batch', e.target.value, 'studentInfo')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="placementStatus">Placement Status</Label>
                      <Select value={formData.studentInfo?.placementStatus || ''} onValueChange={(value) => handleInputChange('placementStatus', value, 'studentInfo')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select placement status" />
                        </SelectTrigger>
                        <SelectContent>
                          {placementStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
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
                       <Label htmlFor="facultyDepartment">Department</Label>
                                               <Select value={formData.facultyInfo?.department || ''} onValueChange={(value) => handleInputChange('department', value, 'facultyInfo')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                     </div>
                                         <div>
                       <Label htmlFor="designation">Designation</Label>
                       <Select value={formData.facultyInfo?.designation || ''} onValueChange={(value) => handleInputChange('designation', value, 'facultyInfo')}>
                         <SelectTrigger>
                           <SelectValue placeholder="Select designation" />
                         </SelectTrigger>
                         <SelectContent>
                           {designations.map((desig) => (
                             <SelectItem key={desig} value={desig}>
                               {desig}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                  </div>
                )}
                {user.type === 'alumni' && (
                  <p className="text-muted-foreground">
                    Academic information is not required for alumni. Please proceed to the Professional tab.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Professional Development</CardTitle>
                <CardDescription>
                  Your skills, languages, and interests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="skills">Skills (comma-separated)</Label>
                  <Input
                    id="skills"
                    placeholder="JavaScript, React, Node.js, Python, Machine Learning"
                    value={formData.skills?.join(', ') || ''}
                    onChange={(e) => handleArrayInputChange('skills', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="languages">Languages (comma-separated)</Label>
                  <Input
                    id="languages"
                    placeholder="English, Hindi, Spanish"
                    value={formData.languages?.join(', ') || ''}
                    onChange={(e) => handleArrayInputChange('languages', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="interests">Interests (comma-separated)</Label>
                  <Input
                    id="interests"
                    placeholder="AI, Blockchain, Sustainable Technology"
                    value={formData.interests?.join(', ') || ''}
                    onChange={(e) => handleArrayInputChange('interests', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Social & Professional Links</CardTitle>
                <CardDescription>
                  Connect your social and professional profiles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkedin">LinkedIn Profile</Label>
                    <Input
                      id="linkedin"
                      type="url"
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={formData.socialLinks?.linkedin || ''}
                      onChange={(e) => handleInputChange('linkedin', e.target.value, 'socialLinks')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="github">GitHub Profile</Label>
                    <Input
                      id="github"
                      type="url"
                      placeholder="https://github.com/yourusername"
                      value={formData.socialLinks?.github || ''}
                      onChange={(e) => handleInputChange('github', e.target.value, 'socialLinks')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resume" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resume & Portfolio</CardTitle>
                <CardDescription>
                  Upload your resume and portfolio to showcase your work
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="resume-upload">Resume Upload</Label>
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
                      className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                    >
                      <div className="text-center">
                        {uploadingResume ? (
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        ) : formData.resume ? (
                          <div className="flex items-center gap-2">
                            <FileText className="h-8 w-8" />
                            <span>Resume uploaded successfully!</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Upload className="h-8 w-8" />
                            <span>Click to upload resume (PDF or Image)</span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  {formData.resume && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <FileText className="h-3 w-3" />
                        Resume uploaded
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="portfolio-url">Portfolio URL</Label>
                  <Input
                    id="portfolio-url"
                    type="url"
                    placeholder="https://yourportfolio.com"
                    value={formData.portfolio || ''}
                    onChange={(e) => handleInputChange('portfolio', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-8 pt-6 border-t">
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
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
