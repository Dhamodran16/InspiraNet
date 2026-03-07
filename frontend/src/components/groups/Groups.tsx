import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Search,
    Plus,
    Settings,
    MessageSquare,
    Info,
    ChevronRight,
    Lock,
    Globe,
    TrendingUp,
    MoreVertical,
    ArrowLeft,
    Shield,
    Clock,
    Layout,
    Share2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
    getGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    getGroupById,
    getGroupPosts,
    createGroupPost,
    deleteGroup
} from '@/services/api';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import PostRenderer from '@/components/posts/PostRenderer';
import postsApi from '@/services/postsApi';

const Groups = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [groupPosts, setGroupPosts] = useState<any[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [memberSearchTerm, setMemberSearchTerm] = useState('');

    // Create Group Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGroup, setNewGroup] = useState({
        name: '',
        description: '',
        isPrivate: false,
        allowStudentJoin: true,
        tags: ''
    });
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Fetch groups on mount
    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const data = await getGroups({ search: searchTerm });
            setGroups(data.groups || []);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to fetch groups",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGroupSelect = async (group: any) => {
        setSelectedGroup(group);
        setView('detail');
        fetchGroupPosts(group._id);
    };

    const fetchGroupPosts = async (groupId: string) => {
        try {
            setLoadingPosts(true);
            const data = await getGroupPosts(groupId);
            setGroupPosts(data.posts || []);
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to fetch group posts",
                variant: "destructive"
            });
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroup.name || !newGroup.description) {
            toast({
                title: "Validation Error",
                description: "Name and description are required",
                variant: "destructive"
            });
            return;
        }

        try {
            setCreatingGroup(true);
            const data = await createGroup({
                ...newGroup,
                tags: newGroup.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            });

            toast({
                title: "Success",
                description: "Group created successfully"
            });

            setIsCreateModalOpen(false);
            setNewGroup({
                name: '',
                description: '',
                isPrivate: false,
                allowStudentJoin: true,
                tags: ''
            });
            fetchGroups();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create group",
                variant: "destructive"
            });
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleJoinLeave = async (e: React.MouseEvent, group: any) => {
        e.stopPropagation();
        const isMember = group.members?.some((m: any) => (m.userId?._id || m.userId) === user?._id);

        try {
            if (isMember) {
                await leaveGroup(group._id);
                toast({ title: "Left Group", description: `You have left ${group.name}` });
            } else {
                await joinGroup(group._id);
                toast({ title: "Joined Group", description: `You are now a member of ${group.name}` });
            }

            // Update local state
            fetchGroups();
            if (selectedGroup?._id === group._id) {
                const updatedGroup = await getGroupById(group._id);
                setSelectedGroup(updatedGroup.group);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Operation failed",
                variant: "destructive"
            });
        }
    };

    const handleLike = async (postId: string) => {
        try {
            await postsApi.likePost(postId);
            setGroupPosts(prev => prev.map(p => {
                if (p._id === postId) {
                    const isLiked = p.likes?.some((l: any) => (l._id || l) === user?._id);
                    return {
                        ...p,
                        likes: isLiked
                            ? p.likes.filter((l: any) => (l._id || l) !== user?._id)
                            : [...(p.likes || []), user?._id]
                    };
                }
                return p;
            }));
        } catch (error) {
            console.error('Like failed:', error);
        }
    };

    const handleComment = async (postId: string, content: string) => {
        try {
            const response = await postsApi.commentOnPost(postId, { content });
            setGroupPosts(prev => prev.map(p => {
                if (p._id === postId) {
                    return {
                        ...p,
                        comments: [...(p.comments || []), response.comment]
                    };
                }
                return p;
            }));
        } catch (error) {
            toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
        }
    };

    const handlePollVote = async (postId: string, optionId: string) => {
        try {
            const data = await postsApi.voteOnPollOption(postId, optionId);
            setGroupPosts(prev => prev.map(p => {
                if (p._id === postId) {
                    return {
                        ...p,
                        pollDetails: data.pollDetails
                    };
                }
                return p;
            }));
        } catch (error) {
            toast({ title: "Error", description: "Failed to vote", variant: "destructive" });
        }
    };

    const handleDeletePost = async (postId: string) => {
        try {
            await postsApi.deletePost(postId);
            setGroupPosts(prev => prev.filter(p => p._id !== postId));
            toast({ title: "Post Deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!window.confirm("Are you sure you want to delete this group? All posts will be permanently removed.")) return;

        try {
            await deleteGroup(groupId);
            toast({ title: "Group Deleted" });
            setView('list');
            setSelectedGroup(null);
            fetchGroups();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete group",
                variant: "destructive"
            });
        }
    };

    const isUserAdmin = (group: any) => {
        if (!group || !user) return false;
        const adminMember = group.members?.find((m: any) =>
            (m.userId?._id === user._id || m.userId === user._id) && m.role === 'admin'
        );
        return !!adminMember || group.createdBy?._id === user._id || group.createdBy === user._id;
    };

    const getMemberCount = (group: any) => {
        return group.members?.length || 0;
    };

    const renderGroupCard = (group: any) => (
        <Card
            key={group._id}
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-slate-200"
            onClick={() => handleGroupSelect(group)}
        >
            <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-blue-600 font-bold text-xl group-hover:scale-110 transition-transform">
                            {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-slate-900 group-hover:text-blue-600 transition-colors">
                                {group.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                {group.isPrivate ? (
                                    <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 flex items-center gap-1">
                                        <Lock className="h-3 w-3" /> Private
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 flex items-center gap-1">
                                        <Globe className="h-3 w-3" /> Public
                                    </Badge>
                                )}
                                <span className="text-slate-500 text-sm flex items-center gap-1">
                                    <Users className="h-4 w-4" /> {getMemberCount(group)} members
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-slate-600 line-clamp-2 text-sm mb-4 h-10">
                    {group.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                    {group.tags?.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none px-3 py-0.5">
                            #{tag}
                        </Badge>
                    ))}
                    {group.tags?.length > 3 && (
                        <span className="text-xs text-slate-400">+{group.tags.length - 3} more</span>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex -space-x-2">
                        {group.members?.slice(0, 4).map((m: any, idx: number) => (
                            <Avatar key={idx} className="h-7 w-7 border-2 border-white">
                                <AvatarImage src={m.userId?.avatar} />
                                <AvatarFallback className="text-[10px] bg-blue-100 text-blue-600">
                                    {m.userId?.name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                        ))}
                        {group.members?.length > 4 && (
                            <div className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                +{group.members.length - 4}
                            </div>
                        )}
                    </div>
                    <Button
                        variant={group.members?.some((m: any) => m.userId?._id === user?._id || m.userId === user?._id) ? "outline" : "default"}
                        size="sm"
                        className={cn(
                            "rounded-full px-5 transition-all",
                            !group.members?.some((m: any) => m.userId?._id === user?._id || m.userId === user?._id) && "bg-blue-600 hover:bg-blue-700"
                        )}
                        onClick={(e) => handleJoinLeave(e, group)}
                    >
                        {group.members?.some((m: any) => m.userId?._id === user?._id || m.userId === user?._id) ? "Joined" : "Join Now"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-full bg-slate-50/50 p-4 md:p-8">
            {view === 'list' ? (
                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Communities</h1>
                            <p className="text-slate-500 mt-1 md:mt-2 text-sm md:text-lg">Connect with like-minded people in dedicated groups.</p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {(user?.type === 'alumni' || user?.type === 'faculty') && (
                                <Button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-xl md:rounded-2xl h-10 md:h-12 px-4 md:px-6"
                                >
                                    <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                                    Create Group
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Search & Stats */}
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card className="md:col-span-3 shadow-sm border-slate-200 rounded-2xl overflow-hidden">
                            <CardContent className="p-3 md:p-4">
                                <div className="relative group">
                                    <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        placeholder="Search for communities..."
                                        className="pl-10 md:pl-12 h-10 md:h-14 bg-slate-50 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 text-sm md:text-lg"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && fetchGroups()}
                                    />
                                    <Button
                                        className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg h-7 md:h-10 px-2 md:px-4 text-xs md:text-sm"
                                        onClick={fetchGroups}
                                    >
                                        Search
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-200 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                            <CardContent className="p-6 flex flex-col justify-center h-full">
                                <div className="flex items-center gap-3 mb-2">
                                    <TrendingUp className="h-5 w-5" />
                                    <span className="font-medium">Total Groups</span>
                                </div>
                                <div className="text-4xl font-black">{groups.length}</div>
                                <p className="text-indigo-100 text-xs mt-2 italic">Join the conversation today!</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Group Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-[320px] rounded-3xl bg-slate-200 animate-pulse" />
                            ))}
                        </div>
                    ) : groups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {groups.map(renderGroupCard)}
                        </div>
                    ) : (
                        <Card className="text-center py-20 bg-white border-dashed border-2 border-slate-200 rounded-3xl">
                            <CardContent>
                                <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Users className="h-12 w-12 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">No groups found</h3>
                                <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                                    We couldn't find any groups matching your search. Try adjusting your keywords or browse all groups.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-8 rounded-full px-8"
                                    onClick={() => { setSearchTerm(''); fetchGroups(); }}
                                >
                                    Clear Search
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                /* DETAIL VIEW */
                <div className="max-w-6xl mx-auto animate-in slide-in-from-right-10 duration-500">
                    {/* Back Navigation & Actions */}
                    <div className="flex items-center justify-between mb-8">
                        <Button
                            variant="ghost"
                            onClick={() => setView('list')}
                            className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-full pl-2 pr-6 h-12"
                        >
                            <ArrowLeft className="h-5 w-5 mr-3" />
                            Back to Groups
                        </Button>

                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" className="rounded-full h-11 w-11 hover:bg-blue-50 hover:text-blue-600 border-slate-200">
                                <Share2 className="h-5 w-5" />
                            </Button>
                            {isUserAdmin(selectedGroup) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="rounded-full h-11 w-11 border-slate-200">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl">
                                        <DropdownMenuItem className="py-3 cursor-pointer">
                                            <Settings className="h-4 w-4 mr-3" /> Edit Group Info
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="py-3 cursor-pointer">
                                            <Shield className="h-4 w-4 mr-3" /> Privacy Settings
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="py-3 cursor-pointer text-red-600 focus:text-red-600"
                                            onClick={() => handleDeleteGroup(selectedGroup._id)}
                                        >
                                            <Plus className="h-4 w-4 mr-3 rotate-45" /> Delete Group
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Group Header / Info - Prioritize feed on mobile but show info first if relevant */}
                        <div className="lg:col-span-1 space-y-6 flex flex-col">
                            <Card className="overflow-hidden shadow-xl border-none rounded-3xl order-first">
                                <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 relative">
                                    <div className="absolute -bottom-10 left-6">
                                        <div className="h-24 w-24 rounded-3xl bg-white p-2 shadow-2xl">
                                            <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-blue-600 text-4xl font-extrabold shadow-inner">
                                                {selectedGroup.name.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="pt-14 pb-8 px-8">
                                    <h2 className="text-3xl font-black text-slate-900">{selectedGroup.name}</h2>
                                    <div className="flex items-center gap-2 mt-3">
                                        {selectedGroup.isPrivate ? (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 px-3">Private Connection</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3">Public Community</Badge>
                                        )}
                                        <span className="text-slate-400 text-sm flex items-center gap-1.5 ml-2">
                                            <Clock className="h-4 w-4" /> Joined {new Date(selectedGroup.createdAt).getFullYear()}
                                        </span>
                                    </div>

                                    <p className="mt-6 text-slate-600 leading-relaxed text-sm">
                                        {selectedGroup.description}
                                    </p>

                                    <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500 flex items-center gap-2"><Users className="h-4 w-4" /> Members</span>
                                            <span className="font-bold text-slate-900">{getMemberCount(selectedGroup)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500 flex items-center gap-2"><Layout className="h-4 w-4" /> Total Posts</span>
                                            <span className="font-bold text-slate-900">{groupPosts.length}</span>
                                        </div>
                                    </div>

                                    <Button
                                        className={cn(
                                            "w-full mt-10 rounded-2xl h-14 font-bold text-lg transition-all",
                                            selectedGroup.members?.some((m: any) => m.userId?._id === user?._id || m.userId === user?._id)
                                                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200"
                                        )}
                                        onClick={(e) => handleJoinLeave(e, selectedGroup)}
                                    >
                                        {selectedGroup.members?.some((m: any) => m.userId?._id === user?._id || m.userId === user?._id) ? 'Leave Community' : 'Join Community'}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl shadow-sm border-slate-200 hidden md:block">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Info className="h-5 w-5 text-blue-500" />
                                        About Creator
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 p-2">
                                        <Avatar className="h-12 w-12 border border-slate-100">
                                            <AvatarImage src={selectedGroup.createdBy?.avatar} />
                                            <AvatarFallback className="bg-slate-100 text-slate-600">
                                                {selectedGroup.createdBy?.name?.charAt(0) || 'C'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-slate-900">{selectedGroup.createdBy?.name || 'KEC Admin'}</p>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{selectedGroup.createdBy?.type || 'Faculty'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Feed and Tabs */}
                        <div className="lg:col-span-2 space-y-6 order-last lg:order-none">
                            <Tabs defaultValue="posts" className="w-full">
                                <TabsList className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full h-16 mb-4">
                                    <TabsTrigger value="posts" className="flex-1 rounded-xl h-full data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-lg font-medium">Feed</TabsTrigger>
                                    <TabsTrigger value="members" className="flex-1 rounded-xl h-full data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-lg font-medium">Members</TabsTrigger>
                                    <TabsTrigger value="info" className="flex-1 rounded-xl h-full data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all text-lg font-medium">Information</TabsTrigger>
                                </TabsList>

                                <TabsContent value="posts" className="space-y-6 focus-visible:ring-0">
                                    {/* Create Post Section in Group */}
                                    {selectedGroup.members?.some((m: any) => m.userId?._id === user?._id || m.userId === user?._id) && (
                                        <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white">
                                            <CardContent className="p-0">
                                                <div className="p-5 flex gap-4">
                                                    <Avatar className="h-12 w-12 border-2 border-slate-50">
                                                        <AvatarImage src={user?.avatar} />
                                                        <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 rounded-2xl p-4 transition-colors border border-slate-100"
                                                        onClick={() => toast({ title: "Coming Soon", description: "In-group posting is being finalized!" })}>
                                                        <p className="text-slate-400">Share something with {selectedGroup.name}...</p>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50/50 px-5 py-3 flex gap-4 border-t border-slate-100">
                                                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600 font-medium">
                                                        <Plus className="h-4 w-4 mr-2" /> Share Media
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600 font-medium">
                                                        <Share2 className="h-4 w-4 mr-2" /> Announcement
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {loadingPosts ? (
                                        <div className="space-y-6">
                                            {[1, 2].map(i => <div key={i} className="h-64 rounded-3xl bg-slate-200 animate-pulse" />)}
                                        </div>
                                    ) : groupPosts.length > 0 ? (
                                        <div className="space-y-6 pb-20">
                                            {groupPosts.map(post => (
                                                <PostRenderer
                                                    key={post._id}
                                                    post={post}
                                                    user={user}
                                                    onLike={handleLike}
                                                    onComment={handleComment}
                                                    onDelete={handleDeletePost}
                                                    onPollVote={handlePollVote}
                                                    showComments={true}
                                                    onToggleComments={() => { }}
                                                    commentsCount={post.comments?.length || 0}
                                                    isLiked={post.likes?.some((l: any) => (l._id || l) === user?._id)}
                                                    showDeleteButton={isUserAdmin(selectedGroup) || post.author?._id === user?._id}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                                            <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <MessageSquare className="h-10 w-10 text-blue-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800">No posts yet</h3>
                                            <p className="text-slate-500 max-w-sm mx-auto mt-2 px-6">
                                                Be the first one to start a conversation in this community! Share your thoughts or ask a question.
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="members" className="focus-visible:ring-0">
                                    <Card className="rounded-3xl border-none shadow-md overflow-hidden">
                                        <CardHeader className="pb-0 pt-6 px-4 md:px-6">
                                            <div className="relative group">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    placeholder="Search members..."
                                                    className="pl-9 h-10 bg-slate-50 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/20"
                                                    value={memberSearchTerm}
                                                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className={cn("p-4 md:p-6")}>
                                            <div className="space-y-2">
                                                {selectedGroup.members
                                                    ?.filter((m: any) => m.userId?.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                                                    .map((member: any) => (
                                                        <div key={member._id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group">
                                                            <div className="flex items-center gap-3 md:gap-4">
                                                                <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-white shadow-sm shrink-0">
                                                                    <AvatarImage src={member.userId?.avatar} />
                                                                    <AvatarFallback className="bg-blue-50 text-blue-600">
                                                                        {member.userId?.name?.charAt(0) || 'U'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <p className="font-bold text-slate-900 truncate">{member.userId?.name}</p>
                                                                        {member.role === 'admin' && (
                                                                            <Badge className="bg-blue-600 text-white text-[9px] h-3.5 px-1.5 border-none shrink-0">Admin</Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-tight truncate">
                                                                        {member.userId?.type} {member.userId?.department && `• ${member.userId?.department}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className={cn(
                                                                    "rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all px-2 md:px-4",
                                                                    isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                                )}
                                                                onClick={() => navigate(`/profile/${member.userId?._id}`)}
                                                            >
                                                                <span className="hidden md:inline mr-2 text-xs font-semibold">View Profile</span>
                                                                <ChevronRight className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                {selectedGroup.members?.filter((m: any) => m.userId?.name?.toLowerCase().includes(memberSearchTerm.toLowerCase())).length === 0 && (
                                                    <div className="py-10 text-center">
                                                        <p className="text-slate-400 text-sm italic">No members found matching "{memberSearchTerm}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="info" className="focus-visible:ring-0">
                                    <Card className="rounded-3xl border-none shadow-md overflow-hidden">
                                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5 md:p-8">
                                            <CardTitle className="text-lg md:text-xl font-black">Group Information</CardTitle>
                                            <CardDescription className="text-xs md:text-sm">Rules and guidelines for this community.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-5 md:p-8 space-y-6 md:space-y-8">
                                            <div>
                                                <h4 className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Community Purpose</h4>
                                                <p className="text-slate-700 text-sm md:text-lg leading-relaxed">{selectedGroup.description}</p>
                                            </div>

                                            {selectedGroup.tags?.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Topics</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedGroup.tags.map((tag: string) => (
                                                            <Badge key={tag} variant="secondary" className="px-3 md:px-5 py-1 md:py-2 rounded-lg md:rounded-xl bg-blue-50 text-blue-700 border-none text-[10px] md:text-sm">
                                                                #{tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Guidelines</h4>
                                                <ul className="space-y-3 md:space-y-4">
                                                    {selectedGroup.rules?.length > 0 ? selectedGroup.rules.map((rule: string, i: number) => (
                                                        <li key={i} className="flex gap-3 md:gap-4">
                                                            <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                                                            <p className="text-slate-600 text-xs md:text-base">{rule}</p>
                                                        </li>
                                                    )) : (
                                                        <li className="flex gap-3 md:gap-4 items-center text-slate-500 italic text-xs md:text-sm">
                                                            <Shield className="h-4 w-4 md:h-5 md:w-5 opacity-50" />
                                                            Standard KEC Alumni Network community guidelines apply here.
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Group Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Users className="h-32 w-32 rotate-12" />
                        </div>
                        <DialogHeader className="relative">
                            <DialogTitle className="text-3xl font-black">Create New Community</DialogTitle>
                            <DialogDescription className="text-blue-100 text-lg">Build a space for collaboration and networking.</DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-bold text-slate-700">Group Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. KEC Developers Syndicate"
                                    className="h-12 rounded-xl bg-slate-50 border-slate-100 focus-visible:ring-blue-500/20"
                                    value={newGroup.name}
                                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-bold text-slate-700">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="What is this community about?"
                                    className="rounded-xl bg-slate-50 border-slate-100 focus-visible:ring-blue-500/20 min-h-[100px]"
                                    value={newGroup.description}
                                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tags" className="text-sm font-bold text-slate-700">Tags (comma separated)</Label>
                                <Input
                                    id="tags"
                                    placeholder="tech, placement, cse, alumni"
                                    className="h-12 rounded-xl bg-slate-50 border-slate-100 focus-visible:ring-blue-500/20"
                                    value={newGroup.tags}
                                    onChange={(e) => setNewGroup({ ...newGroup, tags: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-4 pt-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">Private Community</p>
                                            <p className="text-xs text-slate-500">Only members you approve can join</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={newGroup.isPrivate}
                                        onChange={(e) => setNewGroup({ ...newGroup, isPrivate: e.target.checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <Globe className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">Allow Students</p>
                                            <p className="text-xs text-slate-500">Allow current students to discover and join</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={newGroup.allowStudentJoin}
                                        onChange={(e) => setNewGroup({ ...newGroup, allowStudentJoin: e.target.checked })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-0 flex gap-3">
                        <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button
                            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-100 font-bold"
                            onClick={handleCreateGroup}
                            disabled={creatingGroup}
                        >
                            {creatingGroup ? 'Creating...' : 'Launch Group'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Groups;
