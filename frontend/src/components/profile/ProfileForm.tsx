import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Save, X, Upload, User, GraduationCap, Briefcase, Calendar, Mail, Globe } from 'lucide-react';
import TagInput from '@/components/ui/TagInput';
import api from '@/services/api';
import { ConfigService } from '@/services/config';

interface ProfileFormProps {
  onSave?: () => void;
  onCancel?: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ onSave, onCancel }) => {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [placementStatuses, setPlacementStatuses] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: {
      college: user?.email?.college || '',
      personal: user?.email?.personal || ''
    },
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    bio: user?.bio || '',
    areaOfInterest: user?.areaOfInterest || '',
    skills: user?.skills || [],
    languages: user?.languages || [],
    interests: user?.interests || [],
    socialLinks: user?.socialLinks || {},
    resume: user?.resume || '',
    portfolio: user?.portfolio || '',
    studentInfo: user?.studentInfo || {},
    alumniInfo: user?.alumniInfo || {},
    facultyInfo: user?.facultyInfo || {}
  });

  // Fetch configuration data
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
        // Use fallback data
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

  const handleInputChange = (field: string, value: any, section?: string) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [field]: value
        }
      }));
    } else if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayInputChange = (field: string, value: string, section?: string) => {
    const arrayValue = value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [field]: arrayValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: arrayValue
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.put('/api/users/profile', formData);
      
      if (response.data.success || response.data.message) {
        updateUser(response.data.user);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully!",
        });
        onSave?.();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            Edit Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+91-9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="personal-email">Personal Email</Label>
                  <Input
                    id="personal-email"
                    type="email"
                    value={formData.email.personal}
                    onChange={(e) => handleInputChange('email.personal', e.target.value)}
                    placeholder="personal@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="areaOfInterest">Area of Interest</Label>
                <Input
                  id="areaOfInterest"
                  value={formData.areaOfInterest}
                  onChange={(e) => handleInputChange('areaOfInterest', e.target.value)}
                  placeholder="e.g., Software Development, AI/ML, Data Science"
                />
              </div>
            </div>

            {/* Academic Information */}
            {user?.type === 'student' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select 
                      value={formData.studentInfo?.department || ''} 
                      onValueChange={(value) => handleInputChange('department', value, 'studentInfo')}
                    >
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
                    <Label htmlFor="rollNumber">Roll Number</Label>
                    <Input
                      id="rollNumber"
                      value={formData.studentInfo?.rollNumber || ''}
                      onChange={(e) => handleInputChange('rollNumber', e.target.value, 'studentInfo')}
                      placeholder="CS2024001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      value={formData.studentInfo?.studentId || ''}
                      onChange={(e) => handleInputChange('studentId', e.target.value, 'studentInfo')}
                      placeholder="Student ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      value={formData.studentInfo?.section || ''}
                      onChange={(e) => handleInputChange('section', e.target.value, 'studentInfo')}
                      placeholder="A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentSemester">Current Semester</Label>
                    <Input
                      id="currentSemester"
                      value={formData.studentInfo?.currentSemester || ''}
                      onChange={(e) => handleInputChange('currentSemester', e.target.value, 'studentInfo')}
                      placeholder="6"
                    />
                  </div>
                  <div>
                    <Label htmlFor="placementStatus">Placement Status</Label>
                    <Select 
                      value={formData.studentInfo?.placementStatus || ''} 
                      onValueChange={(value) => handleInputChange('placementStatus', value, 'studentInfo')}
                    >
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
              </div>
            )}

            {/* Faculty Information */}
            {user?.type === 'faculty' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Faculty Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="facultyDepartment">Department</Label>
                    <Select 
                      value={formData.facultyInfo?.department || ''} 
                      onValueChange={(value) => handleInputChange('department', value, 'facultyInfo')}
                    >
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
                    <Select 
                      value={formData.facultyInfo?.designation || ''} 
                      onValueChange={(value) => handleInputChange('designation', value, 'facultyInfo')}
                    >
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
              </div>
            )}

            {/* Professional Development */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Development
              </h3>
              
              <div>
                <Label htmlFor="skills">Skills</Label>
                <TagInput
                  id="skills"
                  values={formData.skills || []}
                  onChange={(vals) => handleArrayInputChange('skills', vals.join(','))}
                  placeholder="Type a skill and press Enter (e.g., React)"
                />
              </div>

              <div>
                <Label htmlFor="languages">Languages</Label>
                <TagInput
                  id="languages"
                  values={formData.languages || []}
                  onChange={(vals) => handleArrayInputChange('languages', vals.join(','))}
                  placeholder="Type a language and press Enter"
                />
              </div>

              <div>
                <Label htmlFor="interests">Interests</Label>
                <TagInput
                  id="interests"
                  values={formData.interests || []}
                  onChange={(vals) => handleArrayInputChange('interests', vals.join(','))}
                  placeholder="Type an interest and press Enter"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social & Professional Links
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={formData.socialLinks?.linkedin || ''}
                    onChange={(e) => handleInputChange('linkedin', e.target.value, 'socialLinks')}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div>
                  <Label htmlFor="github">GitHub Profile</Label>
                  <Input
                    id="github"
                    type="url"
                    value={formData.socialLinks?.github || ''}
                    onChange={(e) => handleInputChange('github', e.target.value, 'socialLinks')}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
              </div>
            </div>

            {/* Resume & Portfolio */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Resume & Portfolio
              </h3>
              
              <div>
                <Label htmlFor="resume">Resume URL</Label>
                <Input
                  id="resume"
                  type="url"
                  value={formData.resume}
                  onChange={(e) => handleInputChange('resume', e.target.value)}
                  placeholder="https://your-resume-link.com"
                />
              </div>

              <div>
                <Label htmlFor="portfolio">Portfolio URL</Label>
                <Input
                  id="portfolio"
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => handleInputChange('portfolio', e.target.value)}
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileForm;
