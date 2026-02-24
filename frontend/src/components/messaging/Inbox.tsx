import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    avatar?: string;
    type: string;
  }>;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
}

interface MessageRequest {
  _id: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
    type: string;
  };
  message: string;
  createdAt: string;
}

export default function Inbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadMessageRequests();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/conversations');
      if (response.data) {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessageRequests = async () => {
    try {
      const response = await api.get('/api/messages/requests');
      if (response.data) {
        setMessageRequests(response.data.requests || []);
      }
    } catch (error) {
      console.error('Error loading message requests:', error);
    }
  };

  const handleAcceptRequest = async (reqId: string) => {
    try {
      await api.post(`/api/messages/requests/${reqId}/accept`);
      setMessageRequests(prev => prev.filter(r => r._id !== reqId));
      toast({ title: 'Message Request Accepted', description: 'Conversation started.' });
      loadConversations(); // Refresh conversations
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to accept message request', variant: 'destructive' });
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      await api.post(`/api/messages/requests/${reqId}/decline`);
      setMessageRequests(prev => prev.filter(r => r._id !== reqId));
      toast({ title: 'Request Declined', description: 'Message request declined.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to decline message request', variant: 'destructive' });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Inbox</h1>
      </div>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No conversations yet.</p>
              <p className="text-sm">Start connecting with other alumni!</p>
            </div>
          ) : (
            <div className="space-y-3">\\\
              {conversations.map((conversation) => (
                <div key={conversation._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conversation.participants[0]?.avatar} />
                    <AvatarFallback>
                      {conversation.participants[0]?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {conversation.participants[0]?.name || 'Unknown User'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(conversation.updatedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Message Requests
            {messageRequests.length > 0 && (
              <Badge variant="secondary">{messageRequests.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messageRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No message requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messageRequests.map((req) => (
                <div key={req._id} className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={req.sender.avatar} />
                    <AvatarFallback>
                      {req.sender.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{req.sender.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {req.sender.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{req.message}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(req.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(req._id)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineRequest(req._id)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}