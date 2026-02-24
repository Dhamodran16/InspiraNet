import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  GraduationCap,
  Briefcase,
  Globe,
  Linkedin,
  Github,
  Twitter,
  ExternalLink,
  Edit,
  FileText,
  Award,
  Users,
  UserPlus,
  UserCheck,
  Code2,
  Link as LinkIcon
} from 'lucide-react';
import ProfileForm from './ProfileForm';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { socketService } from '@/services/socketService';
import { useNavigate } from 'react-router-dom';

interface ProfileDisplayProps {
  isOwnProfile?: boolean;
  onEdit?: () => void;
}

const PLACEMENT_STATUS_LABELS: Record<string, string> = {
  seeking: 'Seeking Placement',
  placed: 'Placed',
  not_interested: 'Not Interested in Placement',
  higher_studies: 'Higher Studies',
  entrepreneur: 'Entrepreneur / Self-Employed'
};

const formatPlacementStatus = (status?: string) => {
  if (!status) return 'Seeking Placement'; // default
  return PLACEMENT_STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};


const ProfileDisplay = ({ isOwnProfile = true, onEdit }: ProfileDisplayProps) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState({
    followers: 0,
    following: 0,
    mutual: 0
  });
  const [loadingConnections, setLoadingConnections] = useState(false);

  useEffect(() => {
    if (user?._id) {
      loadConnections();
      setupSocketListeners();
    }
  }, [user?._id]);

  const loadConnections = async () => {
    try {
      setLoadingConnections(true);
      const response = await api.get(`/api/users/${user?._id}/connections`);
      setConnections({
        followers: response.data.followers?.length || 0,
        following: response.data.following?.length || 0,
        mutual: response.data.mutual?.length || 0
      });
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const setupSocketListeners = () => {
    // Listen for real-time connection updates
    const handleFollowStatusUpdate = (data: any) => {
      if (data.followerId === user?._id || data.followeeId === user?._id) {
        loadConnections(); // Refresh connections count
      }
    };

    const handleUserFollowed = (data: any) => {
      if (data.followerId === user?._id || data.targetUserId === user?._id) {
        loadConnections(); // Refresh connections count
      }
    };

    const handleUserUnfollowed = (data: any) => {
      if (data.followerId === user?._id || data.targetUserId === user?._id) {
        loadConnections(); // Refresh connections count
      }
    };

    // Listen for profile updates
    const handleProfileUpdate = (data: { user: any }) => {
      if (data.user && data.user._id === user?._id) {
        console.log('🔄 Profile updated via socket in ProfileDisplay');
        // The user object from AuthContext will be updated by Settings component
        // This listener ensures we catch updates from other tabs/devices
        loadConnections(); // Refresh connections in case they changed
      }
    };

    socketService.onFollowStatusUpdate(handleFollowStatusUpdate);
    socketService.onUserFollowed?.(handleUserFollowed);
    socketService.onUserUnfollowed?.(handleUserUnfollowed);
    socketService.on('profile_updated', handleProfileUpdate);

    return () => {
      socketService.offFollowStatusUpdate();
      socketService.offUserFollowed?.();
      socketService.offUserUnfollowed?.();
      socketService.off('profile_updated', handleProfileUpdate);
    };
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No user data available</p>
        </div>
      </div>
    );
  }

  const socialLinks = user.socialLinks || {};
  const customSocialLinks = Array.isArray(socialLinks.customLinks) ? socialLinks.customLinks : [];
  const hasSocialLinks = Boolean(
    socialLinks.linkedin ||
    socialLinks.github ||
    socialLinks.twitter ||
    socialLinks.personalWebsite ||
    socialLinks.instagram ||
    socialLinks.facebook ||
    socialLinks.leetcode ||
    customSocialLinks.length > 0
  );

  // Note: This component now only displays the profile view
  // The edit functionality is handled by the parent Profile page

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xl">{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <div className="flex items-center space-x-2 text-gray-600">
              <span>{user.type?.charAt(0).toUpperCase() + user.type?.slice(1)}</span>
              {/* Information Visibility: Show Department */}
              {(user.department || user.studentInfo?.department || user.facultyInfo?.department) && (
                <>
                  <span>•</span>
                  <span>{user.department || user.studentInfo?.department || user.facultyInfo?.department}</span>
                </>
              )}
              {/* Information Visibility: Show Batch Year - Check all possible locations */}
              {(user.batch || user.studentInfo?.batch) && (
                <>
                  <span>•</span>
                  <span>Batch {user.batch || user.studentInfo?.batch}</span>
                </>
              )}
              {/* Information Visibility: Show Company */}
              {(user.company || user.alumniInfo?.currentCompany) && (
                <>
                  <span>•</span>
                  <span>{user.company || user.alumniInfo?.currentCompany}</span>
                </>
              )}
            </div>
            {/* Show year of study for students */}
            {user.type === 'student' && user.studentInfo?.currentYear && (
              <p className="text-sm text-gray-500 mt-1">
                {user.studentInfo.currentYear} • {user.studentInfo.currentSemester || 'Student'}
              </p>
            )}
            {/* Show designation for faculty */}
            {user.type === 'faculty' && user.facultyInfo?.designation && (
              <p className="text-sm text-gray-500 mt-1">
                {user.facultyInfo.designation}
              </p>
            )}
            {/* Show current company for alumni */}
            {user.type === 'alumni' && user.alumniInfo?.currentCompany && (
              <p className="text-sm text-gray-500 mt-1">
                {user.alumniInfo.jobTitle} at {user.alumniInfo.currentCompany}
              </p>
            )}
          </div>
        </div>
        {isOwnProfile && onEdit && (
          <Button onClick={onEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information - Only show if data exists (email shown in Contact Info, not here) */}
        {(user.phone || (user as any).dateOfBirth || (user as any).location || (user as any).city || (user as any).state || (user as any).country) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.phone && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Phone</Label>
                  <p className="text-sm">{user.phone}</p>
                </div>
              )}
              {(user as any).dateOfBirth && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Date of Birth</Label>
                  <p className="text-sm">{new Date((user as any).dateOfBirth).toLocaleDateString()}</p>
                </div>
              )}
              {(user as any).location && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Location</Label>
                  <p className="text-sm">{(user as any).location}</p>
                </div>
              )}
              {((user as any).city || (user as any).state || (user as any).country) && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Address</Label>
                  <p className="text-sm">
                    {[(user as any).city, (user as any).state, (user as any).country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Information — shows College Email + Personal Email only */}
        {(user.email?.college || user.email?.personal) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.email?.college && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">College Email ID</Label>
                  <p className="text-sm font-mono">{user.email.college}</p>
                </div>
              )}
              {user.email?.personal && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Personal Email ID</Label>
                  <p className="text-sm font-mono">{user.email.personal}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Information Visibility: Show Location */}
        {((user as any).location || (user as any).city || (user as any).state || (user as any).country) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(user as any).location && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Location</Label>
                  <p className="text-sm">{(user as any).location}</p>
                </div>
              )}
              {((user as any).city || (user as any).state || (user as any).country) && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Address</Label>
                  <p className="text-sm">
                    {[(user as any).city, (user as any).state, (user as any).country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Information Visibility: Show Company */}
        {(user.company || user.alumniInfo?.currentCompany) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{user.company || user.alumniInfo?.currentCompany}</p>
            </CardContent>
          </Card>
        )}

        {/* Information Visibility: Show Batch Year - Check all possible locations */}
        {(user.batch || user.studentInfo?.batch) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Batch Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{user.batch || user.studentInfo?.batch}</p>
            </CardContent>
          </Card>
        )}

        {/* Information Visibility: Show Department */}
        {(user.department || user.studentInfo?.department || user.facultyInfo?.department) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{user.department || user.studentInfo?.department || user.facultyInfo?.department}</p>
            </CardContent>
          </Card>
        )}

        {/* Bio - Only show if exists */}
        {(user as any).bio && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Bio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{(user as any).bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Student Information - Only show if user is student and data exists */}
        {user.type === 'student' && user.studentInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.studentInfo.department && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Department</Label>
                  <p className="text-sm">{user.studentInfo.department}</p>
                </div>
              )}
              {user.studentInfo.batch && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Batch</Label>
                  <p className="text-sm">{user.studentInfo.batch}</p>
                </div>
              )}
              {user.studentInfo.currentYear && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Current Year</Label>
                  <p className="text-sm">{user.studentInfo.currentYear}</p>
                </div>
              )}
              {user.studentInfo.currentSemester && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Current Semester</Label>
                  <p className="text-sm">{user.studentInfo.currentSemester}</p>
                </div>
              )}
              {user.studentInfo.section && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Section</Label>
                  <p className="text-sm">{user.studentInfo.section}</p>
                </div>
              )}
              {user.studentInfo.specialization && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Specialization</Label>
                  <p className="text-sm">{user.studentInfo.specialization}</p>
                </div>
              )}
              {user.studentInfo.cgpa && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">CGPA</Label>
                  <p className="text-sm">{user.studentInfo.cgpa}</p>
                </div>
              )}
              {/* Roll Number */}
              {user.studentInfo.rollNumber && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Roll Number</Label>
                  <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{user.studentInfo.rollNumber}</p>
                </div>
              )}
              {/* Student ID - Only visible to profile owner */}
              {isOwnProfile && user.studentInfo.studentId && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Student ID</Label>
                  <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{user.studentInfo.studentId}</p>
                </div>
              )}
              {user.studentInfo.subjects && user.studentInfo.subjects.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Subjects</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.studentInfo.subjects.map((subject: string, index: number) => (
                      <Badge key={index} variant="outline">{subject}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {user.studentInfo && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Placement Status</Label>
                  <Badge variant={!user.studentInfo.placementStatus || user.studentInfo.placementStatus === 'placed' ? 'default' : 'secondary'}>
                    {formatPlacementStatus(user.studentInfo.placementStatus)}
                  </Badge>
                </div>
              )}
              {user.studentInfo.placementCompany && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Placement Company</Label>
                  <p className="text-sm">{user.studentInfo.placementCompany}</p>
                </div>
              )}
              {user.studentInfo.placementPackage && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Package</Label>
                  <p className="text-sm">{user.studentInfo.placementPackage}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Faculty Information - Only show if user is faculty and data exists */}
        {user.type === 'faculty' && user.facultyInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Faculty Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.facultyInfo.department && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Department</Label>
                  <p className="text-sm">{user.facultyInfo.department}</p>
                </div>
              )}
              {user.facultyInfo.designation && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Designation</Label>
                  <p className="text-sm">{user.facultyInfo.designation}</p>
                </div>
              )}
              {user.facultyInfo.qualification && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Qualification</Label>
                  <p className="text-sm">{user.facultyInfo.qualification}</p>
                </div>
              )}
              {user.facultyInfo.officeLocation && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Office Location</Label>
                  <p className="text-sm">{user.facultyInfo.officeLocation}</p>
                </div>
              )}
              {user.facultyInfo.officeHours && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Office Hours</Label>
                  <p className="text-sm">{user.facultyInfo.officeHours}</p>
                </div>
              )}
              {user.facultyInfo.researchAreas && user.facultyInfo.researchAreas.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Research Areas</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.facultyInfo.researchAreas.map((area: string, index: number) => (
                      <Badge key={index} variant="outline">{area}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {user.facultyInfo.teachingSubjects && user.facultyInfo.teachingSubjects.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Teaching Subjects</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.facultyInfo.teachingSubjects.map((subject: string, index: number) => (
                      <Badge key={index} variant="secondary">{subject}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {user.facultyInfo.consultationAvailable !== undefined && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Consultation Available</Label>
                  <Badge variant={user.facultyInfo.consultationAvailable ? 'default' : 'secondary'}>
                    {user.facultyInfo.consultationAvailable ? 'Yes' : 'No'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alumni Information - Only show if user is alumni and data exists */}
        {user.type === 'alumni' && user.alumniInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Alumni Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.alumniInfo.currentCompany && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Current Company</Label>
                  <p className="text-sm">{user.alumniInfo.currentCompany}</p>
                </div>
              )}
              {user.alumniInfo.jobTitle && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Job Title</Label>
                  <p className="text-sm">{user.alumniInfo.jobTitle}</p>
                </div>
              )}
              {user.alumniInfo.experience && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Experience</Label>
                  <p className="text-sm">{user.alumniInfo.experience}</p>
                </div>
              )}
              {user.alumniInfo.workLocation && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Work Location</Label>
                  <p className="text-sm">{user.alumniInfo.workLocation}</p>
                </div>
              )}
              {user.alumniInfo.industry && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Industry</Label>
                  <p className="text-sm">{user.alumniInfo.industry}</p>
                </div>
              )}
              {user.alumniInfo.salary && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Salary</Label>
                  <p className="text-sm">{user.alumniInfo.salary}</p>
                </div>
              )}
              {user.alumniInfo.mentorshipOffering !== undefined && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Mentorship Offering</Label>
                  <Badge variant={user.alumniInfo.mentorshipOffering ? 'default' : 'secondary'}>
                    {user.alumniInfo.mentorshipOffering ? 'Yes' : 'No'}
                  </Badge>
                </div>
              )}
              {user.alumniInfo.mentorshipAreas && user.alumniInfo.mentorshipAreas.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Mentorship Areas</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.alumniInfo.mentorshipAreas.map((area: string, index: number) => (
                      <Badge key={index} variant="outline">{area}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Skills & Interests */}
        {((user as any).skills?.length > 0 || (user as any).interests?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Skills &amp; Interests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(user as any).skills && (user as any).skills.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(user as any).skills.map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {(user as any).interests && (user as any).interests.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Interests</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(user as any).interests.map((interest: string, index: number) => (
                      <Badge key={index} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Social Links - Only show if data exists */}
        {hasSocialLinks && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <Linkedin className="w-5 h-5" />
                  <span>LinkedIn</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {socialLinks.github && (
                <a
                  href={socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <Github className="w-5 h-5" />
                  <span>GitHub</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {socialLinks.leetcode && (
                <a
                  href={socialLinks.leetcode}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-purple-600 hover:text-purple-800"
                >
                  <Code2 className="w-5 h-5" />
                  <span>LeetCode</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-600"
                >
                  <Twitter className="w-5 h-5" />
                  <span>Twitter</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {socialLinks.personalWebsite && (
                <a
                  href={socialLinks.personalWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-green-600 hover:text-green-800"
                >
                  <Globe className="w-5 h-5" />
                  <span>Website</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {customSocialLinks.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Custom Links
                  </Label>
                  {customSocialLinks.map((link, index) => (
                    <a
                      key={`${link.label}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-primary hover:text-primary/80"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>{link.label}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resume & Portfolio - Only show if data exists */}
        {((user as any).resume || (user as any).portfolio) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resume & Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(user as any).resume && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Resume</Label>
                  <a
                    href={(user as any).resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Resume</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
              {(user as any).portfolio && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Portfolio</Label>
                  <a
                    href={(user as any).portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <Globe className="w-4 h-4" />
                    <span>View Portfolio</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Work Experience - Only show if data exists */}
        {(user as any).workExperience && (user as any).workExperience.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(user as any).workExperience.map((exp: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">{exp.position}</h4>
                  <p className="text-sm text-gray-600">{exp.company}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(exp.startDate).toLocaleDateString()} - {exp.current ? 'Present' : new Date(exp.endDate).toLocaleDateString()}
                  </p>
                  {exp.description && (
                    <p className="text-sm text-gray-700 mt-2">{exp.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Education - Only show if data exists */}
        {(user as any).education && (user as any).education.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(user as any).education.map((edu: any, index: number) => (
                <div key={index} className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">{edu.degree}</h4>
                  <p className="text-sm text-gray-600">{edu.institution}</p>
                  <p className="text-xs text-gray-500">{edu.year}</p>
                  {edu.gpa && (
                    <p className="text-sm text-gray-700">GPA: {edu.gpa}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Profile Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Verification Status</span>
              <Badge variant={user.isVerified ? "default" : "secondary"}>
                {user.isVerified ? "Verified" : "Pending"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Profile Completion</span>
              <Badge variant={user.isProfileComplete ? "default" : "secondary"}>
                {user.isProfileComplete ? "Complete" : "Incomplete"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Connections Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConnections ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <UserPlus className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{connections.followers}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <UserCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{connections.following}</div>
                  <div className="text-sm text-gray-600">Following</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{connections.mutual}</div>
                  <div className="text-sm text-gray-600">Mutual</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mutual Connections Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mutual Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MutualConnectionsList userId={user._id} />
          </CardContent>
        </Card>

        {/* Events Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No events to display</p>
              <p className="text-xs text-gray-500 mt-1">Events you attend will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Mutual Connections List Component
interface MutualConnectionsListProps {
  userId: string;
}

const MutualConnectionsList = ({ userId }: MutualConnectionsListProps) => {
  const [mutualConnections, setMutualConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadMutualConnections();
  }, [userId]);

  const loadMutualConnections = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/users/${userId}/connections`);
      const mutual = response.data?.mutual || [];
      setMutualConnections(mutual);
    } catch (error) {
      console.error('Error loading mutual connections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (mutualConnections.length === 0) {
    return (
      <div className="text-center py-4">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">No mutual connections yet</p>
        <p className="text-xs text-gray-500 mt-1">People you both follow will appear here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {mutualConnections.map((connection) => (
        <div
          key={connection._id}
          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
          onClick={() => navigate(`/profile/${connection._id}`)}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={connection.avatar} />
            <AvatarFallback>
              {connection.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{connection.name}</h4>
            <p className="text-xs text-gray-600">{connection.type}</p>
            {connection.department && (
              <p className="text-xs text-gray-500">{connection.department}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${connection._id}`);
            }}
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default ProfileDisplay;
