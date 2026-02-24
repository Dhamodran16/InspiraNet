import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Mail,
  Building,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Globe,
  Github,
  Linkedin,
  Twitter,
  Award,
  BookOpen,
  Users,
  Heart,
  Share2,
  MessageSquare,
  Phone,
  MapPin as LocationIcon,
  UserPlus,
  UserMinus,
  Eye,
  ExternalLink,
  FileText,
  Code2,
  Link as LinkIcon
} from 'lucide-react';
import UserPostsFeed from '@/components/posts/UserPostsFeed';
import { getUserStats } from '@/services/api';
import { socketService } from '@/services/socketService';
import api from '@/services/api';

interface UserProfile {
  _id: string;
  name: string;
  email: {
    college?: string;
    personal?: string;
  };
  type: 'alumni' | 'student' | 'teacher' | 'faculty';
  batch?: string;
  department?: string;
  company?: string;
  designation?: string;
  location?: string;
  experience?: string;
  bio?: string;
  professionalEmail?: string;
  phone?: string;
  avatar?: string;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
    leetcode?: string;
    customLinks?: { label: string; url: string }[];
  };
  skills?: string[];
  interests?: string[];
  resume?: string;
  portfolio?: string;
  city?: string;
  state?: string;
  country?: string;
  studentInfo?: {
    batch?: string;
    department?: string;
    graduationYear?: string;
    placementStatus?: string;
    placementCompany?: string;
    placementPackage?: string;
  };
  alumniInfo?: {
    graduationYear?: number;
    currentCompany?: string;
    jobTitle?: string;
  };

  education: Array<{
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }>;
  workExperience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
  }>;
  createdAt: string;
}

interface ProfileStats {
  posts: number;
  connections: number;
  events: number;
}

const formatPlacementStatus = (status?: string) => {
  if (!status) return 'Permanent';
  if (status === 'placed') return 'Permanent';
  const readable = status.replace(/_/g, ' ');
  return readable.charAt(0).toUpperCase() + readable.slice(1);
};

