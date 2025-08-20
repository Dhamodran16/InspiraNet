import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/services/socketService';
import { api } from '@/services/api';
import MessagingInterface from './MessagingInterface';

export default function MessagingButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await api.getConversations();
      const totalUnread = response.conversations.reduce((total, conv) => {
        return total + (conv.unreadCount || 0);
      }, 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      
      // Listen for new messages to update unread count
      socketService.onMessage(() => {
        loadUnreadCount();
      });

      return () => {
        socketService.offMessage();
      };
    }
  }, [user, loadUnreadCount]);

  if (!user) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative text-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center text-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <MessagingInterface 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
