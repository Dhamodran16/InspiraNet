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
  UserCheck
} from 'lucide-react';
import ProfileForm from './ProfileForm';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { socketService } from '@/services/socketService';

interface ProfileDisplayProps {
  isOwnProfile?: boolean;
  onEdit?: () => void;
}

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

    socketService.onFollowStatusUpdate(handleFollowStatusUpdate);
    socketService.onUserFollowed?.(handleUserFollowed);
    socketService.onUserUnfollowed?.(handleUserUnfollowed);

    return () => {
      socketService.offFollowStatusUpdate();
      socketService.offUserFollowed?.();
      socketService.offUserUnfollowed?.();
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

  // Note: This component now only displays the profile view
  // The edit functionality is handled by the parent Profile page

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xl">{user.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-gray-600">{user.type?.charAt(0).toUpperCase() + user.type?.slice(1)} • {user.department}</p>
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
        {/* Basic Information - Only show if data exists */}
        {(user.email?.personal || user.phone || (user as any).dateOfBirth || (user as any).location) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
        </CardHeader>
            <CardContent className="space-y-4">
              {user.email?.personal && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Personal Email</Label>
                  <p className="text-sm">{user.email.personal}</p>
                </div>
              )}
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
            </CardContent>
      </Card>
        )}

        {/* Contact Information - Only show if data exists */}
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
                <Label className="text-sm font-medium text-gray-600">College Email</Label>
                <p className="text-sm">{user.email.college}</p>
              </div>
            )}
            {user.email?.personal && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Personal Email</Label>
                <p className="text-sm">{user.email.personal}</p>
              </div>
            )}
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

        {/* Academic Information - Only show if data exists */}
        {(user.department || (user as any).academicInfo) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.department && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Department</Label>
                <p className="text-sm">{user.department}</p>
              </div>
            )}
              {(user as any).academicInfo?.degree && (
              <div>
                  <Label className="text-sm font-medium text-gray-600">Degree</Label>
                  <p className="text-sm">{(user as any).academicInfo.degree}</p>
              </div>
            )}
              {(user as any).academicInfo?.institution && (
              <div>
                  <Label className="text-sm font-medium text-gray-600">Institution</Label>
                  <p className="text-sm">{(user as any).academicInfo.institution}</p>
              </div>
            )}
              {(user as any).academicInfo?.graduationYear && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Graduation Year</Label>
                  <p className="text-sm">{(user as any).academicInfo.graduationYear}</p>
              </div>
            )}
              {(user as any).academicInfo?.cgpa && (
              <div>
                  <Label className="text-sm font-medium text-gray-600">CGPA</Label>
                  <p className="text-sm">{(user as any).academicInfo.cgpa}</p>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Professional Information - Only show if data exists */}
        {((user as any).skills || (user as any).interests || (user as any).areaOfInterest) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(user as any).areaOfInterest && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Area of Interest</Label>
                  <p className="text-sm">{(user as any).areaOfInterest}</p>
                </div>
              )}
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
        {(user as any).socialLinks && Object.values((user as any).socialLinks).some(Boolean) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(user as any).socialLinks?.linkedin && (
                <a 
                  href={(user as any).socialLinks.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <Linkedin className="w-5 h-5" />
                  <span>LinkedIn</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {(user as any).socialLinks?.github && (
                <a 
                  href={(user as any).socialLinks.github} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <Github className="w-5 h-5" />
                  <span>GitHub</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {(user as any).socialLinks?.twitter && (
                <a 
                  href={(user as any).socialLinks.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-600"
                >
                  <Twitter className="w-5 h-5" />
                  <span>Twitter</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {(user as any).socialLinks?.website && (
                <a 
                  href={(user as any).socialLinks.website} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center space-x-2 text-green-600 hover:text-green-800"
                >
                  <Globe className="w-5 h-5" />
                  <span>Website</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
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
              <Award className="h-5 w-5" />
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
      </div>
    </div>
  );
};

export default ProfileDisplay;