export default function OtherUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    posts: 0,
    connections: 0,
    events: 0,

  });
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'followers' | 'mutual' | 'requested' | 'not-following'>('none');
  const [connections, setConnections] = useState<any[]>([]);
  const [currentUserFollowing, setCurrentUserFollowing] = useState<string[]>([]);

  const loadProfile = async (targetUserId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/users/${targetUserId}`);
      setProfile(response.data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (targetUserId: string) => {
    try {
      const response = await getUserStats(targetUserId);
      setStats(response);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadConnections = async (targetUserId: string) => {
    try {
      const response = await api.get(`/api/users/${targetUserId}/connections`);
      console.log('OtherUserProfile - Connections API response:', response.data);
      // Use mutual connections from the response
      const mutualConnections = response.data?.mutual || [];
      // Filter out the current user from connections
      const filteredConnections = mutualConnections.filter(
        (connection: any) => connection._id !== currentUser?._id
      );
      console.log('Mutual connections:', filteredConnections);
      setConnections(filteredConnections);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const loadCurrentUserFollowing = async () => {
    if (!currentUser?._id) return;
    try {
      const response = await api.get(`/api/users/${currentUser._id}/connections`);
      const following = response.data?.following || [];
      const followingIds = following.map((user: any) => user._id);
      setCurrentUserFollowing(followingIds);
    } catch (error) {
      console.error('Error loading current user following:', error);
    }
  };

  const checkFollowStatus = async (targetUserId: string) => {
    try {
      const response = await api.get(`/api/follows/status/${targetUserId}`);
      setFollowStatus(response.data.status);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      setLoading(true);
      await api.post(`/api/follows/request/${userId}`);
      setFollowStatus('requested');
      toast({
        title: "Follow Request Sent",
        description: "Your request is pending approval",
      });
    } catch (error: any) {
      console.error('Error sending follow request:', error);

      // Handle specific error cases
      let errorMessage = "Failed to send follow request";
      let errorTitle = "Error";

      if (error.response?.status === 409) {
        errorTitle = "Already Following";
        errorMessage = error.response.data?.error || "You are already following this user or have a pending request";
        // Update follow status based on the specific error
        if (error.response.data?.error?.includes('already following')) {
          setFollowStatus('following');
        } else if (error.response.data?.error?.includes('request already sent')) {
          setFollowStatus('requested');
        }
      } else if (error.response?.status === 429) {
        errorTitle = "Limit Exceeded";
        errorMessage = error.response.data?.error || "Daily follow request limit exceeded";
      } else if (error.response?.status === 404) {
        errorTitle = "User Not Found";
        errorMessage = "The user you're trying to follow doesn't exist";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      setLoading(true);
      await api.delete(`/api/follows/unfollow/${userId}`);
      setFollowStatus('not-following');
      toast({
        title: "Unfollowed",
        description: "You are no longer following this user",
      });
    } catch (error: any) {
      console.error('Error unfollowing user:', error);

      // Handle specific error cases
      let errorMessage = "Failed to unfollow user";
      let errorTitle = "Error";

      if (error.response?.status === 400) {
        errorTitle = "Cannot Unfollow";
        errorMessage = error.response.data?.error || "You are not following this user or cannot unfollow";
        // Update follow status based on the specific error
        if (error.response.data?.error?.includes('not following')) {
          setFollowStatus('not-following');
        }
      } else if (error.response?.status === 404) {
        errorTitle = "User Not Found";
        errorMessage = "The user you're trying to unfollow doesn't exist";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    navigate(`/dashboard?section=messages&user=${userId}`);
  };

  useEffect(() => {
    if (userId) {
      loadProfile(userId);
      loadStats(userId);
      loadConnections(userId);
      checkFollowStatus(userId);
      loadCurrentUserFollowing();
    }
  }, [userId, currentUser]);

  // Listen for profile updates via socket
  useEffect(() => {
    if (!userId) return;

    const handleProfileUpdate = (data: { userId: string; user: any }) => {
      if (data.userId === userId) {
        console.log('🔄 Profile updated via socket, reloading...');
        loadProfile(userId);
        loadStats(userId);
      }
    };

    socketService.on('user_profile_updated', handleProfileUpdate);

    return () => {
      socketService.off('user_profile_updated', handleProfileUpdate);
    };
  }, [userId]);

  // Handle case where userId is not provided
  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
          <p className="text-gray-600 mb-4">The requested user profile could not be found.</p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!currentUser?._id || !userId) return;

    // Listen for follow status updates
    const handleFollowStatusUpdate = (data: any) => {
      console.log('🔄 OtherUserProfile - Follow status update received:', data);
      if (data.followerId === userId || data.followeeId === userId) {
        console.log('🔄 Refreshing other user profile data due to follow status change');
        // Refresh connections, stats, and follow status
        loadConnections(userId);
        loadStats(userId);
        checkFollowStatus(userId);
      }
    };

    socketService.onFollowStatusUpdate(handleFollowStatusUpdate);

    return () => {
      socketService.offFollowStatusUpdate();
    };
  }, [currentUser, userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The user profile you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const socialLinks = profile.socialLinks || {};
  const customSocialLinks = Array.isArray(socialLinks.customLinks) ? socialLinks.customLinks : [];
  const hasSocialLinks = Boolean(
    socialLinks.linkedin ||
    socialLinks.github ||
    socialLinks.twitter ||
    socialLinks.website ||
    socialLinks.leetcode ||
    customSocialLinks.length > 0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>

            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleMessage}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>

              {(followStatus === 'none' || followStatus === 'not-following') && (
                <Button
                  onClick={() => handleFollow(userId)}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {loading ? 'Sending...' : 'Follow'}
                </Button>
              )}

              {followStatus === 'requested' && (
                <Button
                  variant="outline"
                  onClick={() => handleUnfollow(userId)}
                  disabled={loading}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  {loading ? 'Cancelling...' : 'Cancel Request'}
                </Button>
              )}

              {followStatus === 'following' && (
                <Button
                  variant="outline"
                  onClick={() => handleUnfollow(userId)}
                  disabled={loading}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  {loading ? 'Unfollowing...' : 'Unfollow'}
                </Button>
              )}

              {followStatus === 'mutual' && (
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Mutual
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-2xl">
                    {profile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{profile.name}</CardTitle>
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{profile.type}</Badge>
                  {profile.department && (
                    <>
                      <span>•</span>
                      <span>{profile.department}</span>
                    </>
                  )}
                  {(profile.batch || (profile.type === 'alumni' && profile.alumniInfo?.graduationYear)) && (
                    <>
                      <span>•</span>
                      <span>{profile.batch || (profile.type === 'alumni' ? profile.alumniInfo?.graduationYear : '')}</span>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {profile.bio && (
                  <div>
                    <h4 className="font-medium mb-2">Bio</h4>
                    <p className="text-sm text-muted-foreground">{profile.bio}</p>
                  </div>
                )}

                {/* Information Visibility - Show Email Address */}
                {profile.email?.college && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.email.college}</span>
                  </div>
                )}
                {profile.email?.personal && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.email.personal}</span>
                  </div>
                )}

                {/* Information Visibility - Show Phone Number */}
                {profile.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}

                {/* Information Visibility - Show Location */}
                {profile.location && (
                  <div className="flex items-center space-x-2">
                    <LocationIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.location}</span>
                  </div>
                )}

                {(profile.city || profile.state || profile.country) && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                {/* Information Visibility - Show Company */}
                {profile.company && (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.company}</span>
                  </div>
                )}
                {profile.studentInfo && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Placement Status</h4>
                    <Badge variant={!profile.studentInfo.placementStatus || profile.studentInfo.placementStatus === 'placed' ? 'default' : 'secondary'}>
                      {formatPlacementStatus(profile.studentInfo.placementStatus)}
                    </Badge>
                  </div>
                )}

                {/* Information Visibility - Show Batch Year - Check all possible locations */}
                {(profile.batch || (profile.type === 'alumni' && profile.alumniInfo?.graduationYear)) && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Batch {profile.batch || (profile.type === 'alumni' ? profile.alumniInfo?.graduationYear : '')}</span>
                  </div>
                )}

                {/* Information Visibility - Show Department */}
                {profile.department && (
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.department}</span>
                  </div>
                )}

                {profile.designation && (
                  <div className="flex items-center space-x-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.designation}</span>
                  </div>
                )}

                {profile.experience && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.experience} years experience</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.posts}</div>
                    <div className="text-sm text-muted-foreground">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.connections}</div>
                    <div className="text-sm text-muted-foreground">Connections</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.events}</div>
                    <div className="text-sm text-muted-foreground">Events</div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Interests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <Badge key={index} variant="outline">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resume */}
            {profile.resume && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resume</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={profile.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Award className="h-4 w-4" />
                    <span>View Resume</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Social Links */}
            {hasSocialLinks && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Social Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {socialLinks.linkedin && (
                    <a
                      href={socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Linkedin className="h-4 w-4" />
                      <span>LinkedIn</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialLinks.github && (
                    <a
                      href={socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <Github className="h-4 w-4" />
                      <span>GitHub</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialLinks.leetcode && (
                    <a
                      href={socialLinks.leetcode}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-800"
                    >
                      <Code2 className="h-4 w-4" />
                      <span>LeetCode</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a
                      href={socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-600"
                    >
                      <Twitter className="h-4 w-4" />
                      <span>Twitter</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialLinks.website && (
                    <a
                      href={socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-800"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {customSocialLinks.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <LinkIcon className="h-3 w-3" />
                        Custom Links
                      </Label>
                      {customSocialLinks.map((link, index) => (
                        <a
                          key={`${link.label}-${index}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-sm text-primary hover:text-primary/80"
                        >
                          <LinkIcon className="h-4 w-4" />
                          <span>{link.label}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(profile.resume || profile.portfolio) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resume & Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.resume && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Resume</Label>
                      <a
                        href={profile.resume}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="h-4 w-4" />
                        <span>View Resume</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {profile.portfolio && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Portfolio</Label>
                      <a
                        href={profile.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800"
                      >
                        <Globe className="h-4 w-4" />
                        <span>View Portfolio</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="posts" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-4">
                <UserPostsFeed userId={userId || ''} showDeleteButton={false} />
              </TabsContent>




              <TabsContent value="connections" className="space-y-4">
                {connections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {connections.map((connection) => {
                      const isFollowing = currentUserFollowing.includes(connection._id);
                      return (
                        <Card key={connection._id} className="h-full">
                          <CardContent className="flex flex-col h-full p-4">
                            {/* Profile Info Section */}
                            <div className="flex items-start space-x-3 mb-4">
                              <Avatar className="h-12 w-12 flex-shrink-0">
                                <AvatarImage src={connection.avatar} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {connection.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{connection.name}</h4>
                                <p className="text-xs text-muted-foreground capitalize">{connection.type}</p>
                                {connection.department && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {connection.department}
                                  </p>
                                )}
                                {connection.batch && (
                                  <p className="text-xs text-muted-foreground">
                                    Batch {connection.batch}
                                  </p>
                                )}
                                {connection.company && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {connection.company}
                                  </p>
                                )}
                                {(connection.city || connection.state || connection.country) && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {[connection.city, connection.state, connection.country].filter(Boolean).join(', ')}
                                  </p>
                                )}
                                {connection.skills && connection.skills.length > 0 && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    Skills: {connection.skills.slice(0, 2).join(', ')}{connection.skills.length > 2 ? '...' : ''}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons Section */}
                            <div className="flex space-x-2 mt-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/profile/${connection._id}`)}
                                className="flex-1 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              {!isFollowing && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleFollow(connection._id)}
                                  className="flex-1 text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Follow
                                </Button>
                              )}
                              {isFollowing && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="flex-1 text-xs text-green-600 border-green-200"
                                >
                                  <UserMinus className="h-3 w-3 mr-1" />
                                  Following
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No connections yet</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
