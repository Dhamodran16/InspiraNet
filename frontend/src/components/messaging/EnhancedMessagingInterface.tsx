import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from '../../hooks/use-toast';
import { Send, Lock, Unlock, UserPlus, MessageCircle, MoreVertical, Image, File, Smile, Paperclip } from 'lucide-react';
import { socketService } from '../../services/socketService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Textarea } from '../ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'poll';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  isEncrypted: boolean;
  createdAt: string;
  isOwn: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readAt?: string;
}

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    avatar?: string;
    type: string;
    isOnline?: boolean;
    lastSeen?: string;
  }>;
  lastMessage?: string;
  lastMessageTime?: string;
  isGroupChat: boolean;
  unreadCount: number;
}

interface EnhancedMessagingInterfaceProps {
  currentUser: any;
  selectedUser?: any;
  onBack?: () => void;
}

const EnhancedMessagingInterface: React.FC<EnhancedMessagingInterfaceProps> = ({
  currentUser,
  selectedUser,
  onBack
}) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [canMessage, setCanMessage] = useState(false);
  const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'mutual'>('none');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced real-time messaging setup
  useEffect(() => {
    if (conversation) {
      // Socket listeners for real-time messaging
      const handleNewMessage = (data: any) => {
        if (data.conversationId === conversation._id) {
          console.log('🔔 New message received:', data);
          const newMessage: Message = {
            _id: data.message._id,
            senderId: data.message.senderId,
            senderName: data.message.senderName,
            content: data.message.content,
            messageType: data.message.messageType || 'text',
            mediaUrl: data.message.mediaUrl,
            fileName: data.message.fileName,
            fileSize: data.message.fileSize,
            isEncrypted: data.message.isEncrypted || false,
            createdAt: data.message.createdAt,
            isOwn: data.message.senderId === currentUser._id,
            status: 'delivered'
          };
          
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }
      };

      const handleTyping = (data: any) => {
        if (data.conversationId === conversation._id && data.userId !== currentUser._id) {
          setTypingUsers(prev => new Set(prev).add(data.userId));
        }
      };

      const handleStopTyping = (data: any) => {
        if (data.conversationId === conversation._id) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
        }
      };

      // Listen for message status updates
      const handleMessageStatus = (data: any) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, status: data.status, readAt: data.readAt }
            : msg
        ));
      };

      // Listen for user online status
      const handleUserStatus = (data: any) => {
        if (data.userId === selectedUser._id) {
          setConversation(prev => prev ? {
            ...prev,
            participants: prev.participants.map(p => 
              p._id === data.userId 
                ? { ...p, isOnline: data.isOnline, lastSeen: data.lastSeen }
                : p
            )
          } : null);
        }
      };

      // Listen for follow request updates
      const handleFollowRequestAccepted = (data: any) => {
        if (data.followerId === selectedUser._id || data.followeeId === selectedUser._id) {
          console.log('🔔 Follow request accepted, updating messaging permissions');
          checkFollowStatus(); // Re-check follow status
        }
      };

      socketService.onMessage(handleNewMessage);
      socketService.onTyping(handleTyping);
      socketService.onStopTyping(handleStopTyping);
      socketService.onMessageStatus(handleMessageStatus);
      socketService.onUserOnlineStatus(handleUserStatus);
      socketService.onFollowRequestAccepted(handleFollowRequestAccepted);

      return () => {
        socketService.offMessage();
        socketService.offTyping();
        socketService.offStopTyping();
        socketService.offMessageStatus();
        socketService.offUserOnlineStatus();
        socketService.offFollowRequestAccepted();
      };
    }
  }, [conversation, currentUser._id, selectedUser._id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing indicator with debouncing
  useEffect(() => {
    if (isTyping) {
      socketService.startTyping(conversation?._id || '');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.stopTyping(conversation?._id || '');
      }, 1000);
    }
  }, [isTyping, conversation?._id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Mark conversation messages as read
      if (conversation?._id) {
        socketService.markMessagesAsRead(conversation._id);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!conversation?._id) return;

    const messageData = {
      conversationId: conversation._id,
      content: newMessage.trim(),
      messageType: selectedFile ? 'file' : 'text',
      mediaUrl: selectedFile ? undefined : undefined,
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size
    };

    // Optimistically add message to UI
    const tempMessage: Message = {
      _id: `temp_${Date.now()}`,
      senderId: currentUser._id,
      senderName: currentUser.name,
      content: newMessage.trim(),
      messageType: selectedFile ? 'file' : 'text',
      mediaUrl: selectedFile ? URL.createObjectURL(selectedFile) : undefined,
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size,
      isEncrypted: encryptionEnabled,
      createdAt: new Date().toISOString(),
      isOwn: true,
      status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = newMessage.trim();
    setNewMessage('');
    setSelectedFile(null);
    setUploadProgress(0);

    try {
      setSending(true);
      
      // Upload file if selected
      let mediaUrl = '';
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('conversationId', conversation._id);
        
        const uploadResponse = await fetch('/api/messages/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: formData
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          mediaUrl = uploadData.mediaUrl;
        }
      }

      // Send message via API
      const response = await fetch(`/api/conversations/${conversation._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          content: messageToSend,
          mediaUrl: mediaUrl || undefined,
          fileName: selectedFile?.name,
          fileSize: selectedFile?.size
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update temp message with real message data
        setMessages(prev => prev.map(msg => 
          msg._id === tempMessage._id 
            ? { 
                ...result.message,
                isOwn: true,
                status: 'sent'
              }
            : msg
        ));

        // Update conversation last message
        setConversation(prev => prev ? {
          ...prev,
          lastMessage: messageToSend,
          lastMessageTime: new Date().toISOString()
        } : null);

        // Emit typing stop
        socketService.stopTyping(conversation._id);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark message as failed
      setMessages(prev => prev.map(msg => 
        msg._id === tempMessage._id 
          ? { ...msg, status: 'failed' }
          : msg
      ));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderMessage = (message: Message) => {
    const isOwn = message.isOwn;
    const messageTime = new Date(message.createdAt).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Get sender name
    const senderName = isOwn ? currentUser.name : 
      conversation?.participants.find(p => p._id === message.senderId)?.name || 'Unknown User';

    // Debug logging
    console.log('🔍 Rendering message:', {
      messageId: message._id,
      isOwn,
      senderName,
      content: message.content?.substring(0, 50) + '...',
      senderId: message.senderId,
      currentUserId: currentUser._id
    });

    return (
      <div key={message._id} className={`flex message-item ${isOwn ? 'message-right' : 'message-left'}`}>
        <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end max-w-xs lg:max-w-md`}>
          {/* Avatar - only show for received messages */}
          {!isOwn && (
            <Avatar className="w-8 h-8 message-avatar">
              <AvatarImage src={conversation?.participants.find(p => p._id === message.senderId)?.avatar} />
              <AvatarFallback>
                {conversation?.participants.find(p => p._id === message.senderId)?.name?.charAt(0)}
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
            <div className={`rounded-lg px-3 py-2 ${
              isOwn 
                ? 'message-bubble-right' 
                : 'message-bubble-left'
            }`}>
              {message.messageType === 'file' && (
                <div className="flex items-center space-x-2 mb-2">
                  <File className="w-4 h-4" />
                  <span className="text-sm font-medium">{message.fileName}</span>
                  <span className="text-xs opacity-75">
                    ({(message.fileSize || 0 / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
              
              {message.content && (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}
              
              <div className={`flex items-center justify-between mt-1 text-xs ${
                isOwn ? 'text-blue-100' : 'text-gray-500'
              }`}>
                <span>{messageTime}</span>
                {isOwn && (
                  <div className="flex items-center space-x-1">
                    {message.status === 'sending' && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    {message.status === 'sent' && <span>✓</span>}
                    {message.status === 'delivered' && <span>✓✓</span>}
                    {message.status === 'read' && <span className="text-blue-300">✓✓</span>}
                    {message.status === 'failed' && <span className="text-red-300">✗</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/users/${selectedUser._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        
        const isFollowing = user.followers?.some((f: any) => f._id === currentUser._id);
        const isFollowedBy = user.following?.some((f: any) => f._id === currentUser._id);
        
        if (isFollowing && isFollowedBy) {
          setFollowStatus('mutual');
          setCanMessage(true);
        } else if (isFollowing) {
          setFollowStatus('following');
          setCanMessage(false);
        } else {
          setFollowStatus('none');
          setCanMessage(false);
        }
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const loadOrCreateConversation = async () => {
    try {
      setLoading(true);
      
      // First, try to find existing conversation
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participantId: selectedUser._id
        })
      });

      if (response.ok) {
        const conversationData = await response.json();
        setConversation(conversationData);
        loadMessages(conversationData._id);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleFollowUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/follows/request/${selectedUser._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Follow Request Sent",
          description: `Follow request sent to ${selectedUser.name}`,
        });
        // Refresh user list or update follow status
      } else {
        throw new Error('Failed to send follow request');
      }
    } catch (error) {
      console.error('Error sending follow request:', error);
      toast({
        title: "Error",
        description: "Failed to send follow request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initialize conversation when user is selected
  useEffect(() => {
    if (selectedUser) {
      checkFollowStatus();
      loadOrCreateConversation();
    }
  }, [selectedUser]);

  // Check if user can message (must be mutually followed)
  useEffect(() => {
    if (selectedUser && currentUser) {
      // Check if users are mutually followed
      const isFollowing = currentUser.following?.includes(selectedUser._id);
      const isFollowedBy = currentUser.followers?.includes(selectedUser._id);
      const isMutual = isFollowing && isFollowedBy;
      
      setCanMessage(isMutual);
      setFollowStatus(
        isMutual ? 'mutual' : 
        isFollowing ? 'following' : 'none'
      );
    }
  }, [selectedUser, currentUser]);

  if (!selectedUser) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4" />
            <p>Select a user to start messaging</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="post-card border border-gray-200 dark:border-gray-700 shadow-sm messaging-container">
      <CardHeader className="post-header pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                ← Back
              </Button>
            )}
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                <AvatarFallback>{getInitials(selectedUser.name)}</AvatarFallback>
              </Avatar>
              {/* Online status indicator */}
              {conversation?.participants.find(p => p._id === selectedUser._id)?.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
              <div className="text-sm text-muted-foreground">
                {selectedUser.type} • {selectedUser.department || 'No department'}
                {conversation?.participants.find(p => p._id === selectedUser._id)?.lastSeen && (
                  <span> • Last seen {formatTime(conversation.participants.find(p => p._id === selectedUser._id)?.lastSeen || '')}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {followStatus === 'mutual' && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Unlock className="h-3 w-3 mr-1" />
                Can Message
              </Badge>
            )}
            {followStatus === 'following' && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Lock className="h-3 w-3 mr-1" />
                Waiting for Follow
              </Badge>
            )}
            {followStatus === 'none' && (
              <Button size="sm" onClick={handleFollowUser}>
                <UserPlus className="h-3 w-3 mr-1" />
                Follow
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setEncryptionEnabled(!encryptionEnabled)}>
                  {encryptionEnabled ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  {encryptionEnabled ? 'Disable Encryption' : 'Enable Encryption'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`/profile/${selectedUser._id}`, '_blank')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {!canMessage && followStatus !== 'mutual' ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Cannot Send Messages</h3>
              <p className="text-muted-foreground mb-4">
                You can only message users who are following each other
              </p>
              {followStatus === 'none' && (
                <Button onClick={handleFollowUser}>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Send Follow Request
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 min-h-full">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {messages.map(renderMessage)}
                    
                    {/* Typing indicator */}
                    {typingUsers.size > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <div className="flex items-center space-x-1">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-sm text-muted-foreground ml-2">
                              {Array.from(typingUsers).length === 1 
                                ? 'Someone is typing...' 
                                : `${Array.from(typingUsers).length} people are typing...`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              {/* Encryption toggle */}
              <div className="flex items-center space-x-2 mb-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                        className={encryptionEnabled ? 'text-green-600' : 'text-gray-500'}
                      >
                        {encryptionEnabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        {encryptionEnabled ? 'Encrypted' : 'Unencrypted'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{encryptionEnabled ? 'Messages are encrypted' : 'Messages are not encrypted'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Encryption key input */}
              {encryptionEnabled && (
                <Input
                  type="password"
                  placeholder="Enter encryption key"
                  value={encryptionKey}
                  onChange={(e) => setEncryptionKey(e.target.value)}
                  className="mb-2"
                />
              )}
              
              {/* Selected file display */}
              {selectedFile && (
                <div className="flex items-center justify-between p-2 mb-2 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeSelectedFile}>
                    ×
                  </Button>
                </div>
              )}
              
              {/* Message input area */}
              <div className="flex items-end space-x-2">
                <div className="flex-1 flex items-end space-x-2">
                  <Textarea
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="min-h-[60px] max-h-[120px] resize-none"
                    rows={1}
                  />
                  
                  {/* File attachment button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sending}
                          className="p-2"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Attach file</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                </div>
                
                <Button 
                  onClick={handleSendMessage} 
                  disabled={sending || (!newMessage.trim() && !selectedFile)}
                  className="px-4"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedMessagingInterface;
