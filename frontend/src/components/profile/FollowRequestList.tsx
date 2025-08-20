import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { api } from '@/services/api';

export interface FollowRequest {
  id: string;
  requester: { id: string; name: string; avatar?: string };
}

export default function FollowRequestList() {
  const [requests, setRequests] = useState<FollowRequest[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getFollowRequests();
        setRequests(res || []);
      } catch {
        setRequests([]);
      }
    })();
  }, []);

  const handleAccept = async (reqId: string) => {
    try {
      await api.acceptFollowRequest(reqId);
      setRequests(prev => prev.filter(r => r.id !== reqId));
      toast({ title: 'Request Accepted', description: 'You have a new follower.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to accept request', variant: 'destructive' });
    }
  };

  const handleDecline = async (reqId: string) => {
    try {
      await api.declineFollowRequest(reqId);
      setRequests(prev => prev.filter(r => r.id !== reqId));
      toast({ title: 'Request Declined', description: 'Request has been declined.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to decline request', variant: 'destructive' });
    }
  };

  if (requests.length === 0) return <div className="p-4 text-muted-foreground">No follow requests.</div>;

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div key={req.id} className="flex items-center space-x-4 p-3 border rounded-lg bg-background">
          <Avatar className="h-10 w-10">
            <AvatarImage src={req.requester.avatar} />
            <AvatarFallback>{req.requester.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{req.requester.name}</div>
            <div className="text-xs text-muted-foreground">Wants to follow you</div>
          </div>
          <Button size="sm" onClick={() => handleAccept(req.id)} variant="default">Accept</Button>
          <Button size="sm" onClick={() => handleDecline(req.id)} variant="outline">Decline</Button>
        </div>
      ))}
    </div>
  );
}