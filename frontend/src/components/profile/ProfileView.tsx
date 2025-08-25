import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Building, MapPin, Briefcase, GraduationCap, Calendar, Globe, Github, Linkedin, Twitter, Users, MessageSquare, Save, X, Mail, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import PostFeed from '@/components/posts/PostFeed';
import api, { getUserStats } from '@/services/api';
import { socketService } from '@/services/socketService';

interface UserProfile {
  _id: string;
  name: string;
	email: { college?: string; personal?: string };
  type: 'alumni' | 'student' | 'teacher';
	batch?: string;
	department?: string;
	company?: string;
	designation?: string;
	location?: string;
	experience?: string;
	bio?: string;
	professionalEmail?: string;
	avatar?: string;
	socialLinks?: { linkedin?: string; github?: string; twitter?: string; website?: string };
	skills?: string[];
	interests?: string[];
	
	education?: Array<{ degree: string; institution: string; year: string; gpa?: string }>;
	workExperience?: Array<{ company: string; position: string; startDate: string; endDate?: string; current: boolean; description?: string }>;
	createdAt?: string;
}

interface ProfileStats { posts: number; connections: number; events: number }

interface ProfileViewProps { profileUserId?: string }

export default function ProfileView({ profileUserId }: ProfileViewProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
	const [stats, setStats] = useState<ProfileStats>({ posts: 0, connections: 0, events: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
	const [isFollowing, setIsFollowing] = useState(false);
	const [isFollowedBy, setIsFollowedBy] = useState(false);
	const [connections, setConnections] = useState<any[]>([]);
	const [loadingConnections, setLoadingConnections] = useState(false);

	const navigate = useNavigate();
	const { userId } = useParams<{ userId: string }>();

	const targetUserId = profileUserId || userId || currentUser?._id;
	const isOwnProfileCheck = !profileUserId && (!userId || (currentUser?._id && userId === currentUser._id));

	const handleBack = () => navigate(-1);

	useEffect(() => {
		if (!targetUserId) return;
		loadProfile(targetUserId);
		loadStats(targetUserId);
		loadConnections(targetUserId);
		if (!isOwnProfileCheck) checkFollowStatus(targetUserId);
	}, [targetUserId, isOwnProfileCheck]);

	useEffect(() => {
		if (!currentUser?._id) return;
		const handleStatsUpdate = (updated: ProfileStats) => setStats(updated);
      socketService.onStatsUpdate(handleStatsUpdate);
		return () => { socketService.offStatsUpdate(); };
  }, [currentUser]);

	const loadProfile = async (id: string) => {
		try {
			setIsLoading(true);
			const res = await api.get(`/api/users/${id}`);
			setProfile(res.data);
			setIsOwnProfile(isOwnProfileCheck);
		} catch (err) {
			toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
		} finally { setIsLoading(false); }
	};

	const loadStats = async (id: string) => {
		try {
			const data = await getUserStats(id);
			setStats(data);
		} catch {}
	};

	const loadConnections = async (id: string) => {
		try {
			setLoadingConnections(true);
			const res = await api.get(`/api/users/${id}/connections`);
			setConnections(res.data?.connections || []);
		} catch { setConnections([]); } finally { setLoadingConnections(false); }
	};

	const checkFollowStatus = async (id: string) => {
		try {
			if (!currentUser?._id) return;
			const followRes = await api.get(`/api/follows/users?page=1&search=&userId=${id}`);
			const user = followRes.data?.users?.find((u: any) => u._id === id);
			if (user) { setIsFollowing(!!user.isFollowing); setIsFollowedBy(!!user.isFollowedBy); }
		} catch {}
	};

	const handleFollow = async () => {
		try {
			if (!profile?._id || !currentUser?._id) return;
			await api.post(`/api/follows/request/${profile._id}`);
			toast({ title: 'Follow Request Sent', description: 'The user will be notified.' });
		} catch { toast({ title: 'Error', description: 'Failed to send request', variant: 'destructive' }); }
	};

	const handleUnfollow = async () => {
		try {
			if (!profile?._id || !currentUser?._id) return;
			await api.delete(`/api/follows/unfollow/${profile._id}`);
			setIsFollowing(false);
			toast({ title: 'Success', description: 'Unfollowed successfully' });
		} catch { toast({ title: 'Error', description: 'Failed to unfollow', variant: 'destructive' }); }
	};

	const handleMessage = async () => {
		try {
			if (!profile?._id || !currentUser?._id) return;
			const res = await api.post('/api/conversations', { participantId: profile._id });
			window.location.href = `/dashboard?section=messages&conversation=${res.data.conversation._id}`;
		} catch { toast({ title: 'Error', description: 'Failed to start conversation', variant: 'destructive' }); }
	};

	const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">The profile you're looking for doesn't exist.</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
				<Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {isOwnProfile && (
							<>
								{/* Edit Profile functionality removed as requested */}
							</>
						)}
      </div>

			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
				<div className="flex items-start justify-between">
					<div className="flex items-start space-x-6">
						<Avatar className="h-24 w-24">
							<AvatarImage src={profile.avatar} alt={profile.name} />
							            <AvatarFallback className="text-2xl">{profile.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
						<div className="flex-1">
							<div className="flex items-center space-x-3 mb-2">
								{/* Edit Profile functionality removed as requested */}
								<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{profile.name}</h1>
								<Badge variant="secondary" className="text-sm">{profile.type?.charAt(0).toUpperCase() + profile.type?.slice(1)}</Badge>
								{profile.batch && <Badge variant="outline" className="text-sm">{profile.batch}</Badge>}
							</div>

							<div className="text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                  {profile.department && (
									<p className="flex items-center space-x-2"><GraduationCap className="h-4 w-4" /><span>{profile.department}</span></p>
								)}
								{profile.company && (
									<p className="flex items-center space-x-2">
										<Building className="h-4 w-4" />
										{/* Edit Profile functionality removed as requested */}
										<span>{profile.company}</span>
									</p>
								)}
								{profile.designation && (
									<p className="flex items-center space-x-2">
										<Briefcase className="h-4 w-4" />
										{/* Edit Profile functionality removed as requested */}
										<span>{profile.designation}</span>
									</p>
								)}
								{profile.location && (
									<p className="flex items-center space-x-2">
										<MapPin className="h-4 w-4" />
										{/* Edit Profile functionality removed as requested */}
										<span>{profile.location}</span>
									</p>
								)}
							</div>

							{profile.bio && (
								<div className="mb-4">
									{/* Edit Profile functionality removed as requested */}
									<p className="text-gray-700 dark:text-gray-300">{profile.bio}</p>
								</div>
                  )}
                </div>
              </div>

					<div className="flex flex-col space-y-2">
						{!isOwnProfile && (
							<>
								<Button onClick={isFollowing ? handleUnfollow : handleFollow} variant={isFollowing ? 'outline' : 'default'} className="w-full">{isFollowing ? 'Unfollow' : 'Follow'}</Button>
								{(isFollowing || isFollowedBy) && (
									<Button onClick={handleMessage} variant="outline" className="w-full"><MessageSquare className="h-4 w-4 mr-2" />Message</Button>
								)}
							</>
						)}

						{/* Edit Profile functionality removed as requested */}
					</div>
            </div>
          </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{stats.posts}</div><p className="text-sm text-muted-foreground">Posts</p></CardContent></Card>
				<Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{stats.connections}</div><p className="text-sm text-muted-foreground">Connections</p></CardContent></Card>
				<Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{stats.events}</div><p className="text-sm text-muted-foreground">Events</p></CardContent></Card>
				
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
				<TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
					<TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.email && (
							<div className="space-y-2">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contact Information</h3>
								<div className="space-y-1">
									{profile.email.college && (<p className="flex items-center space-x-2"><Mail className="h-4 w-4" /><span>College: {profile.email.college}</span></p>)}
									{profile.email.personal && (<p className="flex items-center space-x-2"><Mail className="h-4 w-4" /><span>Personal: {profile.email.personal}</span></p>)}
                  </div>
                  </div>
                )}

            <Card>
							<CardHeader><CardTitle className="flex items-center"><Briefcase className="w-5 h-5 mr-2" />Professional</CardTitle></CardHeader>
              <CardContent className="space-y-3">
								{profile.company && (<div className="flex items-center space-x-2"><Building className="w-4 h-4 text-muted-foreground" /><span>{profile.company}</span></div>)}
								{profile.designation && (<div className="flex items-center space-x-2"><Briefcase className="w-4 h-4 text-muted-foreground" /><span>{profile.designation}</span></div>)}
								{profile.experience && (<div className="flex items-center space-x-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span>{profile.experience}</span></div>)}
              </CardContent>
            </Card>
          </div>

					{(profile.skills?.length || 0) > 0 || (profile.interests?.length || 0) > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{(profile.skills?.length || 0) > 0 && (
                <Card>
									<CardHeader><CardTitle>Skills</CardTitle></CardHeader>
									<CardContent><div className="flex flex-wrap gap-2">{profile.skills!.map((s, i) => (<Badge key={i} variant="secondary">{s}</Badge>))}</div></CardContent>
                </Card>
              )}
							{(profile.interests?.length || 0) > 0 && (
                <Card>
									<CardHeader><CardTitle>Interests</CardTitle></CardHeader>
									<CardContent><div className="flex flex-wrap gap-2">{profile.interests!.map((s, i) => (<Badge key={i} variant="outline">{s}</Badge>))}</div></CardContent>
                </Card>
              )}
            </div>
					) : null}

					{profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
            <Card>
							<CardHeader><CardTitle>Social Links</CardTitle></CardHeader>
              <CardContent>
                <div className="flex space-x-4">
									{profile.socialLinks?.linkedin && (<a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"><Linkedin className="w-5 h-5" /><span>LinkedIn</span></a>)}
									{profile.socialLinks?.github && (<a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"><Github className="w-5 h-5" /><span>GitHub</span></a>)}
									{profile.socialLinks?.twitter && (<a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-blue-400 hover:text-blue-600"><Twitter className="w-5 h-5" /><span>Twitter</span></a>)}
									{profile.socialLinks?.website && (<a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-green-600 hover:text-green-800"><Globe className="w-5 h-5" /><span>Website</span></a>)}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

				<TabsContent value="posts" className="space-y-4"><PostFeed /></TabsContent>

				<TabsContent value="connections" className="space-y-4">
          <Card>
						<CardHeader><CardTitle className="flex items-center space-x-2"><Users className="h-5 w-5" /><span>Connections</span></CardTitle></CardHeader>
            <CardContent>
							{loadingConnections ? (
								<div className="text-center py-8">
									<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
									<p className="text-muted-foreground">Loading connections...</p>
								</div>
							) : connections.length > 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{connections.map((c) => (
										<div key={c._id} className="flex items-center space-x-3 p-3 border rounded-lg">
											            <Avatar className="h-10 w-10"><AvatarImage src={c.avatar} alt={c.name} /><AvatarFallback>{c.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
												<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.designation} at {c.company}</p>
												<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.department} • {c.batch}</p>
											</div>
											<Button variant="outline" size="sm" onClick={() => navigate(`/profile/${c._id}`)}>View Profile</Button>
										</div>
									))}
								</div>
							) : (
																	<div className="text-center py-8">
									<Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
									<p className="text-gray-500 dark:text-gray-400">{isOwnProfile ? "You haven't made any connections yet." : "This user hasn't made any connections yet."}</p>
								</div>
							)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience" className="space-y-6">
					{(profile.workExperience?.length || 0) > 0 ? (
            <div className="space-y-4">
							{profile.workExperience!.map((exp, i) => (
								<Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{exp.position}</h3>
                        <p className="text-muted-foreground">{exp.company}</p>
                      </div>
                      <div className="text-right">
												<p className="text-sm text-muted-foreground">{formatDate(exp.startDate)} - {exp.current ? 'Present' : exp.endDate ? formatDate(exp.endDate) : ''}</p>
												{exp.current && (<Badge className="bg-green-100 text-green-800">Current</Badge>)}
                      </div>
                    </div>
										{exp.description && (<p className="text-muted-foreground">{exp.description}</p>)}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
						<Card><CardContent className="p-8 text-center text-muted-foreground"><Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No work experience added yet.</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="education" className="space-y-6">
					{(profile.education?.length || 0) > 0 ? (
            <div className="space-y-4">
							{profile.education!.map((edu, i) => (
								<Card key={i}><CardContent className="p-6"><div className="flex justify-between items-start"><div><h3 className="text-lg font-semibold">{edu.degree}</h3><p className="text-muted-foreground">{edu.institution}</p>{edu.gpa && (<p className="text-sm text-muted-foreground">GPA: {edu.gpa}</p>)}</div><div className="text-right"><p className="text-muted-foreground">{edu.year}</p></div></div></CardContent></Card>
              ))}
            </div>
          ) : (
						<Card><CardContent className="p-8 text-center text-muted-foreground"><GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No education information added yet.</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
