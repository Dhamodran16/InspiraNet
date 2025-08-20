import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Eye
} from 'lucide-react';
import api, { 
  getPendingFollowRequests, 
  getSentFollowRequests,
  getAcceptedConnections,
  acceptFollowRequest, 
  rejectFollowRequest, 
  cancelFollowRequest 
} from '@/services/api';
import { socketService } from '@/services/socketService';
import { useAuth } from '@/contexts/AuthContext';

interface FollowRequest {
  _id: string;
  requesterId: string;
  targetId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  requester: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    type: string;
    department?: string;
    batch?: string;
    location?: string;
  };
}

export default function FollowRequestList({ onRequestProcessed }: { onRequestProcessed?: () => void } = {}) {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<FollowRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FollowRequest[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('received');
  const { toast } = useToast();

  useEffect(() => {
    loadFollowRequests();
    
    // Set up real-time socket listeners
    const handleFollowRequestAccepted = (data: any) => {
      console.log('🔔 Follow request accepted:', data);
      // Move from pending to accepted
      setPendingRequests(prev => prev.filter(req => req._id !== data.requestId));
      loadFollowRequests(); // Refresh all data
    };

    const handleFollowRequestRejected = (data: any) => {
      console.log('🔔 Follow request rejected:', data);
      // Remove from pending
      setPendingRequests(prev => prev.filter(req => req._id !== data.requestId));
      loadFollowRequests(); // Refresh all data
    };

    const handleNewFollowRequest = (data: any) => {
      console.log('🔔 New follow request received:', data);
      loadFollowRequests(); // Refresh all data
    };

    socketService.onFollowRequestAccepted(handleFollowRequestAccepted);
    socketService.onFollowRequestRejected(handleFollowRequestRejected);
    socketService.onNewFollowRequest(handleNewFollowRequest);
    const handleFollowStatus = () => loadFollowRequests();
    socketService.onFollowStatusUpdate(handleFollowStatus);
    socketService.onUserFollowed?.(handleFollowStatus);
    socketService.onUserUnfollowed?.(handleFollowStatus);

    return () => {
      socketService.offFollowRequestAccepted();
      socketService.offFollowRequestRejected();
      socketService.offNewFollowRequest();
      socketService.offFollowStatusUpdate();
      socketService.offUserFollowed?.();
      socketService.offUserUnfollowed?.();
    };
  }, []);

  const loadFollowRequests = async () => {
    try {
      setLoading(true);
      
      const [pending, sent, accepted] = await Promise.all([
        getPendingFollowRequests(),
        getSentFollowRequests(),
        getAcceptedConnections()
      ]);

      console.log('🔍 API Responses:', { pending, sent, accepted });

      setPendingRequests(pending.requests || []);
      setSentRequests(sent.requests || []);
      // Backend returns { connections, count } for accepted connections
      let acceptedList: any[] = (accepted.connections || accepted.requests || []).map((c: any) => c);

      // Fallback: if empty, use messageable users (mutuals) from conversations endpoint
      if (!acceptedList.length) {
        try {
          const res = await api.get('/api/conversations/messageable-users');
          const users = res.data.users || [];
          acceptedList = users.map((u: any) => ({
            _id: u._id,
            requesterId: u._id,
            targetId: u._id,
            status: 'accepted',
            createdAt: new Date().toISOString(),
            requester: {
              _id: u._id,
              name: u.name,
              email: u.email,
              avatar: u.avatar,
              type: u.type,
              department: u.department,
              batch: u.batch,
              location: u.location,
            },
          }));
        } catch (e) {
          // ignore fallback errors
        }
      }

      setAcceptedConnections(acceptedList);

      console.log('📊 State Updated:', {
        pending: pending.requests || [],
        sent: sent.requests || [],
        accepted: accepted.requests || []
      });
    } catch (error) {
      console.error('Error loading follow requests:', error);
      toast({
        title: "Error",
        description: "Failed to load follow requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string, requesterId: string) => {
    try {
      await acceptFollowRequest(requestId);
      
      // Update local state
      setPendingRequests(prev => 
        prev.map(req => 
          req._id === requestId 
            ? { ...req, status: 'accepted' as const }
            : req
        )
      );

      toast({
        title: "Follow Request Accepted",
        description: "You can now message each other",
      });

      // Reload to get updated list
      await loadFollowRequests();
      onRequestProcessed?.();
    } catch (error) {
      console.error('Error accepting follow request:', error);
      toast({
        title: "Error",
        description: "Failed to accept follow request",
        variant: "destructive"
      });
    }
  };

  const handleRejectRequest = async (requestId: string, requesterId: string) => {
    try {
      await rejectFollowRequest(requestId);
      
      // Update local state
      setPendingRequests(prev => 
        prev.map(req => 
          req._id === requestId 
            ? { ...req, status: 'declined' as const }
            : req
        )
      );

      toast({
        title: "Follow Request Declined",
        description: "Request has been declined",
      });

      // Reload to get updated list
      await loadFollowRequests();
      onRequestProcessed?.();
    } catch (error) {
      console.error('Error rejecting follow request:', error);
      toast({
        title: "Error",
        description: "Failed to reject follow request",
        variant: "destructive"
      });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelFollowRequest(requestId);
      
      // Remove from local state
      setSentRequests(prev => prev.filter(req => req._id !== requestId));

      toast({
        title: "Request Cancelled",
        description: "Follow request has been cancelled",
      });
      onRequestProcessed?.();
    } catch (error) {
      console.error('Error cancelling follow request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel follow request",
        variant: "destructive"
      });
    }
  };

  const handleMessage = async (userId: string) => {
    try {
      // Create or get conversation
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ participantId: userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Navigate to messages page or open chat
        window.location.href = `/messages?conversation=${data.conversation._id}`;
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  const handleViewProfile = (userId: string) => {
    window.location.href = `/profile/${userId}`;
  };

  const receivedRequests = pendingRequests;
  const outgoingRequests = sentRequests;
  const mutualConnections = acceptedConnections;

  console.log('🎯 Render Data:', {
    receivedRequests,
    outgoingRequests,
    mutualConnections,
    activeTab
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Follow Requests</h2>
        <p className="text-muted-foreground">Manage your follow requests and connections</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="received" className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Received</span>
            <span className="sm:hidden">In</span>
            {receivedRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{receivedRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center space-x-2">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Sent</span>
            <span className="sm:hidden">Out</span>
            {outgoingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{outgoingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Accepted</span>
            <span className="sm:hidden">Done</span>
            {mutualConnections.length > 0 && (
              <Badge variant="secondary" className="ml-2">{mutualConnections.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Received Requests</h3>
            <p className="text-sm text-muted-foreground">People who want to follow you</p>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading requests...</p>
            </div>
          ) : receivedRequests.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">No Pending Requests</h4>
                <p className="text-muted-foreground">You don't have any pending follow requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {receivedRequests.map((request) => (
                <Card key={request._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-4 sm:space-y-0">
                      {/* User Info */}
                      <div className="flex items-start space-x-4 flex-1 min-w-0">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 ring-2 ring-primary/20">
                          <AvatarImage src={request.requester.avatar} alt={request.requester.name} />
                          <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                            {request.requester.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                              {request.requester.name}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {request.requester.type}
                            </Badge>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {request.requester.department && (
                              <p className="flex items-center space-x-2">
                                <span className="truncate">{request.requester.department}</span>
                              </p>
                            )}
                            {request.requester.batch && (
                              <p className="flex items-center space-x-2">
                                <span>Batch {request.requester.batch}</span>
                              </p>
                            )}
                            {request.requester.location && (
                              <p className="flex items-center space-x-2">
                                <span className="truncate">{request.requester.location}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Button
                          onClick={() => handleAcceptRequest(request._id, request.requesterId)}
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRejectRequest(request._id, request.requesterId)}
                          className="w-full sm:w-auto"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Sent Requests</h3>
            <p className="text-sm text-muted-foreground">Requests you've sent to others</p>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading requests...</p>
            </div>
          ) : outgoingRequests.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">No Sent Requests</h4>
                <p className="text-muted-foreground">You haven't sent any follow requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {outgoingRequests.map((request) => (
                <Card key={request._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-4 sm:space-y-0">
                      {/* User Info */}
                      <div className="flex items-start space-x-4 flex-1 min-w-0">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 ring-2 ring-primary/20">
                          <AvatarImage src={request.requester.avatar} alt={request.requester.name} />
                          <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                            {request.requester.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                              {request.requester.name}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {request.requester.type}
                            </Badge>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {request.requester.department && (
                              <p className="flex items-center space-x-2">
                                <span className="truncate">{request.requester.department}</span>
                              </p>
                            )}
                            {request.requester.batch && (
                              <p className="flex items-center space-x-2">
                                <span>Batch {request.requester.batch}</span>
                              </p>
                            )}
                            {request.requester.location && (
                              <p className="flex items-center space-x-2">
                                <span className="truncate">{request.requester.location}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => handleCancelRequest(request._id)}
                          className="w-full sm:w-auto"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Accepted Connections</h3>
            <p className="text-sm text-muted-foreground">People you can now message</p>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading connections...</p>
            </div>
          ) : mutualConnections.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">No Accepted Connections</h4>
                <p className="text-muted-foreground">You don't have any accepted follow requests yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {mutualConnections.map((request) => (
                <Card key={request._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-4 sm:space-y-0">
                      {/* User Info */}
                      <div className="flex items-start space-x-4 flex-1 min-w-0">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 ring-2 ring-primary/20">
                          <AvatarImage src={request.requester.avatar} alt={request.requester.name} />
                          <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                            {request.requester.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                              {request.requester.name}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {request.requester.type}
                            </Badge>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {request.requester.department && (
                              <p className="flex items-center space-x-2">
                                <span className="truncate">{request.requester.department}</span>
                              </p>
                            )}
                            {request.requester.batch && (
                              <p className="flex items-center space-x-2">
                                <span>Batch {request.requester.batch}</span>
                              </p>
                            )}
                            {request.requester.location && (
                              <p className="flex items-center space-x-2">
                                <span className="truncate">{request.requester.location}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Button
                          onClick={() => handleMessage(request.targetId)}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleViewProfile(request.targetId)}
                          className="w-full sm:w-auto"
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
