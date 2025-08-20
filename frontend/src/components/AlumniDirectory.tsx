import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Users, 
  Building, 
  MapPin, 
  Calendar, 
  Mail, 
  MessageSquare,
  UserPlus,
  UserMinus,
  Eye,
  RefreshCw,
  Linkedin,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socketService';

interface User {
  _id: string;
  name: string;
  email: string;
  type: string;
  department?: string;
  batch?: string;
  company?: string;
  designation?: string;
  location?: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  isMutual?: boolean;
  canMessage?: boolean;
  mutualConnections?: number;
  followRequestStatus?: 'pending' | 'accepted' | 'rejected' | null;
}

export default function AlumniDirectory() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/follows/users', {
        params: {
          page: currentPage,
          search: searchQuery,
          batch: batchFilter !== 'all' ? batchFilter : undefined,
          department: departmentFilter !== 'all' ? departmentFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined
        }
      });
      
      setUsers(response.data.users);
      setTotalUsers(response.data.pagination.total);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load alumni directory",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchQuery, batchFilter, departmentFilter, typeFilter]);

  // Socket listeners for real-time follow/unfollow updates
  useEffect(() => {
    // Listen for follow status updates
    const handleFollowStatusUpdate = (data: any) => {
      if (data.userId) {
        setUsers(prev => prev.map(u => {
          if (u._id === data.userId) {
            return {
              ...u,
              isFollowing: data.isFollowing,
              isFollowedBy: data.isFollowedBy,
              isMutual: data.isMutual,
              canMessage: data.canMessage,
              mutualConnections: data.mutualConnections
            };
          }
          return u;
        }));
      }
    };

    // Listen for new follow requests
    const handleNewFollowRequest = (data: any) => {
      if (data.recipientId === user?._id) {
        toast({
          title: "New Follow Request",
          description: `${data.senderName} wants to follow you`,
        });
      }
    };

    // Listen for follow request accepted/rejected
    const handleFollowRequestAccepted = (data: any) => {
      if (data.recipientId === user?._id) {
        setUsers(prev => prev.map(u => {
          if (u._id === data.senderId) {
            return {
              ...u,
              followRequestStatus: 'accepted',
              isFollowing: true,
              canMessage: true
            };
          }
          return u;
        }));
        toast({
          title: "Follow Request Accepted",
          description: `${data.senderName} accepted your follow request`,
        });
      }
    };

    const handleFollowRequestRejected = (data: any) => {
      if (data.recipientId === user?._id) {
        setUsers(prev => prev.map(u => {
          if (u._id === data.senderId) {
            return {
              ...u,
              followRequestStatus: 'rejected'
            };
          }
          return u;
        }));
        toast({
          title: "Follow Request Rejected",
          description: `${data.senderName} rejected your follow request`,
        });
      }
    };

    // Set up socket listeners
    socketService.onFollowStatusUpdate(handleFollowStatusUpdate);
    socketService.onNewFollowRequest(handleNewFollowRequest);
    socketService.onFollowRequestAccepted(handleFollowRequestAccepted);
    socketService.onFollowRequestRejected(handleFollowRequestRejected);

    // Cleanup
    return () => {
      socketService.offFollowStatusUpdate();
      socketService.offNewFollowRequest();
      socketService.offFollowRequestAccepted();
      socketService.offFollowRequestRejected();
    };
  }, [user?._id]);

  const handleFollow = async (userId: string) => {
    try {
      await api.post(`/api/follows/request/${userId}`);
      setUsers(prev => prev.map(u => 
        u._id === userId ? { ...u, followRequestStatus: 'pending' } : u
      ));
      toast({
        title: "Success",
        description: "Follow request sent successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send follow request",
        variant: "destructive"
      });
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      console.log('🔄 Attempting to unfollow user:', userId);
      const response = await api.delete(`/api/follows/unfollow/${userId}`);
      console.log('✅ Unfollow response:', response.data);
      
      setUsers(prev => prev.map(u => 
        u._id === userId ? { ...u, isFollowing: false } : u
      ));
      toast({
        title: "Success",
        description: "User unfollowed successfully"
      });
    } catch (error: any) {
      console.error('❌ Unfollow error:', error);
      
      // Handle different error cases
      let errorMessage = "Failed to unfollow user";
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.response?.status === 404) {
        errorMessage = "User not found";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error occurred";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleMessage = async (userId: string) => {
    try {
      // Create or get existing conversation
      const response = await api.post('/api/conversations', { participantId: userId });
      
      // Navigate to messages section with the conversation
      navigate(`/dashboard?section=messages&conversation=${response.data.conversation._id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  const handleViewProfile = (userId: string) => {
    // Navigate to user profile
    navigate(`/profile/${userId}`);
  };

  const handleLinkedIn = (user: User) => {
    // Open LinkedIn profile if available
    toast({
      title: "LinkedIn",
      description: "LinkedIn integration coming soon!"
    });
  };

  const handleEmail = (user: User) => {
    // Open email client
    window.open(`mailto:${user.email}`, '_blank');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadUsers().finally(() => setIsRefreshing(false));
  };

  const getUserBatch = (user: User) => user.batch || 'N/A';
  const getUserDepartment = (user: User) => user.department || 'N/A';
  const getUserCompany = (user: User) => user.company || 'Not specified';
  const getUserDesignation = (user: User) => user.designation || 'Not specified';
  const getUserLocation = (user: User) => user.location || 'Not specified';
  const getUserExperience = (user: User) => 'Not specified';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading alumni directory...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="alumni-directory">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-6">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Alumni Directory
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Connect with fellow KEC alumni from around the world. Build your professional network and discover new opportunities.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="alumni-filters mb-8 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm border border-border/50 shadow-lg">
          {/* Search Bar - Full Width on Mobile */}
          <div className="w-full mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search by name, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 w-full h-12 text-base border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50 backdrop-blur-sm"
              />
            </div>
          </div>
          
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Batch</label>
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger className="w-full border-border/50 bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  <SelectItem value="2020">2020</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full border-border/50 bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="CSE">Computer Science</SelectItem>
                  <SelectItem value="ECE">Electronics</SelectItem>
                  <SelectItem value="ME">Mechanical</SelectItem>
                  <SelectItem value="CE">Civil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full border-border/50 bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Actions</label>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full h-10 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/70"
              >
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-muted/50 px-4 py-2 rounded-full border border-border/50">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Showing {users.length} of {totalUsers} alumni
            </span>
          </div>
          {/* Debug info */}
          <div className="mt-3 text-xs text-muted-foreground/70">
            Grid: {users.length} cards • Screen: {window.innerWidth}px
          </div>
        </div>

        {/* Alumni Grid */}
        <div className="w-full">
          <div className="alumni-grid w-full">
            {users.map((user) => (
              <Card 
                key={user._id} 
                className="alumni-card hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] h-full w-full border border-border/50 bg-card/50 backdrop-blur-sm"
                onClick={() => handleViewProfile(user._id)}
              >
                <CardContent className="p-6 h-full flex flex-col w-full">
                  {/* Card Header with Avatar and Basic Info */}
                  <div className="flex items-start space-x-4 mb-4">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 ring-2 ring-primary/20">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">
                          {user.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                          {user.type}
                        </Badge>
                      </div>
                      
                      {/* Department and Batch Info */}
                      <div className="space-y-2">
                        {user.department && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-foreground">{user.department}</span>
                          </div>
                        )}
                        {user.batch && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-foreground">Batch {user.batch}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className="space-y-3 mb-4 flex-1">
                    {/* Location */}
                    {user.location && (
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">{user.location}</span>
                      </div>
                    )}
                    
                    {/* Company and Designation */}
                    {user.company && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">{user.company}</span>
                      </div>
                    )}
                    
                    {user.designation && (
                      <div className="flex items-center space-x-2 text-sm ml-6">
                        <span className="text-muted-foreground">{user.designation}</span>
                      </div>
                    )}

                    {/* Skills (if available) */}
                    {user.skills && user.skills.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Skills
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {user.skills.slice(0, 3).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                              {skill}
                            </Badge>
                          ))}
                          {user.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs px-2 py-1">
                              +{user.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Section */}
                  <div className="flex flex-col space-y-2 pt-4 border-t border-border/30">
                    {/* Follow/Unfollow Button */}
                    <Button
                      size="sm"
                      variant={
                        user.isFollowing ? "outline" : 
                        user.followRequestStatus === 'pending' ? "secondary" : "default"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (user.isFollowing) {
                          handleUnfollow(user._id);
                        } else if (user.followRequestStatus === 'pending') {
                          toast({
                            title: "Follow Request Pending",
                            description: "Your follow request is waiting for approval",
                          });
                        } else {
                          handleFollow(user._id);
                        }
                      }}
                      className="w-full font-medium"
                      disabled={user.followRequestStatus === 'pending'}
                    >
                      {user.isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unfollow
                        </>
                      ) : user.followRequestStatus === 'pending' ? (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Pending
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>

                    {/* Secondary Action Buttons */}
                    <div className="flex space-x-2">
                      {/* Message Button */}
                      {(user.isFollowing || user.isFollowedBy || user.followRequestStatus === 'accepted') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessage(user._id);
                          }}
                          className="flex-1"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                      )}

                      {/* View Profile Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProfile(user._id);
                        }}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="flex items-center px-4 py-2 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-full sm:w-auto"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {users.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-4">No alumni found matching your search criteria.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery("");
                setBatchFilter("all");
                setDepartmentFilter("all");
                setTypeFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
