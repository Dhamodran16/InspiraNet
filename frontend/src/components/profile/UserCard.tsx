import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import api from '@/services/api';
import AsyncButton from '@/components/ui/AsyncButton';

export interface UserCardProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
    isPrivate: boolean;
    isFollowing: boolean;
    isRequested: boolean;
  };
  currentUserId: string;
}

export default function UserCard({ user, currentUserId }: UserCardProps) {
  const [followState, setFollowState] = useState(
    user.isFollowing ? 'following' : user.isRequested ? 'requested' : 'not-following'
  );
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    try {
      await api.post(`/api/follows/request/${user.id}`);
      if (user.isPrivate) {
        setFollowState('requested');
        toast({ title: 'Follow Request Sent', description: 'Your request is pending approval.' });
      } else {
        setFollowState('following');
        toast({ title: 'Now Following', description: `You are now following ${user.name}` });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to follow user', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg bg-background">
      <Avatar className="h-12 w-12">
        <AvatarImage src={user.avatar} />
        <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.isPrivate ? 'Private' : 'Public'} Account</div>
      </div>
      {user.id !== currentUserId && (
        <AsyncButton
          onClick={handleFollow}
          disabled={loading || followState !== 'not-following'}
          variant={followState === 'following' ? 'secondary' : followState === 'requested' ? 'outline' : 'default'}
        >
          {followState === 'following' ? 'Following' : followState === 'requested' ? 'Requested' : 'Follow'}
        </AsyncButton>
      )}
    </div>
  );
}