import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  ArrowLeft, 
  Search, 
  UserPlus, 
  MessageSquare,
  Users,
  UserCheck,
  Clock,
  Smile,
  Paperclip, 
  Image as ImageIcon,
  Mic,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { socketService } from '@/services/socketService';
import api from '@/services/api';
import { encryptMessage, decryptMessage } from '@/utils/messageEncryption';

interface User {
    _id: string;
    name: string;
    avatar?: string;
    type: string;
  department?: string;
  batch?: string;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  isMutual?: boolean;
  canMessage?: boolean;
  followRequestStatus?: string;
}

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadUsers();
      loadConversations();
      setupSocketListeners();
      // Open conversation by id from query string if present
      const params = new URLSearchParams(window.location.search);
      const conversationId = params.get('conversation');
      if (conversationId) {
        openConversationById(conversationId);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser._id);
    }
  }, [selectedUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const setupSocketListeners = () => {
    // Avoid duplicate bindings on rerenders
    socketService.offMessage();
    // Listen for new messages
    socketService.onMessage((payload: any) => {
      // Payload can be { message, conversationId } or the message itself
      const incoming = payload?.message || payload;
      const senderId = incoming?.senderId?._id || incoming?.senderId; // backend may populate senderId object
      const convId = payload?.conversationId || incoming?.conversationId;

      // If we're viewing this chat, reload it
      if (selectedUser && (senderId === selectedUser._id)) {
        // Append immediately for instant UX
        const newMsg = {
          _id: incoming._id || `${Date.now()}`,
          senderId: typeof incoming.senderId === 'object' ? incoming.senderId._id : incoming.senderId,
          senderName: incoming.senderName || '',
          content: incoming.content || '',
          createdAt: incoming.createdAt || new Date().toISOString(),
          isRead: false,
        } as Message;
        setMessages(prev => [...prev, newMsg]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        // Mark as read
        try {
          socketService.markMessagesAsRead(convId, [newMsg._id]);
        } catch {}
      } else {
        // Subtle toast for new message in other conversation
        try {
          toast({ title: 'New message', description: incoming?.senderName ? `From ${incoming.senderName}` : 'You received a new message' });
        } catch {}
      }

      // Also refresh conversations
      loadConversations();
    });

    // Follow events: accepted / rejected / status updates
    socketService.onFollowRequestAccepted(() => { loadUsers(); loadConversations(); });
    socketService.onFollowRequestRejected(() => { loadUsers(); loadConversations(); });
    socketService.onFollowStatusUpdate(() => { loadUsers(); loadConversations(); });
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('👥 Loading users for messaging...');
      
      // Prefer backend messageable-users list (mutuals)
      let messageableUsers: any[] = [];
      try {
        const res = await api.get('/api/conversations/messageable-users');
        messageableUsers = res.data.users || [];
        console.log('👥 Messageable via conversations endpoint:', messageableUsers.length);
      } catch (e) {
        console.warn('Fallback to follows users for messageable list');
        const response = await api.get('/api/follows/users?page=1&limit=50');
        console.log('👥 Users loaded:', response.data.users?.length || 0, 'users');
        messageableUsers = response.data.users?.filter((u: any) => u.canMessage) || [];
      }
      console.log('💬 Messageable users:', messageableUsers.length);
      
      setUsers(messageableUsers);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      setUsers([]);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await api.get('/api/conversations');
      const convs = response.data.conversations || [];
      setConversations(convs);
      // Join all conversation rooms so we receive new messages instantly
      try {
        const ids = convs.map((c: any) => c._id).filter(Boolean);
        if (ids.length > 0) socketService.joinConversations(ids);
      } catch {}
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      setLoading(true);
      console.log('📥 Loading messages for user:', userId);
      
      // Create or get conversation
      const conversationResponse = await api.post('/api/conversations', {
        participantId: userId
      });
      
      console.log('💬 Conversation created/retrieved:', conversationResponse.data);
      
      if (conversationResponse.data.conversation) {
        const conversationId = conversationResponse.data.conversation._id;
        console.log('💬 Fetching messages for conversation:', conversationId);

        // Join socket room for real-time updates
        try {
          socketService.joinConversations([conversationId]);
        } catch {}
        
        const messagesResponse = await api.get(`/api/conversations/${conversationId}/messages`);
        console.log('📨 Messages loaded:', messagesResponse.data.messages?.length || 0, 'messages');
        // Server already returns decrypted content when applicable
        const msgs = messagesResponse.data.messages || [];
        setMessages(msgs);
        // Mark as read via socket
        try {
          const ids = msgs.map((m: any) => m._id);
          socketService.markMessagesAsRead(conversationId, ids);
        } catch {}
      } else {
        console.warn('⚠️ No conversation found for user:', userId);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      setMessages([]);
      toast({ 
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Open existing conversation from a conversationId (e.g., from notifications link)
  const openConversationById = async (conversationId: string) => {
    try {
      const res = await api.get(`/api/conversations/${conversationId}`);
      const conv = res.data.conversation;
      if (!conv) return;
      const other = (conv.participants || []).find((p: any) => p._id !== user?._id);
      if (other) {
        // Ensure user appears in list
        setUsers(prev => {
          const exists = prev.some(u => u._id === other._id);
          return exists ? prev : [other, ...prev];
        });
        setSelectedUser(other);
        await loadMessages(other._id);
      }
    } catch (e) {
      console.error('Failed to open conversation by id', e);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const messageContent = newMessage.trim();
      console.log('📤 Sending message to user:', selectedUser._id, 'Content:', messageContent);
      
      setNewMessage('');

      // Create or get conversation
      const conversationResponse = await api.post('/api/conversations', {
        participantId: selectedUser._id
      });

      console.log('💬 Conversation response:', conversationResponse.data);

      if (conversationResponse.data.conversation) {
        const conversationId = conversationResponse.data.conversation._id;
        console.log('💬 Using conversation ID:', conversationId);
        
        // Optimistic UI append
        const tempId = `temp_${Date.now()}`;
        const optimistic: Message = {
          _id: tempId,
          senderId: user._id,
          senderName: user.name,
          content: messageContent,
          createdAt: new Date().toISOString(),
          isRead: true,
        } as any;
        setMessages(prev => [...prev, optimistic]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        // Send plain content; server will encrypt and store securely
        const messageResponse = await api.post(`/api/conversations/${conversationId}/messages`, {
          content: messageContent
        });

        console.log('✅ Encrypted message sent successfully:', messageResponse.data);

        // Replace optimistic with server message if possible
        const real = messageResponse.data?.message || null;
        if (real) {
          setMessages(prev => prev.map(m => (m._id === tempId ? {
            _id: real._id,
            senderId: typeof real.senderId === 'object' ? real.senderId._id : real.senderId,
            senderName: real.senderName,
            content: real.content,
            createdAt: real.createdAt,
            isRead: real.isRead,
          } : m)));
        }
      } else {
        throw new Error('No conversation created');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Restore the message if sending failed
      setNewMessage(newMessage);
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.batch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
      return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List - Instagram Style */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-8rem)]">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Messages
                </CardTitle>
              <Input
                  placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => setSelectedUser(user)}
                      className={`flex items-center space-x-3 p-4 cursor-pointer transition-colors border-b border-gray-100 hover:bg-gray-50 ${
                        selectedUser?._id === user._id
                          ? 'bg-blue-50 border-l-4 border-l-blue-500'
                          : ''
                      }`}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {user.department} • {user.batch}
                        </p>
                        {user.isMutual && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Mutual
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>

          {/* Chat Area - Instagram Style */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-8rem)]">
              {selectedUser ? (
            <>
              {/* Chat Header */}
                  <CardHeader className="border-b bg-gray-50">
                <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedUser.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {selectedUser.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
                        <p className="text-sm text-gray-500">
                          {selectedUser.department} • {selectedUser.batch}
                    </p>
                  </div>
                </div>
                  </CardHeader>

                  {/* Messages Area */}
                  <div className="flex-1 h-[calc(100vh-20rem)] overflow-y-auto p-4 bg-gray-50">
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const rawSender = (message as any).senderId;
                        const senderId = typeof rawSender === 'string' ? rawSender : rawSender?._id;
                        const isSelf = senderId === user?._id;
                        return (
                          <div
                            key={message._id}
                            className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                                isSelf
                                  ? 'bg-blue-500 text-white rounded-br-md'
                                  : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
                              }`}
                            >
                              <p className={`text-xs mb-1 ${isSelf ? 'text-blue-100' : 'text-gray-600'}`}>
                                {message.senderName || (isSelf ? user?.name : selectedUser?.name)}
                              </p>
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${isSelf ? 'text-blue-100' : 'text-gray-500'}`}>
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      
                    </div>
              </div>

                  {/* Message Input - Instagram Style */}
                  <div className="border-t bg-white p-4">
                <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 hover:bg-gray-100 rounded-full"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile className="h-5 w-5 text-gray-500" />
                  </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 hover:bg-gray-100 rounded-full"
                        onClick={() => {
                          // File upload functionality
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,video/*,.pdf,.doc,.docx';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              // Handle file upload
                              console.log('File selected:', file.name);
                            }
                          };
                          input.click();
                        }}
                      >
                        <Paperclip className="h-5 w-5 text-gray-500" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                          ref={inputRef}
                      value={newMessage}
                          onChange={handleInputChange}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                          placeholder="Message..."
                          className="rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                        />
                      </div>
                    <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="rounded-full bg-blue-500 hover:bg-blue-600 text-white p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="h-5 w-5" />
                    </Button>
                  </div>
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="mt-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                        <div className="grid grid-cols-8 gap-1">
                          {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => addEmoji(emoji)}
                              className="p-1 hover:bg-gray-100 rounded text-lg"
                            >
                              {emoji}
                            </button>
                          ))}
                </div>
                      </div>
                    )}
              </div>
            </>
          ) : (
                <div className="flex items-center justify-center h-full">
              <div className="text-center">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                    <p className="text-gray-500">Choose a user from the list to start messaging</p>
              </div>
            </div>
          )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
