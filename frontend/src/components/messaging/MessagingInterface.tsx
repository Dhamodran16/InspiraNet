import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, X, Users, Plus, MessageCircle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { socketService, Message, TypingIndicator } from '@/services/socketService';
import { getConversations, createConversation, getMessages, sendMessage as sendMessageApi } from '@/services/api';
import { encryptMessage, decryptMessage } from '@/utils/messageEncryption';

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
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      // Use direct scroll to bottom - more reliable
      const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [selectedConversation]); // Removed messages dependency to prevent scroll on send

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

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await getMessages(conversationId);
      const decryptedMessages = await Promise.all(
        (response.messages || []).map(async (msg: any) => {
          try {
            // Decrypt message content if it's encrypted
            const decryptedContent = await decryptMessage(
              msg.content, 
              [msg.senderId, user?._id || ''].filter(Boolean)
            );
            return { ...msg, content: decryptedContent };
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            return msg; // Return original message if decryption fails
          }
        })
      );
      setMessages(decryptedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
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
      
      // Join the conversation room for real-time updates
      socketService.joinConversations([newConversation._id]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    try {
      setIsSending(true);
      
      // Encrypt the message content
      const encryptedContent = await encryptMessage(
        newMessage.trim(),
        [selectedConversation.participants.map((p: any) => p._id)].flat()
      );

      // Send encrypted message via API
      const response = await sendMessageApi(selectedConversation._id, encryptedContent);
      
      if (response.success) {
        // Add the new message to the local state
        const newMsg: Message = {
          _id: response.message._id,
          conversationId: selectedConversation._id,
          senderId: user?._id || '',
          senderName: user?.name || 'You',
          content: newMessage.trim(), // Show decrypted content locally
          messageType: 'text',
          createdAt: new Date().toISOString(),
          readBy: [user?._id || '']
        };
        
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        // Auto-scroll to last message
        setTimeout(() => {
          const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Handle typing indicators
    if (!isTyping && selectedConversation) {
      setIsTyping(true);
      socketService.startTyping(selectedConversation._id);
    }
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConversation) {
        setIsTyping(false);
        socketService.stopTyping(selectedConversation._id);
      }
    }, 1000);
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      // Connect to socket service
      socketService.connect();
    }
  }, [isOpen, loadConversations]);

  useEffect(() => {
    if (!isOpen) return;

    const handleNewMessage = async (message: Message) => {
      console.log('🔔 New message received in MessagingInterface:', message);
      
      try {
        // Decrypt the received message
        const decryptedContent = await decryptMessage(
          message.content,
          [message.senderId, user?._id || ''].filter(Boolean)
        );
        
        const decryptedMessage = { ...message, content: decryptedContent };
        setMessages(prev => [...prev, decryptedMessage]);
        
        if (selectedConversation && message.conversationId === selectedConversation._id) {
          // Auto-scroll to last message
        setTimeout(() => {
          const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }, 100);
        }
      } catch (error) {
        console.error('Failed to decrypt received message:', error);
        // Add message with encrypted content if decryption fails
        setMessages(prev => [...prev, message]);
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
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isOpen, selectedConversation, user, loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
      // Join the conversation room for real-time updates
      socketService.joinConversations([selectedConversation._id]);
    }
  }, [selectedConversation, loadMessages]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewConversation(!showNewConversation)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r flex flex-col">
            {showNewConversation ? (
              <div className="p-4 border-b">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Search Users</label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {isSearching && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => createConversationHandler(user._id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email?.personal || user.email?.college}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewConversation(false)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewConversation(true)}
                      className="mt-2"
                    >
                      Start a conversation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation._id}
                        className={`p-4 cursor-pointer hover:bg-gray-50 ${
                          selectedConversation?._id === conversation._id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversation.participants[0]?.avatar} />
                            <AvatarFallback>
                              {conversation.participants[0]?.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {conversation.participants[0]?.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {conversation.lastMessage?.content || 'No messages yet'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedConversation.participants[0]?.avatar} />
                      <AvatarFallback>
                        {selectedConversation.participants[0]?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedConversation.participants[0]?.name}</p>
                      <p className="text-sm text-gray-500">
                        {typingUsers.size > 0 ? 'Typing...' : 'Online'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 space-y-4">
                  {messages.map((message) => {
                    // Fix: Handle senderId as object or string
                    let messageSenderId;
                    
                    // Handle senderId as object or string
                    if (typeof message.senderId === 'object' && message.senderId !== null) {
                      messageSenderId = message.senderId._id?.toString() || message.senderId.toString();
                    } else {
                      messageSenderId = message.senderId?.toString();
                    }
                    
                    const isOwn = message.isOwn !== undefined ? message.isOwn : (messageSenderId === user?._id?.toString());
                    const messageTime = new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={message._id}
                        data-message-id={message._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
                      >
                        {/* Message container with proper alignment */}
                        <div className={`flex items-end max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar - only show for received messages */}
                          {!isOwn && (
                            <div className="w-8 h-8 flex-shrink-0 mr-2 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {message.senderName?.charAt(0) || 'U'}
                              </span>
                            </div>
                          )}
                          
                          {/* Message content container */}
                          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            {/* Sender name above message - ONLY for group chats */}
                            {!isOwn && selectedConversation?.isGroupChat && (
                              <div className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                {message.senderName || 'Unknown User'}
                              </div>
                            )}
                            
                            {/* Message bubble */}
                            <div
                              className={`px-4 py-2 rounded-lg ${
                                isOwn
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <div className={`flex items-center justify-between mt-1 text-xs ${
                                isOwn ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                <span>{messageTime}</span>
                                {isOwn && (
                                  <div className="flex items-center space-x-1">
                                    <span>✓</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={handleTyping}
                      onKeyPress={handleKeyPress}
                      disabled={isSending}
                    />
                    <Button onClick={sendMessage} disabled={isSending || !newMessage.trim()}>
                      {isSending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
