import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  UserMinus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PostFeed from '@/components/posts/PostFeed';
import { getUserStats } from '@/services/api';
import { socketService } from '@/services/socketService';
import api from '@/services/api';
import { useNavigate, useParams } from 'react-router-dom';

interface UserProfile {
  _id: string;
  name: string;
  email: {
    college?: string;
    personal?: string;
  };
  type: 'alumni' | 'student' | 'teacher';
  batch: string;
  department: string;
  company: string;
  designation: string;
  location: string;
  experience: string;
  bio: string;
  professionalEmail: string;
  avatar: string;
  socialLinks: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
  };
  skills: string[];
  interests: string[];
  achievements: Array<{
    title: string;
    description: string;
    date: string;
    certificate?: string;
  }>;
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
  achievements: number;
}

interface OtherUserProfileProps {
  userId: string;
}

export default function OtherUserProfile({ userId }: OtherUserProfileProps) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    posts: 0,
    connections: 0,
    events: 0,
    achievements: 0
  });
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'followers' | 'mutual' | 'requested' | 'not-following'>('none');
  const [connections, setConnections] = useState<any[]>([]);

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
      const response = await api.get(`/api/follows/connections/${targetUserId}`);
      setConnections(response.data.connections || []);
    } catch (error) {
      console.error('Error loading connections:', error);
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
    } catch (error) {
      console.error('Error sending follow request:', error);
      toast({
        title: "Error",
        description: "Failed to send follow request",
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
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    navigate(`/messages?user=${userId}`);
  };

  useEffect(() => {
    if (userId) {
      loadProfile(userId);
      loadStats(userId);
      loadConnections(userId);
      checkFollowStatus(userId);
    }
  }, [userId]);

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
              
              {followStatus === 'none' && (
                <Button 
                  onClick={() => handleFollow(userId)}
                  disabled={loading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {loading ? 'Following...' : 'Follow'}
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
                    {profile.name.split(' ').map(n => n[0]).join('')}
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
                  {profile.batch && (
                    <>
                      <span>•</span>
                      <span>{profile.batch}</span>
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
                
                {profile.location && (
                  <div className="flex items-center space-x-2">
                    <LocationIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.location}</span>
                  </div>
                )}
                
                {profile.company && (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.company}</span>
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
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.achievements}</div>
                    <div className="text-sm text-muted-foreground">Achievements</div>
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

            {/* Social Links */}
            {profile.socialLinks && Object.values(profile.socialLinks).some(link => link) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Social Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {profile.socialLinks.linkedin && (
                    <a 
                      href={profile.socialLinks.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Linkedin className="h-4 w-4" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {profile.socialLinks.github && (
                    <a 
                      href={profile.socialLinks.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <Github className="h-4 w-4" />
                      <span>GitHub</span>
                    </a>
                  )}
                  {profile.socialLinks.twitter && (
                    <a 
                      href={profile.socialLinks.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-600"
                    >
                      <Twitter className="h-4 w-4" />
                      <span>Twitter</span>
                    </a>
                  )}
                  {profile.socialLinks.website && (
                    <a 
                      href={profile.socialLinks.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-800"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Website</span>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="posts" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-4">
                <PostFeed />
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4">
                {profile.achievements && profile.achievements.length > 0 ? (
                  <div className="space-y-4">
                    {profile.achievements.map((achievement, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Award className="h-5 w-5 text-yellow-500" />
                            <span>{achievement.title}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{achievement.date}</span>
                            {achievement.certificate && (
                              <a 
                                href={achievement.certificate} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                View Certificate
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No achievements yet</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="education" className="space-y-4">
                {profile.education && profile.education.length > 0 ? (
                  <div className="space-y-4">
                    {profile.education.map((edu, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <GraduationCap className="h-5 w-5 text-blue-500" />
                            <span>{edu.degree}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">{edu.institution}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{edu.year}</span>
                            {edu.gpa && <span>GPA: {edu.gpa}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No education history yet</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="connections" className="space-y-4">
                {connections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connections.map((connection) => (
                      <Card key={connection._id}>
                        <CardContent className="flex items-center space-x-3 p-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={connection.avatar} />
                            <AvatarFallback>
                              {connection.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium">{connection.name}</h4>
                            <p className="text-sm text-muted-foreground">{connection.type}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
