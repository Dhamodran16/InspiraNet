import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send, Search, MoreVertical, Phone, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  mediaUrl?: string;
  isRead: boolean;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  createdAt: string;
  timeAgo: string;
  isOwn?: boolean;
}

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    type: string;
    department?: string;
  }>;
  lastMessage?: string;
  lastMessageContent: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroupChat: boolean;
  groupName?: string;
  groupAdmin?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ChatSystem() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<Array<{
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    type: string;
    department?: string;
  }>>([]);

  // Load conversations on component mount
  useEffect(() => {
    if (user) {
      loadConversations();
      loadUsers();
    }
  }, [user]);

  // Auto-scroll to last message ONLY when conversation changes (not on message send)
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      // Use direct scroll to bottom - more reliable
      const scrollContainer = document.querySelector('.flex-1.p-4.scrollbar-thin');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [selectedConversation]); // Removed messages dependency to prevent scroll on send

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await api.getConversations();
      setConversations(response.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.searchUsers('');
      if (response && response.users && Array.isArray(response.users)) {
        setUsers(response.users.filter(u => u._id !== user?._id));
      } else {
        setUsers([]);
        console.warn('No users found or invalid response format');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoading(true);
      const response = await api.getMessages(conversationId);
      setMessages(response.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await api.sendMessage(selectedConversation._id, newMessage.trim());
      setNewMessage('');
      // Reload messages to show the new message
      await loadMessages(selectedConversation._id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const createConversation = async (participantId: string) => {
    try {
      const response = await api.createConversation(participantId);
      await loadConversations();
      setSelectedConversation(response.conversation);
      await loadMessages(response.conversation._id);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (conversation.isGroupChat) {
      return { name: conversation.groupName || 'Group Chat', avatar: undefined };
    }
    const otherParticipant = conversation.participants.find(p => p._id !== user?._id);
    return otherParticipant || { name: 'Unknown User', avatar: undefined };
  };

  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = getOtherParticipant(conv);
    return otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = users && Array.isArray(users) ? users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Button size="sm" variant="outline">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-2">
            {/* Existing Conversations */}
            {filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const isSelected = selectedConversation?._id === conversation._id;
              
              return (
                <Card
                  key={conversation._id}
                  className={`mb-2 cursor-pointer transition-all hover:bg-muted/50 ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    loadMessages(conversation._id);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={otherParticipant.avatar} />
                        <AvatarFallback>
                          {otherParticipant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm truncate">
                            {otherParticipant.name}
                          </h3>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessageContent || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Available Users to Start Conversation */}
            {searchQuery && filteredUsers.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">
                  Start New Conversation
                </h3>
                {filteredUsers.map((user) => (
                  <Card
                    key={user._id}
                    className="mb-2 cursor-pointer transition-all hover:bg-muted/50"
                    onClick={() => createConversation(user._id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {user.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getOtherParticipant(selectedConversation).avatar} />
                    <AvatarFallback>
                      {getOtherParticipant(selectedConversation).name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {getOtherParticipant(selectedConversation).name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.isGroupChat ? 'Group Chat' : 'Online'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 scrollbar-thin">
              <div className="space-y-4">
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
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <div className={`flex items-center justify-between mt-1 text-xs ${
                              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              <span>{messageTime}</span>
                              {isOwn && message.isRead && (
                                <div className="flex items-center space-x-1">
                                  <span>✓ Read</span>
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
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}