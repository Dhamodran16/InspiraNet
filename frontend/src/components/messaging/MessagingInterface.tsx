import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, X, Users, Plus, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { socketService, Message, TypingIndicator } from '@/services/socketService';
import { getConversations, createConversation } from '@/services/api';

interface MessagingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MessagingInterface({ isOpen, onClose }: MessagingInterfaceProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getConversations();
      setConversations(response.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      // Use a simple API call to search users
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const createConversationHandler = async (participantId: string) => {
    try {
      const response = await createConversation(participantId);
      const newConversation = response.conversation;
      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
      setShowNewConversation(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    socketService.sendMessage(selectedConversation._id, newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  useEffect(() => {
    if (!isOpen) return;

    const handleNewMessage = (message: Message) => {
      console.log('🔔 New message received in MessagingInterface:', message);
      setMessages(prev => [...prev, message]);
      if (selectedConversation && message.conversationId === selectedConversation._id) {
        scrollToBottom();
      }
    };

    const handleTyping = (data: TypingIndicator) => {
      if (selectedConversation && data.conversationId === selectedConversation._id) {
        setTypingUsers(prev => new Set(prev).add(data.userId));
      }
    };

    const handleStopTyping = (data: { userId: string; conversationId: string }) => {
      if (selectedConversation && data.conversationId === selectedConversation._id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    // Listen for follow request updates
    const handleFollowRequestAccepted = (data: any) => {
      console.log('🔔 Follow request accepted, refreshing conversations');
      loadConversations(); // Refresh conversations list
    };

    // Listen for new follow requests
    const handleNewFollowRequest = (data: any) => {
      console.log('🔔 New follow request, refreshing conversations');
      loadConversations(); // Refresh conversations list
    };

    socketService.onMessage(handleNewMessage);
    socketService.onTyping(handleTyping);
    socketService.onStopTyping(handleStopTyping);
    socketService.onFollowRequestAccepted(handleFollowRequestAccepted);
    socketService.onNewFollowRequest(handleNewFollowRequest);

    return () => {
      socketService.offMessage();
      socketService.offTyping();
      socketService.offStopTyping();
      socketService.offFollowRequestAccepted();
      socketService.offNewFollowRequest();
    };
  }, [isOpen, selectedConversation]);

  const handleInputFocus = () => {
    if (selectedConversation) {
      socketService.startTyping(selectedConversation._id);
    }
  };

  const handleInputBlur = () => {
    if (selectedConversation) {
      socketService.stopTyping(selectedConversation._id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Messages</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewConversation(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-1/3 border-r bg-gray-50 dark:bg-gray-900">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(80vh-120px)]">
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center p-4 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a new conversation to begin messaging</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation._id}
                      className={`p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedConversation?._id === conversation._id ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.participants[0]?.avatar} />
                          <AvatarFallback>
                            {conversation.participants[0]?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {conversation.isGroupChat ? conversation.groupName : conversation.participants[0]?.name}
                            </p>
                                                         {conversation.unreadCount && conversation.unreadCount > 0 && (
                               <Badge variant="destructive" className="text-xs">
                                 {conversation.unreadCount}
                               </Badge>
                             )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {conversation.lastMessageContent}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Message Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedConversation.participants[0]?.avatar} />
                      <AvatarFallback>
                        {selectedConversation.participants[0]?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {selectedConversation.isGroupChat ? selectedConversation.groupName : selectedConversation.participants[0]?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.participants.length} participants
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500">
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        // Calculate if message is from current user
                        const isOwn = message.senderId === user?._id;
                        
                        // Get sender name
                        const senderName = isOwn ? 'You' : 
                          selectedConversation?.participants.find(p => p._id === message.senderId)?.name || 'Unknown User';
                        
                        return (
                          <div
                            key={message._id}
                            className={`flex message-item ${isOwn ? 'message-right' : 'message-left'}`}
                          >
                            <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end max-w-xs lg:max-w-md`}>
                              {/* Avatar - only show for received messages */}
                              {!isOwn && (
                                <Avatar className="w-8 h-8 message-avatar">
                                  <AvatarImage src={selectedConversation?.participants.find(p => p._id === message.senderId)?.avatar} />
                                  <AvatarFallback>
                                    {selectedConversation?.participants.find(p => p._id === message.senderId)?.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              
                              {/* Message container */}
                              <div className={`flex flex-col message-content ${isOwn ? 'items-end' : 'items-start'}`}>
                                {/* Sender name above message */}
                                <div className={`text-xs font-medium mb-1 ${
                                  isOwn ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {senderName}
                                </div>
                                
                                {/* Message bubble */}
                                <div
                                  className={`px-4 py-2 rounded-lg ${
                                    isOwn
                                      ? 'message-bubble-right'
                                      : 'message-bubble-left'
                                  }`}
                                >
                                  <p className="text-sm break-words">{message.content}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(message.createdAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {typingUsers.size > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                          <p className="text-sm text-gray-500">Typing...</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">Choose a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Conversation Modal */}
        {showNewConversation && (
          <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                  />
                </div>

                <ScrollArea className="h-64">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center p-4 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No users found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                          onClick={() => createConversationHandler(user._id)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
