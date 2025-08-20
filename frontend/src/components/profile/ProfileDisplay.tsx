import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Edit, Mail, Building, Calendar, User } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ProfileDisplayProps {
  isOwnProfile?: boolean;
  onEdit?: () => void;
}

const ProfileDisplay: React.FC<ProfileDisplayProps> = ({ isOwnProfile = false, onEdit }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-2xl">{user.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="capitalize">
                  {user.type}
                </Badge>
                {user.isVerified && (
                  <Badge variant="default" className="bg-green-500">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            {isOwnProfile && onEdit && (
              <Button onClick={onEdit} className="mt-4">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
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

        {/* Academic Information */}
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
            {user.batch && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Batch</Label>
                <p className="text-sm">{user.batch}</p>
              </div>
            )}
            {user.studentInfo?.rollNumber && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Roll Number</Label>
                <p className="text-sm">{user.studentInfo.rollNumber}</p>
              </div>
            )}
            {user.studentInfo?.graduationYear && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Graduation Year</Label>
                <p className="text-sm">{user.studentInfo.graduationYear}</p>
              </div>
            )}
            {user.studentInfo?.placementStatus && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Placement Status</Label>
                <p className="text-sm capitalize">{user.studentInfo.placementStatus.replace('_', ' ')}</p>
              </div>
            )}
            {user.studentInfo?.placementCompany && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Placement Company</Label>
                <p className="text-sm">{user.studentInfo.placementCompany}</p>
              </div>
            )}
            {user.studentInfo?.placementPackage && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Package</Label>
                <p className="text-sm">{user.studentInfo.placementPackage}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professional Experience - Only for Alumni */}
        {user.type === 'alumni' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Professional Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.alumniInfo?.currentCompany && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Current Company</Label>
                  <p className="text-sm">{user.alumniInfo.currentCompany}</p>
                </div>
              )}
              {user.alumniInfo?.jobTitle && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Job Title</Label>
                  <p className="text-sm">{user.alumniInfo.jobTitle}</p>
                </div>
              )}
              {user.alumniInfo?.experience && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Experience</Label>
                  <p className="text-sm">{user.alumniInfo.experience}</p>
                </div>
              )}
              {user.alumniInfo?.salary && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Salary</Label>
                  <p className="text-sm">{user.alumniInfo.salary}</p>
                </div>
              )}
              {user.alumniInfo?.workLocation && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Work Location</Label>
                  <p className="text-sm">{user.alumniInfo.workLocation}</p>
                </div>
              )}
              {user.alumniInfo?.industry && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Industry</Label>
                  <p className="text-sm">{user.alumniInfo.industry}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Faculty Information - Only for Faculty */}
        {user.type === 'faculty' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Faculty Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.facultyInfo?.designation && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Designation</Label>
                  <p className="text-sm">{user.facultyInfo.designation}</p>
                </div>
              )}
              {user.facultyInfo?.qualification && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Qualification</Label>
                  <p className="text-sm">{user.facultyInfo.qualification}</p>
                </div>
              )}
              {user.facultyInfo?.officeLocation && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Office Location</Label>
                  <p className="text-sm">{user.facultyInfo.officeLocation}</p>
                </div>
              )}
              {user.facultyInfo?.teachingSubjects && user.facultyInfo.teachingSubjects.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Teaching Subjects</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {user.facultyInfo.teachingSubjects.map((subject, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Professional Development */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Professional Development
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.skills && user.skills.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Skills</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {user.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {user.languages && user.languages.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Languages</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {user.languages.map((language, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {language}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {user.interests && user.interests.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Interests</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {user.interests.map((interest, index) => (
                    <Badge key={index} variant="default" className="text-xs bg-blue-500">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bio */}
        {user.bio && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{user.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Social Links */}
        {user.socialLinks && Object.keys(user.socialLinks).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Social Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.socialLinks.linkedin && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">LinkedIn</Label>
                  <a href={user.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {user.socialLinks.linkedin}
                  </a>
                </div>
              )}
              {user.socialLinks.github && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">GitHub</Label>
                  <a href={user.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {user.socialLinks.github}
                  </a>
                </div>
              )}
              {user.socialLinks.personalWebsite && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Personal Website</Label>
                  <a href={user.socialLinks.personalWebsite} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {user.socialLinks.personalWebsite}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Profile Completion Status */}
      {isOwnProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Profile Completion</span>
                <Badge variant={user.isProfileComplete ? "default" : "secondary"}>
                  {user.isProfileComplete ? "Complete" : "Incomplete"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Account Verification</span>
                <Badge variant={user.isVerified ? "default" : "secondary"}>
                  {user.isVerified ? "Verified" : "Pending"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfileDisplay;
