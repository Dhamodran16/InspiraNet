import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, 
  Search, 
  UserPlus, 
  MessageSquare,
  Users,
  UserCheck,
  Clock,
  Smile,
  Paperclip, 
  Image as ImageIcon,
  File,
  Download,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoreVertical,
  Phone,
  Video,
  Settings,
  User,
  Plus,
  ChevronDown,
  Mic,
  Check,
  X,
  Trash2,
  MessageCircle,
  UserX,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { socketService } from '@/services/socketService';
import api from '@/services/api';
import { encryptMessage, decryptMessage } from '@/utils/messageEncryption';
import { useNavigate } from 'react-router-dom';

interface User {
  _id: string;
  name: string;
  avatar?: string;
  type: string;
  email: string;
  department?: string;
  batch?: string;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  isMutual?: boolean;
  canMessage?: boolean;
  followRequestStatus?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'pdf' | 'file';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  isRead: boolean;
  readBy?: Array<{ userId: string; readAt: string }>;
  isEncrypted?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isOwn?: boolean; // Added isOwn field from backend
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: string | Message;
  lastMessageTime?: string;
  unreadCount: number;
  updatedAt: string;
  isGroupChat?: boolean;
  groupName?: string;
  groupAdmin?: string | { _id: string; name?: string; avatar?: string }; // Group creator/admin ID (can be populated object or string)
  groupAdmins?: (string | { _id: string; name?: string; avatar?: string })[]; // Multiple admins array
}

const EnhancedMessagesPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [showPrivateInfo, setShowPrivateInfo] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  // Group creation filters
  const [groupTypeFilter, setGroupTypeFilter] = useState('all');
  const [groupBatchFilter, setGroupBatchFilter] = useState('all');
  const [groupDepartmentFilter, setGroupDepartmentFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'unread', 'groups'
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  
  // Separate state for Add Members (not reusing group creation state)
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('');
  const [addMemberSelectedUsers, setAddMemberSelectedUsers] = useState<User[]>([]);
  const [addMemberAvailableUsers, setAddMemberAvailableUsers] = useState<User[]>([]);
  const [addMemberLoadingUsers, setAddMemberLoadingUsers] = useState(false);
  const [addMemberTypeFilter, setAddMemberTypeFilter] = useState('all');
  const [addMemberBatchFilter, setAddMemberBatchFilter] = useState('all');
  const [addMemberDepartmentFilter, setAddMemberDepartmentFilter] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'forMe' | 'forEveryone' | 'hard' | 'soft' | null>(null);
  const [showAutoDeleteDialog, setShowAutoDeleteDialog] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const selectedConversationRef = useRef<string | null>(null);

  // Prevent body scrolling and ensure proper height constraints
  useEffect(() => {
    // Prevent body from scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.body.style.maxHeight = '100vh';
    
    // Ensure html is also constrained
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100vh';
    document.documentElement.style.maxHeight = '100vh';
    
    return () => {
      // Restore body scrolling when component unmounts
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.maxHeight = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.maxHeight = '';
    };
  }, []);

  const applyConversationPreview = useCallback((
    conversationId: string,
    lastMsg: Message | string | null,
    options: { resetUnread?: boolean; incrementUnread?: boolean; moveToTop?: boolean } = {}
  ) => {
    let didUpdate = false;

    setConversations(prev => {
      const index = prev.findIndex(conv => conv._id === conversationId);
      if (index === -1) {
        return prev;
      }

      didUpdate = true;
      const existing = prev[index];
      const isMessageObject = typeof lastMsg === 'object' && lastMsg !== null;
      const typedMessage = isMessageObject ? (lastMsg as Message) : null;

      const unreadCount = options.resetUnread
        ? 0
        : options.incrementUnread
          ? (existing.unreadCount || 0) + 1
          : existing.unreadCount;

      const lastMessageTime = typedMessage?.createdAt
        ? typedMessage.createdAt
        : existing.lastMessageTime || new Date().toISOString();

      const updatedConversation: Conversation = {
        ...existing,
        lastMessage: lastMsg ?? existing.lastMessage,
        lastMessageTime,
        unreadCount,
        updatedAt: new Date().toISOString()
      };

      if (options.moveToTop === false) {
        const clone = [...prev];
        clone[index] = updatedConversation;
        return clone;
      }

      const clone = [...prev];
      clone.splice(index, 1);
      return [updatedConversation, ...clone];
    });

    setSelectedConversation(prev => {
      if (!prev || prev._id !== conversationId) return prev;
      const isMessageObject = typeof lastMsg === 'object' && lastMsg !== null;
      return {
        ...prev,
        lastMessage: lastMsg ?? prev.lastMessage,
        lastMessageTime: isMessageObject && (lastMsg as Message).createdAt
          ? (lastMsg as Message).createdAt
          : prev.lastMessageTime
      };
    });

    return didUpdate;
  }, []);

  // Emoji picker data
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
    '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
    '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
    '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
    '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
    '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
  ];

  useEffect(() => {
    if (user) {
      loadConversations();
      setupSocketListeners();
    }
  }, [user]);

  // Track previous conversation to stop typing when switching
  const prevConversationRef = useRef<string | null>(null);

  useEffect(() => {
    // Stop typing indicator for previous conversation when switching
    if (isTyping && prevConversationRef.current && selectedConversation?._id !== prevConversationRef.current) {
      socketService.stopTyping(prevConversationRef.current);
      setIsTyping(false);
    }
    
    if (selectedConversation && user) {
      const conversationId = selectedConversation._id;
      
      // Update previous conversation reference AFTER checking for typing
      const previousId = prevConversationRef.current;
      prevConversationRef.current = conversationId;
      selectedConversationRef.current = conversationId;
      
      // Only load messages if this is a different conversation
      if (previousId !== conversationId) {
        loadMessages(conversationId);
        joinConversationRoom(conversationId);
        
        // Clear state when switching conversations
        setNewMessage('');
        setSelectedMessages([]);
        setIsSelectMode(false);
        setShowEmojiPicker(false);
      }
    } else {
      // Clear all state when no conversation is selected
      if (prevConversationRef.current && isTyping) {
        socketService.stopTyping(prevConversationRef.current);
      }
      prevConversationRef.current = null;
      selectedConversationRef.current = null;
      setNewMessage('');
      setIsTyping(false);
      setSelectedMessages([]);
      setIsSelectMode(false);
      setShowEmojiPicker(false);
      setMessages([]);
    }
  }, [selectedConversation, user]);

  // Auto-scroll to last message when conversation changes or messages load
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        scrollToLastMessage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedConversation, messages.length]); // Include messages.length to scroll when new messages arrive

  useEffect(() => {
    if (selectedConversation) {
      applyConversationPreview(
        selectedConversation._id,
        selectedConversation.lastMessage || null,
        { resetUnread: true, moveToTop: false }
      );
    }
  }, [selectedConversation?._id, applyConversationPreview]);

  useEffect(() => {
    if (isTyping && selectedConversation) {
      socketService.startTyping(selectedConversation._id);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.stopTyping(selectedConversation._id);
      }, 1000);
    }
  }, [isTyping, selectedConversation]);

  const setupSocketListeners = () => {
    socketService.offMessage();
    socketService.offMessageRead();
    
    socketService.onMessage((payload: any) => {
      const incoming = payload?.message || payload;
      const convId = payload?.conversationId || incoming?.conversationId;
      if (!convId) return;

        const processedSenderId = typeof incoming.senderId === 'object' ? incoming.senderId._id : incoming.senderId;
      const isOwnMessage = processedSenderId === user?._id;
      const isCurrentConversation = selectedConversationRef.current === convId;

      const normalizedMessage: Message = {
          _id: incoming._id || `${Date.now()}`,
          conversationId: convId,
          senderId: processedSenderId,
          senderName: incoming.senderName || '',
          content: incoming.content || '',
          messageType: incoming.messageType || 'text',
          mediaUrl: incoming.mediaUrl,
          fileName: incoming.fileName,
          fileSize: incoming.fileSize,
          createdAt: incoming.createdAt || new Date().toISOString(),
          isRead: false,
        isEncrypted: incoming.isEncrypted || false,
        status: isOwnMessage ? 'delivered' : undefined,
        isOwn: isOwnMessage
        };
        
      // Always update conversation preview first (for chat list)
      applyConversationPreview(convId, normalizedMessage, {
        resetUnread: Boolean(isCurrentConversation),
        incrementUnread: !isCurrentConversation && !isOwnMessage
      });
        
      // Update conversation view if it's the current conversation
      if (isCurrentConversation) {
        if (isOwnMessage) {
          // SENDER SIDE: Update own message from optimistic/sent to delivered
        setMessages(prev => {
            let foundMatch = false;
            const updated = prev.map(msg => {
              // Match by actual ID (most reliable)
              const matchesById = msg._id === normalizedMessage._id;
              // Match by temp ID pattern and content
              const matchesByTempId = msg._id.startsWith('temp_') && 
                msg.content === normalizedMessage.content && 
                (msg.status === 'sending' || msg.status === 'sent');
              // Match by content and status (for cases where IDs don't match yet)
              const matchesByContent = msg.content === normalizedMessage.content && 
                (msg.status === 'sending' || msg.status === 'sent') && 
                Math.abs(new Date(msg.createdAt).getTime() - new Date(normalizedMessage.createdAt).getTime()) < 10000;
              
              if (matchesById || matchesByTempId || matchesByContent) {
                foundMatch = true;
                return { 
                  ...normalizedMessage, 
                  status: 'delivered' as const,
                  isOwn: true
                };
              }
              return msg;
            });
            
            // If no match found, add the message (shouldn't happen but safety check)
            if (!foundMatch) {
              return [...updated, { ...normalizedMessage, status: 'delivered' as const, isOwn: true }];
            }
            
            return updated;
          });
        } else {
          // RECEIVER SIDE: Add received message instantly
          setMessages(prev => {
            const exists = prev.some(msg => msg._id === normalizedMessage._id);
          if (exists) {
              // Update existing message if needed (shouldn't happen but safety)
              return prev.map(msg => 
                msg._id === normalizedMessage._id 
                  ? { ...msg, ...normalizedMessage, isOwn: false }
                  : msg
              );
            }
            // Add new message instantly
            return [...prev, { ...normalizedMessage, isOwn: false }];
          });
          
          // Auto-scroll to last message when receiving new messages
          requestAnimationFrame(() => {
            scrollToLastMessage(true);
          });
          
          // Mark as read instantly
          try {
            socketService.markMessagesAsRead(convId, [normalizedMessage._id]);
        } catch {}
        }
      } else {
        // Message is for a different conversation
        if (!isOwnMessage) {
          // Show toast notification for new message in other conversation
          toast({
            title: 'New message',
            description: incoming?.senderName ? `From ${incoming.senderName}` : 'You received a new message'
          });
        }
      }
    });

    socketService.onTyping((data: any) => {
      if (selectedConversationRef.current === data.conversationId) {
        setTypingUsers(prev => new Set(prev).add(data.userId));
      }
    });

    socketService.onStopTyping((data: any) => {
      if (selectedConversationRef.current === data.conversationId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    });

    // Listen for read receipt updates
    socketService.onMessageRead((data: any) => {
      if (data.conversationId) {
        const isCurrentConversation = selectedConversationRef.current === data.conversationId;
        
        // Update message status to 'read' for messages that were read
        if (isCurrentConversation) {
          setMessages(prev => {
            const updated = prev.map(msg => {
              // Only update own messages (sender side) to show read status
              const isOwnMsg = msg.isOwn || (() => {
                let senderId: string | undefined;
                if (typeof msg.senderId === 'object' && msg.senderId !== null) {
                  senderId = (msg.senderId as any)._id?.toString();
                } else {
                  senderId = msg.senderId?.toString();
                }
                return senderId === user?._id?.toString();
              })();
              
              if (data.messageIds && data.messageIds.includes(msg._id) && isOwnMsg) {
                return {
                  ...msg,
                  status: 'read' as const,
                  isRead: true,
                  readBy: msg.readBy || []
                };
              }
              return msg;
            });
            
            // Find the last read message to update conversation preview
            const lastReadMessage = updated
              .filter(msg => {
                const isOwnMsg = msg.isOwn || (() => {
                  let senderId: string | undefined;
                  if (typeof msg.senderId === 'object' && msg.senderId !== null) {
                    senderId = (msg.senderId as any)._id?.toString();
                  } else {
                    senderId = msg.senderId?.toString();
                  }
                  return senderId === user?._id?.toString();
                })();
                return data.messageIds && data.messageIds.includes(msg._id) && isOwnMsg;
              })
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            
            if (lastReadMessage) {
              // Update conversation preview with read status
              applyConversationPreview(data.conversationId, lastReadMessage, { resetUnread: false });
            }
            
            return updated;
          });
        } else {
          // Update conversation preview even if not current conversation
          loadConversations();
        }
      }
    });

    // Listen for message deletion events
    socketService.on('messages_deleted', (data: any) => {
      if (selectedConversationRef.current === data.conversationId) {
        setMessages(prev => {
          const filtered = prev.filter(msg => !data.messageIds.includes(msg._id));
          // If all messages are deleted, exit select mode
          if (filtered.length === 0) {
            setIsSelectMode(false);
          }
          return filtered;
        });
        setSelectedMessages(prev => prev.filter(id => !data.messageIds.includes(id)));
      }
    });

    // Listen for chat cleared events (only for the user who cleared it)
    socketService.on('chat_cleared_for_me', (data: any) => {
      console.log('🔔 chat_cleared_for_me event received:', {
        conversationId: data.conversationId,
        clearedBy: data.clearedBy,
        currentUser: user?._id,
        selectedConversation: selectedConversationRef.current
      });
      
      if (selectedConversationRef.current === data.conversationId) {
        // Verify this is for the current user (double check)
        const clearedByUserId = data.clearedBy?.toString();
        const currentUserId = user?._id?.toString();
        
        console.log('🔍 Comparing user IDs:', {
          clearedByUserId,
          currentUserId,
          match: clearedByUserId === currentUserId
        });
        
        // Only clear if the clearedBy matches current user AND user is defined
        if (user?._id && clearedByUserId === currentUserId) {
          console.log('✅ Clearing messages for current user only');
          // Clear messages from local state (only for the user who initiated the clear)
          setMessages([]);
          setSelectedMessages([]);
          setIsSelectMode(false);
          
          // Update conversation preview
          loadConversations();
        } else {
          console.log('❌ Chat cleared event received but not for current user. Ignoring.', {
            clearedByUserId,
            currentUserId,
            userExists: !!user?._id
          });
        }
      } else {
        console.log('⚠️ Chat cleared event for different conversation. Ignoring.');
      }
    });

    // Keep old listener for backward compatibility (in case server hasn't been updated)
    // NOTE: This should not be triggered if backend is correctly using chat_cleared_for_me
    socketService.on('chat_cleared', (data: any) => {
      console.log('⚠️ OLD chat_cleared event received (backward compatibility):', {
        conversationId: data.conversationId,
        clearedBy: data.clearedBy,
        currentUser: user?._id,
        selectedConversation: selectedConversationRef.current
      });
      
      if (selectedConversationRef.current === data.conversationId) {
        // CRITICAL: Only clear if the current user cleared it
        // Convert both to strings for reliable comparison
        const clearedByUserId = data.clearedBy?.toString();
        const currentUserId = user?._id?.toString();
        
        if (user?._id && clearedByUserId === currentUserId) {
          console.log('✅ Chat cleared event for current user - clearing messages (backward compatibility)');
        setMessages([]);
        setSelectedMessages([]);
        setIsSelectMode(false);
        } else {
          console.log('❌ Chat cleared event received but NOT for current user. Ignoring.', {
            clearedByUserId,
            currentUserId,
            userExists: !!user?._id
          });
          // DO NOT clear messages if another user cleared the chat
        }
      }
    });

    // Listen for comprehensive deletion events
    socketService.on('messages_deleted_for_me', (data: any) => {
      if (selectedConversationRef.current === data.conversationId) {
        setMessages(prev => prev.filter(msg => !data.messageIds.includes(msg._id)));
        setSelectedMessages(prev => prev.filter(id => !data.messageIds.includes(id)));
      }
    });

    socketService.on('messages_deleted_for_everyone', (data: any) => {
      if (selectedConversationRef.current === data.conversationId) {
        setMessages(prev => prev.filter(msg => !data.messageIds.includes(msg._id)));
        setSelectedMessages(prev => prev.filter(id => !data.messageIds.includes(id)));
        loadConversations(); // Refresh conversation list
      }
    });

    socketService.on('messages_hard_deleted', (data: any) => {
      if (selectedConversationRef.current === data.conversationId) {
        setMessages(prev => prev.filter(msg => !data.messageIds.includes(msg._id)));
        setSelectedMessages(prev => prev.filter(id => !data.messageIds.includes(id)));
        loadConversations();
      }
    });

    socketService.on('messages_admin_deleted', (data: any) => {
      if (selectedConversationRef.current === data.conversationId) {
        setMessages(prev => prev.filter(msg => !data.messageIds.includes(msg._id)));
        setSelectedMessages(prev => prev.filter(id => !data.messageIds.includes(id)));
        loadConversations();
      }
    });

    socketService.on('messages_bulk_deleted', (data: any) => {
      if (selectedConversationRef.current === data.conversationId) {
        setMessages(prev => prev.filter(msg => !data.messageIds.includes(msg._id)));
        setSelectedMessages(prev => prev.filter(id => !data.messageIds.includes(id)));
        if (data.deleteMode === 'forEveryone' || data.deleteMode === 'hard') {
          loadConversations();
        }
      }
    });

    socketService.on('unsent_messages_deleted', (data: any) => {
      if (selectedConversationRef.current === data.conversationId) {
        setMessages(prev => prev.filter(msg => !data.messageIds.includes(msg._id)));
        setSelectedMessages(prev => prev.filter(id => !data.messageIds.includes(id)));
      }
    });

    // Listen for conversation deleted events (handles group deletion)
    socketService.on('conversation_deleted', (data: any) => {
      const { conversationId } = data;
      
      // If the deleted conversation is currently selected, clear it
      if (selectedConversation && data.conversationId === selectedConversation._id) {
        setSelectedConversation(null);
        setMessages([]);
        setSelectedMessages([]);
        setIsSelectMode(false);
        setShowGroupMembers(false);
      }
      
      // Refresh conversation list
      loadConversations();
      
      // Show notification only if it's a group chat
      const deletedConv = conversations.find(c => c._id === conversationId);
      if (deletedConv?.isGroupChat) {
        toast({
          title: "Group Deleted",
          description: "The group has been deleted by the admin.",
        });
      }
    });

    // Listen for group created events
    socketService.on('group_created', (data: any) => {
      // Refresh conversation list to show new group
      loadConversations();
    });

    // Message status updates
    socketService.on('message_status_update', (data: any) => {
      console.log('Message status update:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, status: data.status }
          : msg
      ));
    });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/conversations');
      setConversations(response.data.conversations || []);
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

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/conversations/${conversationId}/messages`);
      const msgs = response.data.messages || [];
      
      console.log('Loaded', msgs.length, 'messages for conversation:', conversationId, 'Current user:', user?._id);
      
      // CRITICAL: Only set messages if we got a valid response
      // This ensures we don't accidentally clear messages
      if (Array.isArray(msgs)) {
      setMessages(msgs);
      } else {
        console.error('Invalid messages response:', response.data);
        setMessages([]);
      }
      
      // Auto-scroll to last message after messages load
      // Use longer delay to ensure all messages are rendered
      setTimeout(() => {
        scrollToLastMessage();
      }, 200);
      
      // Mark messages as read
      if (msgs.length > 0) {
        const unreadIds = msgs
          .filter((msg: Message) => {
            // Only mark messages as read if they're not from the current user
            let senderId: string | undefined;
            if (typeof msg.senderId === 'object' && msg.senderId !== null) {
              senderId = (msg.senderId as any)._id?.toString();
            } else {
              senderId = msg.senderId?.toString();
            }
            const isOwnMessage = senderId === user?._id?.toString();
            return !msg.isRead && !isOwnMessage;
          })
          .map((msg: Message) => msg._id);
        
        if (unreadIds.length > 0) {
          // Mark as read via socket
          socketService.markMessagesAsRead(conversationId, unreadIds);
          
          // Also update local state optimistically
          setMessages(prev => prev.map(msg => {
            if (unreadIds.includes(msg._id)) {
              return { ...msg, isRead: true };
            }
            return msg;
          }));
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const joinConversationRoom = (conversationId: string) => {
    try {
      socketService.joinConversations([conversationId]);
    } catch (error) {
      console.error('Error joining conversation room:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSelectedFile(null);
    setUploadProgress(0);

    let tempMessage: Message | null = null;

    try {
      let mediaUrl = '';
      let fileName = '';
      let fileSize = 0;
      let messageType = 'text';

      // Handle file upload
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('conversationId', selectedConversation._id);
        
        try {
          // Axios will automatically set Content-Type with boundary for FormData
        const uploadResponse = await api.post('/api/messages/upload', formData, {
          onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
              }
          }
        });
        
          if (uploadResponse.data && uploadResponse.data.success) {
          mediaUrl = uploadResponse.data.mediaUrl;
          fileName = uploadResponse.data.fileName;
          fileSize = uploadResponse.data.fileSize;
          messageType = uploadResponse.data.messageType;
          } else {
            throw new Error(uploadResponse.data?.error || 'Upload failed');
          }
        } catch (uploadError: any) {
          console.error('File upload error:', uploadError);
          const errorMessage = uploadError.response?.data?.error || 
                             uploadError.response?.data?.details || 
                             uploadError.message || 
                             'Failed to upload file';
          throw new Error(errorMessage);
        }
      }

      // Create optimistic message
      tempMessage = {
        _id: `temp_${Date.now()}`,
        conversationId: selectedConversation._id,
        senderId: user._id,
        senderName: user.name,
        content: messageContent,
         messageType: messageType as 'text' | 'image' | 'video' | 'pdf' | 'file',
        mediaUrl,
        fileName,
        fileSize,
        createdAt: new Date().toISOString(),
        isRead: false,
        isEncrypted: false,
        status: 'sending'
      };

      // Add optimistic message immediately
      setMessages(prev => [...prev, tempMessage]);
        applyConversationPreview(selectedConversation._id, tempMessage, { resetUnread: true });
        
        // Auto-scroll to show the new message instantly
        requestAnimationFrame(() => {
          scrollToLastMessage(true);
        });

      // Send message
      const response = await api.post(`/api/conversations/${selectedConversation._id}/messages`, {
        content: messageContent,
        mediaUrl,
        fileName,
        fileSize,
        messageType
      });

      if (response.data.success) {
        const serverMessage = response.data.message;
        
        // Update message with server response - status will be updated to 'delivered' via socket
        setMessages(prev => prev.map(msg => {
          // Match by temp ID or by content and sending status
          const matchesTempId = msg._id === tempMessage._id;
          const matchesContent = msg._id.startsWith('temp_') && msg.content === serverMessage.content && msg.status === 'sending';
          
          if (matchesTempId || matchesContent) {
            return { 
                ...msg, 
              _id: serverMessage._id, 
              status: 'sent', // Will be updated to 'delivered' when socket confirms
              senderId: serverMessage.senderId || msg.senderId,
              senderName: serverMessage.senderName || msg.senderName,
              isOwn: true
            };
          }
          return msg;
        }));

        // Update conversation preview with sent status
        const updatedMessage = {
          ...serverMessage,
          status: 'sent' as const,
          isOwn: true
        };
        applyConversationPreview(selectedConversation._id, updatedMessage, { resetUnread: true });
        
        // Auto-scroll to show the sent message
        requestAnimationFrame(() => {
          scrollToLastMessage(true);
        });
      } else {
        // Remove failed message
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update message status to failed
      if (tempMessage) {
        setMessages(prev => prev.map(msg => 
          msg._id === tempMessage!._id 
            ? { ...msg, status: 'failed' }
            : msg
        ));
      }
      
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
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

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToLastMessage = (smooth = false) => {
    // Always auto-scroll to the last message in the conversation
    if (scrollAreaRef.current) {
      requestAnimationFrame(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current;
          if (smooth) {
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: 'smooth'
            });
          } else {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handler functions for dropdown menus
  const handleCreateGroup = () => {
    setShowGroupModal(true);
    setGroupName('');
    setGroupDescription('');
    setSelectedMembers([]);
    setUserSearchTerm('');
    setGroupTypeFilter('all');
    setGroupBatchFilter('all');
    setGroupDepartmentFilter('all');
    loadAvailableUsers();
  };

  // Separate function to load users for adding members
  const loadAddMemberUsers = async (search = '') => {
    setAddMemberLoadingUsers(true);
    try {
      const params: any = {
        search,
        limit: 100
      };
      
      // Add filters
      if (addMemberTypeFilter !== 'all') {
        params.type = addMemberTypeFilter;
      }
      if (addMemberBatchFilter !== 'all') {
        params.batch = addMemberBatchFilter;
      }
      if (addMemberDepartmentFilter !== 'all') {
        params.department = addMemberDepartmentFilter;
      }
      
      const response = await api.get('/api/follows/users', { params });
      setAddMemberAvailableUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users for add members:', error);
      setAddMemberAvailableUsers([]);
    } finally {
      setAddMemberLoadingUsers(false);
    }
  };

  // Load users when filters change for add members
  useEffect(() => {
    if (showAddMemberModal) {
      loadAddMemberUsers(addMemberSearchTerm);
    }
  }, [addMemberTypeFilter, addMemberBatchFilter, addMemberDepartmentFilter, showAddMemberModal]);

  const loadAvailableUsers = async (search = '') => {
    try {
      setLoadingUsers(true);
      const params: any = {
        search,
        limit: 100
      };
      
      // Add filters
      if (groupTypeFilter !== 'all') {
        params.type = groupTypeFilter;
      }
      if (groupBatchFilter !== 'all') {
        params.batch = groupBatchFilter;
      }
      if (groupDepartmentFilter !== 'all') {
        params.department = groupDepartmentFilter;
      }
      
      const response = await api.get('/api/follows/users', { params });
      setAvailableUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSearch = (searchTerm: string) => {
    setUserSearchTerm(searchTerm);
    loadAvailableUsers(searchTerm);
  };

  // Reload users when filters change
  useEffect(() => {
    if (showGroupModal) {
      loadAvailableUsers(userSearchTerm);
    }
  }, [groupTypeFilter, groupBatchFilter, groupDepartmentFilter]);

  const toggleMemberSelection = (user: User) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(member => member._id === user._id);
      if (isSelected) {
        return prev.filter(member => member._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(member => member._id !== userId));
  };

  const handleGroupCreation = async () => {
    // Check if we're adding members to existing group or creating new
    if (selectedConversation?.isGroupChat && selectedConversation?._id) {
      // Adding members to existing group
      if (selectedMembers.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one member to add.",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await api.post(`/api/conversations/${selectedConversation._id}/members`, {
          memberIds: selectedMembers.map(member => member._id)
        });

        if (response.status === 200) {
          setShowGroupModal(false);
          setSelectedMembers([]);
          // Reload conversation
          const convResponse = await api.get(`/api/conversations/${selectedConversation._id}`);
          setSelectedConversation(convResponse.data.conversation);
          loadConversations();
          toast({
            title: "Members Added",
            description: `${selectedMembers.length} member(s) added successfully.`,
          });
        }
      } catch (error: any) {
        console.error('Error adding members:', error);
        const errorMessage = error.response?.data?.error || "Failed to add members. Please try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } else {
      // Creating new group
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required.",
        variant: "destructive",
      });
      return;
    }

    if (selectedMembers.length < 2) {
      toast({
        title: "Error",
        description: "At least 2 members are required to create a group.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await api.post('/api/messages/conversation/group', {
        participants: selectedMembers.map(member => member._id),
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim()
      });

      if (response.status === 201) {
        setShowGroupModal(false);
        loadConversations(); // Refresh conversation list
        toast({
          title: "Group Created",
          description: `Group "${groupName}" has been created successfully.`,
        });
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      const errorMessage = error.response?.data?.error || "Failed to create group. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedConversation) return;

    // Check if user is admin
    const adminId = typeof selectedConversation.groupAdmin === 'object' && selectedConversation.groupAdmin !== null
      ? (selectedConversation.groupAdmin as any)._id
      : selectedConversation.groupAdmin;
    const isAdmin = adminId && adminId.toString() === user?._id?.toString();

    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only group admin can delete the group.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeletingGroup(true);
      const response = await api.delete(`/api/messages/conversation/${selectedConversation._id}`);
      
      if (response.status === 200) {
        toast({
          title: "Group Deleted",
          description: `Group "${selectedConversation.groupName}" has been deleted successfully.`,
        });
        
        // Clear state and reload conversations
        setSelectedConversation(null);
        setMessages([]);
        setShowGroupMembers(false);
        setShowDeleteGroupDialog(false);
        loadConversations();
      }
    } catch (error: any) {
      console.error('Error deleting group:', error);
      const errorMessage = error.response?.data?.error || "Failed to delete group. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleClearChat = async () => {
    if (!selectedConversation || !user?._id) return;

    try {
      const response = await api.delete(`/api/messages/conversation/${selectedConversation._id}/clear`);
      
      if (response.status === 200 && response.data.success) {
        // IMPORTANT: Don't clear messages here - wait for socket event
        // The socket event will only be sent to the user who cleared
        // This ensures User B doesn't see their messages cleared when User A clears
        
        // Only clear if we're sure this is the current user's action
        // The socket event 'chat_cleared_for_me' will handle the actual clearing
        // This prevents race conditions where User B might see messages cleared
        
        setSelectedMessages([]);
        setIsSelectMode(false);
        
        toast({
          title: "Chat Cleared",
          description: response.data.message || "All messages have been cleared for you. The other person can still see the messages.",
        });
        
        // The actual message clearing will happen via socket event 'chat_cleared_for_me'
        // which is only sent to the user who initiated the clear
      }
    } catch (error: any) {
      console.error('Error clearing chat:', error);
      const errorMessage = error.response?.data?.error || "Failed to clear chat. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedConversation) return;

    try {
      const response = await api.delete(`/api/messages/conversation/${selectedConversation._id}`);
      
      if (response.status === 200) {
        setSelectedConversation(null);
        setMessages([]);
        loadConversations(); // Refresh conversation list
        toast({
          title: "Chat Deleted",
          description: "The conversation has been deleted successfully.",
        });
      }
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      const errorMessage = error.response?.data?.error || "Failed to delete chat. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  // Message selection handlers
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const selectAllMessages = () => {
    setSelectedMessages(messages.map(msg => msg._id));
  };

  const clearSelection = () => {
    setSelectedMessages([]);
    setIsSelectMode(false);
  };

  // Comprehensive deletion handler
  const handleDeleteMessages = async (mode: 'forMe' | 'forEveryone' | 'hard' | 'soft', messageIds?: string[]) => {
    const idsToDelete = messageIds || selectedMessages;
    if (idsToDelete.length === 0 || !selectedConversation) return;

    try {
      let endpoint = '';
      let payload: any = {
        messageIds: idsToDelete,
        conversationId: selectedConversation._id
      };

      switch (mode) {
        case 'forMe':
          endpoint = '/api/messages/delete-for-me';
          break;
        case 'forEveryone':
          endpoint = '/api/messages/delete-for-everyone';
          // Add time window (15 minutes default)
          payload.timeWindow = 15 * 60 * 1000;
          break;
        case 'hard':
          endpoint = '/api/messages/hard-delete';
          payload.deleteMedia = true;
          break;
        case 'soft':
          endpoint = '/api/messages/soft-delete';
          break;
        default:
          return;
      }

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        // Update local state based on delete mode
        if (mode === 'forMe') {
          // Only remove from this user's view
          setMessages(prev => prev.filter(msg => !idsToDelete.includes(msg._id)));
        } else {
          // Remove from all views (forEveryone, hard, soft)
          setMessages(prev => prev.filter(msg => !idsToDelete.includes(msg._id)));
        }

        setSelectedMessages([]);
        setIsSelectMode(false);
        setShowDeleteDialog(false);
        setDeleteMode(null);

        toast({
          title: "Messages Deleted",
          description: response.data.message || `${idsToDelete.length} message(s) deleted successfully.`,
        });
      }
    } catch (error: any) {
      console.error(`Error in ${mode} delete:`, error);
      
      // Provide helpful error message for 404
      let errorMessage = error.response?.data?.error || `Failed to delete messages. Please try again.`;
      if (error.response?.status === 404) {
        errorMessage = `Deletion endpoint not found. Please ensure the server is running and has been restarted to load the new deletion routes.`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Legacy function for backward compatibility
  const deleteSelectedMessages = async () => {
    // Show deletion options dialog
    setShowDeleteDialog(true);
  };

  // Handle unsent message deletion
  const handleUnsentDelete = async (messageIds: string[]) => {
    if (!selectedConversation) return;

    try {
      const response = await api.post('/api/messages/unsent-delete', {
        messageIds,
        conversationId: selectedConversation._id
      });

      if (response.data.success) {
        setMessages(prev => prev.filter(msg => !messageIds.includes(msg._id)));
        toast({
          title: "Unsent Messages Deleted",
          description: `${messageIds.length} unsent message(s) deleted.`,
        });
      }
    } catch (error: any) {
      console.error('Error deleting unsent messages:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete unsent messages.",
        variant: "destructive",
      });
    }
  };

  // Handle media deletion
  const handleMediaDelete = async (messageIds: string[], deleteMessage = false) => {
    if (!selectedConversation) return;

    try {
      const response = await api.post('/api/messages/media-delete', {
        messageIds,
        conversationId: selectedConversation._id,
        deleteMessage,
        deleteLocalOnly: false
      });

      if (response.data.success) {
        if (deleteMessage) {
          setMessages(prev => prev.map(msg => 
            messageIds.includes(msg._id)
              ? { ...msg, mediaUrl: null, fileName: null, fileSize: null, content: '[Media deleted]' }
              : msg
          ));
        }
        toast({
          title: "Media Deleted",
          description: `${response.data.deletedMediaCount} media file(s) deleted.`,
        });
      }
    } catch (error: any) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete media.",
        variant: "destructive",
      });
    }
  };

  // Handle auto-delete setup
  const handleSetAutoDelete = async (messageIds: string[], duration: string) => {
    if (!selectedConversation) return;

    try {
      const response = await api.post('/api/messages/set-auto-delete', {
        messageIds,
        conversationId: selectedConversation._id,
        duration
      });

      if (response.data.success) {
        setMessages(prev => prev.map(msg => {
          if (messageIds.includes(msg._id)) {
            const durationHours = duration === '24h' ? 24 : duration === '7d' ? 168 : duration === '90d' ? 2160 : parseInt(duration);
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + durationHours);
            return {
              ...msg,
              autoDelete: {
                enabled: true,
                expiresAt: expiresAt.toISOString(),
                duration: durationHours
              }
            };
          }
          return msg;
        }));

        toast({
          title: "Auto-Delete Set",
          description: `Messages will be deleted after ${duration}.`,
        });
        setShowAutoDeleteDialog(false);
      }
    } catch (error: any) {
      console.error('Error setting auto-delete:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to set auto-delete.",
        variant: "destructive",
      });
    }
  };

  // Handle admin delete (for group admins)
  const handleAdminDelete = async (messageIds: string[]) => {
    if (!selectedConversation) return;

    try {
      const response = await api.post('/api/messages/admin-delete', {
        messageIds,
        conversationId: selectedConversation._id
      });

      if (response.data.success) {
        setMessages(prev => prev.filter(msg => !messageIds.includes(msg._id)));
        setSelectedMessages([]);
        setIsSelectMode(false);
        
        toast({
          title: "Messages Deleted",
          description: `${messageIds.length} message(s) deleted by admin.`,
        });
      }
    } catch (error: any) {
      console.error('Error in admin delete:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete messages.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = async (mediaUrl: string, fileName: string, messageId?: string) => {
    try {
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      const isCloudinaryUrl = mediaUrl.includes('res.cloudinary.com');
      
      console.log('📥 Download started:', { fileName, isPdf, isCloudinaryUrl, mediaUrl: mediaUrl.substring(0, 100) });
      
      if (isCloudinaryUrl) {
        // Determine file type
        const isDocumentFile = fileName.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|csv|txt|html|xml|json|log|zip|mp3|wav|ogg|webm)$/i);
        
        let downloadUrl = mediaUrl;
        const originalUrl = mediaUrl;
        
        // Step 1: Convert /image/upload/ to /raw/upload/ for documents (including PDFs)
        // This is critical - PDFs uploaded as images need to be converted to raw
        if (isDocumentFile && mediaUrl.includes('/image/upload/')) {
          downloadUrl = mediaUrl.replace(/\/image\/upload\//, '/raw/upload/');
          console.log('🔄 URL converted from image to raw:', {
            original: originalUrl.substring(0, 100),
            converted: downloadUrl.substring(0, 100)
          });
        }
        
        // Step 2: For PDFs and document files, ensure we use raw endpoint
        const isRawFile = downloadUrl.includes('/raw/upload/');
        if (isRawFile || isDocumentFile) {
          // Remove any existing query parameters and add fl_attachment for proper download
          const baseUrl = downloadUrl.split('?')[0];
          downloadUrl = `${baseUrl}?fl_attachment=${encodeURIComponent(fileName)}`;
          console.log('📎 Added fl_attachment parameter:', downloadUrl.substring(0, 150));
        }
        
        // Step 3: Fetch the file with proper headers
        console.log('🌐 Fetching from Cloudinary:', downloadUrl.substring(0, 150));
        
        const response = await fetch(downloadUrl, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
        });
        
        // Step 4: Log response details
        const contentType = response.headers.get('content-type') || 'unknown';
        const contentLength = response.headers.get('content-length') || 'unknown';
        console.log('📋 Response headers:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          contentLength,
          ok: response.ok
        });
        
        if (!response.ok) {
          // Clone response before reading to avoid "body stream already read" error
          const clonedResponse = response.clone();
          const text = await clonedResponse.text();
          console.error('❌ HTTP error response:', {
            status: response.status,
            contentType,
            responsePreview: text.substring(0, 200)
          });
          throw new Error(`HTTP error! status: ${response.status}, content-type: ${contentType}`);
        }
        
        // Step 5: Get the response as array buffer first to verify it's binary
        const arrayBuffer = await response.arrayBuffer();
        console.log('📦 Received array buffer:', {
          size: arrayBuffer.byteLength,
          contentType
        });
        
        // Step 6: For PDFs, verify we got actual PDF data (not HTML/JSON/error)
        if (isPdf) {
          const uint8Array = new Uint8Array(arrayBuffer);
          const firstBytes = Array.from(uint8Array.slice(0, 10)).map(b => String.fromCharCode(b)).join('');
          const pdfSignature = firstBytes.substring(0, 4);
          
          console.log('🔍 PDF verification:', {
            pdfSignature,
            isValidPdf: pdfSignature === '%PDF',
            firstBytes: firstBytes,
            contentType,
            blobSize: arrayBuffer.byteLength
          });
          
          // Verify PDF signature
          if (pdfSignature !== '%PDF') {
            // Try to read as text to see what we actually got
            const decoder = new TextDecoder('utf-8');
            const textPreview = decoder.decode(uint8Array.slice(0, 500));
            console.error('❌ Invalid PDF signature! Got:', {
              signature: pdfSignature,
              preview: textPreview,
              contentType
            });
            
            throw new Error(`Invalid PDF file - expected PDF signature '%PDF' but got '${pdfSignature}'. Content-Type: ${contentType}`);
          }
          
          // Create blob with explicit PDF MIME type
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          console.log('✅ PDF blob created:', {
            size: blob.size,
            type: blob.type
          });
          
          // Step 7: Download the file
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 200);
          
          toast({
            title: "Download started",
            description: `Downloading ${fileName}`,
          });
        } else {
          // For non-PDF files, use arrayBuffer to avoid "body stream already read" error
          const blob = new Blob([arrayBuffer], { type: contentType || 'application/octet-stream' });
          console.log('✅ Blob created:', {
            size: blob.size,
            type: blob.type
          });
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 200);
          
          toast({
            title: "Download started",
            description: `Downloading ${fileName}`,
          });
        }
      } else if (mediaUrl.startsWith('http')) {
        // For other external URLs (non-Cloudinary)
        console.log('🌐 Fetching from external URL:', mediaUrl.substring(0, 100));
        
        const response = await fetch(mediaUrl, {
          method: 'GET',
          mode: 'cors',
        });
        
        const contentType = response.headers.get('content-type') || 'unknown';
        console.log('📋 External URL response:', {
          status: response.status,
          contentType
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // For PDFs, verify signature and create blob with correct type
        if (isPdf) {
          const uint8Array = new Uint8Array(arrayBuffer);
          const pdfSignature = String.fromCharCode(...uint8Array.slice(0, 4));
          
          if (pdfSignature !== '%PDF') {
            throw new Error(`Invalid PDF file - expected PDF signature '%PDF' but got '${pdfSignature}'`);
          }
          
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 200);
        } else {
          // For non-PDF files, use arrayBuffer to avoid "body stream already read" error
          const arrayBuffer = await response.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: contentType || 'application/octet-stream' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 200);
        }
        
        toast({
          title: "Download started",
          description: `Downloading ${fileName}`,
        });
      } else {
        // For local/data URLs
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = fileName;
        link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
        
        toast({
          title: "Download started",
          description: `Downloading ${fileName}`,
        });
      }
    } catch (error: any) {
      console.error('❌ Error downloading file:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        fileName
      });
      
      toast({
        title: "Download failed",
        description: error.message || "Could not download the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderMessage = (message: Message) => {
    // Fix: Handle senderId as object or string
    const currentUserId = user?._id?.toString();
    let messageSenderId;
    
    // Handle senderId as object or string, and account for possible null values
    if (message.senderId && typeof message.senderId === 'object' && message.senderId !== null) {
      const senderIdObj = message.senderId as any;
      messageSenderId = senderIdObj._id?.toString() || senderIdObj.toString();
    } else if (message.senderId) {
      messageSenderId = message.senderId.toString();
    } else {
      messageSenderId = '';
    }
    
    const isOwn = message.isOwn !== undefined ? message.isOwn : (currentUserId === messageSenderId);
    
    const messageTime = formatTime(message.createdAt);
    const isSelected = selectedMessages.includes(message._id);
    const isGroupMessage = selectedConversation?.isGroupChat;

    return (
      <div key={message._id} data-message-id={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 group relative`}>
        {/* Message container with proper alignment - includes checkbox inside */}
        <div className={`flex items-end max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'} relative`}>
          {/* Selection checkbox - Modern design with animation */}
        {isSelectMode && (
            <div className={`flex items-center ${isOwn ? 'mr-3' : 'ml-3'} z-10`}>
              <div className="relative">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleMessageSelection(message._id)}
                  className="w-6 h-6 text-blue-600 bg-white border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer transition-all duration-200 hover:border-blue-400 hover:scale-110 checked:bg-blue-600 checked:border-blue-600 appearance-none"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundImage: isSelected ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'white\'%3E%3Cpath fill-rule=\'evenodd\' d=\'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\' clip-rule=\'evenodd\'/%3E%3C/svg%3E")' : 'none',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          )}
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
            {/* Message bubble with sender name inside for group chats */}
            <div className={`message-bubble px-4 py-3 rounded-2xl shadow-sm relative border ${
          isOwn 
                ? 'message-bubble-own rounded-br-md' 
                : 'message-bubble-other rounded-bl-md'
            } ${isSelected ? 'ring-2 ring-primary/50' : ''}`}>
              {/* Sender name inside message bubble - ONLY for group chats */}
              {!isOwn && selectedConversation?.isGroupChat && (
                <div className="text-xs font-semibold mb-1.5 opacity-90 message-sender-subtle">
                  {message.senderName || 'Unknown User'}
            </div>
          )}
          {/* File message */}
          {message.messageType !== 'text' && (
            <div className="mb-2">
              {message.messageType === 'image' ? (
                <div className="space-y-2">
                      <div className="relative group">
                  <img 
                    src={message.mediaUrl} 
                    alt="Shared image" 
                    className="max-w-full h-auto rounded-lg cursor-pointer"
                    onClick={() => window.open(message.mediaUrl, '_blank')}
                  />
                        {/* Download button overlay for images */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(message.mediaUrl!, message.fileName || 'image.jpg', message._id);
                            }}
                            className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {message.content && message.content !== '[image]' && (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  ) : message.messageType === 'video' || (message.mediaUrl && message.fileName?.match(/\.(mp4|webm|ogg|mov|avi|wmv)$/i)) ? (
                    <div className="space-y-2">
                      <div className="relative group">
                        <video 
                          src={message.mediaUrl} 
                          controls
                          className="max-w-full h-auto rounded-lg"
                        />
                        {/* Download button overlay for videos */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(message.mediaUrl!, message.fileName || 'video.mp4', message._id);
                            }}
                            className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {message.content && message.content !== '[video]' && message.content !== '[file]' && (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  ) : message.mediaUrl && message.fileName?.match(/\.(mp3|wav|ogg|webm)$/i) ? (
                    <div className="space-y-2">
                      <div className="relative group p-3 bg-white/20 rounded-lg">
                        <audio 
                          src={message.mediaUrl} 
                          controls
                          className="w-full"
                        />
                        {/* Download button for audio files */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(message.mediaUrl!, message.fileName || 'audio.mp3', message._id);
                            }}
                            className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {message.content && message.content !== '[file]' && (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2 p-2 bg-white/20 rounded-lg">
                  <File className="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{message.fileName || 'File'}</p>
                    <p className="text-xs opacity-75">{formatFileSize(message.fileSize || 0)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                        onClick={() => downloadFile(message.mediaUrl!, message.fileName || 'file', message._id)}
                    className="h-6 w-6 p-0"
                        title="Download file"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Text content */}
          {message.content && message.messageType === 'text' && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
          
          {/* Message metadata */}
          <div className="flex items-center justify-end mt-1 space-x-1">
            <span className="text-xs opacity-75">{messageTime}</span>
            {isOwn && (
              <div className="flex items-center ml-1">
                {message.status === 'sending' && (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin opacity-50" />
                )}
                {message.status === 'sent' && (
                  <div className="flex">
                    <Check className="h-3 w-3 opacity-50" />
                  </div>
                )}
                {message.status === 'delivered' && (
                  <div className="flex">
                    <Check className="h-3 w-3 opacity-50" />
                    <Check className="h-3 w-3 -ml-1 opacity-50" />
                  </div>
                )}
                {message.status === 'read' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex cursor-help">
                    <Check className="h-3 w-3 text-blue-400" />
                    <Check className="h-3 w-3 -ml-1 text-blue-400" />
                  </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Read {message.readBy && message.readBy.length > 0 ? `by ${message.readBy.length} ${message.readBy.length === 1 ? 'person' : 'people'}` : ''}</p>
                        </TooltipContent>
                      </Tooltip>
                )}
                {!message.status && (
                  <div className="flex">
                    <Check className="h-3 w-3 opacity-50" />
                  </div>
                )}
                {message.status === 'failed' && <X className="h-3 w-3 text-red-400" />}
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredConversations = conversations.filter(conv => {
    // Apply active filter
    if (activeFilter === 'groups' && !conv.isGroupChat) return false;
    if (activeFilter === 'unread' && conv.unreadCount === 0) return false;
    
    // Apply search filter
    if (searchTerm) {
      if (conv.isGroupChat) {
        return conv.groupName?.toLowerCase().includes(searchTerm.toLowerCase());
      } else {
        return conv.participants.some(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.department?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    }
    
    return true;
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading user data...</p>
        </div>
      </div>
    );
  }

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
    <TooltipProvider>
      <div className="messages-theme h-screen bg-background text-foreground py-4 px-4 overflow-hidden" style={{ height: '100vh', maxHeight: '100vh' }}>
        <div className="mx-auto h-full w-full max-w-[1400px] flex md:flex-row flex-col gap-6 overflow-hidden" style={{ height: '100%', maxHeight: '100%' }}>
      {/* Chat List - Left Panel */}
        <Card className={`rounded-3xl border border-slate-200 flex flex-col shadow-xl shrink-0 h-full overflow-hidden ${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[360px]`}>
        {/* Header */}
          <div className="p-5 border-b border-slate-100 rounded-t-3xl bg-white shrink-0">
          <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Messages
            </h1>
                <p className="text-sm text-slate-500">All your chats in one place</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
              <Button 
                    variant="outline" 
                size="sm" 
                    className="rounded-full px-3 text-slate-600 hover:text-blue-600"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCreateGroup}>
                    <Users className="h-4 w-4 mr-2" />
                    Create Group
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard?section=network')}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Connection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
          
          {/* Search */}
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 rounded-full text-slate-900 placeholder-slate-500 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Buttons */}
          <div className="px-5 py-3 border-b border-slate-100 bg-white shrink-0">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'groups', label: 'Groups' }
              ].map(filter => (
            <Button 
                  key={filter.key}
                  variant="outline"
              size="sm" 
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-full px-4 ${
                    activeFilter === filter.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {filter.label}
            </Button>
              ))}
          </div>
        </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto bg-white min-h-0" style={{ borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem' }}>
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center px-6 py-12 text-slate-500">
                <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
                <p className="font-semibold text-slate-700">No conversations yet</p>
                <p className="text-sm">Start chatting to see messages here.</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
            const isGroup = conversation.isGroupChat;
            const otherParticipant = isGroup ? null : conversation.participants.find(p => p._id !== user._id);
                const isActive = selectedConversation?._id === conversation._id;
            
            return (
                  <button
                key={conversation._id}
                onClick={() => setSelectedConversation(conversation)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-slate-100 ${
                      isActive ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm' : 'hover:bg-slate-50'
                }`}
              >
                    <div className="relative">
                  {isGroup ? (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                          <Users className="h-6 w-6" />
                    </div>
                  ) : (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherParticipant?.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {otherParticipant?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {!isGroup && otherParticipant?.isOnline && (
                        <span className="absolute -bottom-1 -right-1 block h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {isGroup ? conversation.groupName : otherParticipant?.name}
                    </h3>
                      <span className="text-xs text-slate-500">
                        {conversation.lastMessageTime ? formatTime(conversation.lastMessageTime) : ''}
                      </span>
                    </div>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <p className="text-sm text-slate-500 truncate flex-1">
                            {(() => {
                              if (typeof conversation.lastMessage === 'string') {
                                return conversation.lastMessage;
                              }
                              const lastMsg = conversation.lastMessage;
                              if (!lastMsg) return 'No messages yet';
                              if (lastMsg.messageType && lastMsg.messageType !== 'text' && lastMsg.fileName) {
                                return `📎 ${lastMsg.fileName}`;
                              }
                              return lastMsg.content || 'No messages yet';
                            })()}
                          </p>
                          {/* Read receipt indicator for own messages */}
                          {(() => {
                            if (typeof conversation.lastMessage === 'object' && conversation.lastMessage !== null) {
                              const lastMsg = conversation.lastMessage as Message;
                              // Check if message is from current user
                              let messageSenderId: string | undefined;
                              if (lastMsg.senderId && typeof lastMsg.senderId === 'object' && lastMsg.senderId !== null) {
                                const senderIdObj = lastMsg.senderId as any;
                                messageSenderId = senderIdObj._id?.toString() || senderIdObj.toString();
                              } else if (lastMsg.senderId) {
                                messageSenderId = lastMsg.senderId.toString();
                              }
                              const isOwnMessage = messageSenderId === user?._id?.toString();
                              
                              if (isOwnMessage && lastMsg.status) {
                                if (lastMsg.status === 'sent') {
                                  return (
                                    <Check className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                  );
                                } else if (lastMsg.status === 'delivered') {
                                  return (
                                    <div className="flex items-center flex-shrink-0">
                                      <Check className="h-3 w-3 text-slate-400" />
                                      <Check className="h-3 w-3 text-slate-400 -ml-1" />
                                    </div>
                                  );
                                } else if (lastMsg.status === 'read') {
                                  return (
                                    <div className="flex items-center flex-shrink-0">
                          <Check className="h-3 w-3 text-blue-500" />
                          <Check className="h-3 w-3 text-blue-500 -ml-1" />
                        </div>
                                  );
                                }
                              }
                            }
                            return null;
                          })()}
                        </div>
                        {conversation.unreadCount > 0 && (
                          <Badge className="rounded-full bg-blue-600 text-white text-xs h-6 min-w-[1.5rem] flex items-center justify-center flex-shrink-0">
                            {conversation.unreadCount}
                          </Badge>
                      )}
                    </div>
                  </div>
                  </button>
            );
              })
            )}
        </div>
        </Card>

      {/* Chat Area - Right Panel */}
        <Card className={`flex-1 flex flex-col min-h-0 h-full shadow-xl border border-slate-200 rounded-3xl overflow-hidden ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="border-b bg-white/90 backdrop-blur px-4 md:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full text-slate-500 hover:text-blue-600 md:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="relative">
                  {selectedConversation.isGroupChat ? (
                    <div 
                      className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center cursor-pointer text-white"
                      onClick={() => setShowGroupMembers(true)}
                    >
                      <Users className="h-6 w-6" />
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const otherUser = selectedConversation.participants.find(p => p._id !== user._id);
                        if (otherUser) {
                          navigate(`/profile/${otherUser._id}`);
                        }
                      }}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedConversation.participants.find(p => p._id !== user._id)?.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                          {selectedConversation.participants.find(p => p._id !== user._id)?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  {!selectedConversation.isGroupChat && selectedConversation.participants.find(p => p._id !== user._id)?.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
                  )}
                </div>
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    if (selectedConversation.isGroupChat) {
                      setShowGroupMembers(true);
                    } else {
                      const otherUser = selectedConversation.participants.find(p => p._id !== user._id);
                      if (otherUser) {
                        navigate(`/profile/${otherUser._id}`);
                      }
                    }
                  }}
                >
                  <h2 className="font-semibold text-slate-900">
                    {selectedConversation.isGroupChat 
                      ? selectedConversation.groupName 
                      : selectedConversation.participants.find(p => p._id !== user._id)?.name || 'Unknown'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedConversation.isGroupChat 
                      ? `${selectedConversation.participants.length} members`
                      : (selectedConversation.participants.find(p => p._id !== user._id)?.isOnline ? 'Online now' : 'Recently active')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isSearchingMessages ? (
                  <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5">
                    <Search className="h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search messages..."
                      value={messageSearchTerm}
                      onChange={(e) => {
                        setMessageSearchTerm(e.target.value);
                        const search = e.target.value.toLowerCase().trim();
                        if (search) {
                          const filtered = messages.filter(msg => 
                            msg.content?.toLowerCase().includes(search) ||
                            msg.senderName?.toLowerCase().includes(search) ||
                            msg.fileName?.toLowerCase().includes(search)
                          );
                          setFilteredMessages(filtered);
                        } else {
                          setFilteredMessages([]);
                        }
                      }}
                      className="h-7 w-48 bg-transparent border-0 text-sm"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => {
                        setIsSearchingMessages(false);
                        setMessageSearchTerm('');
                        setFilteredMessages([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full"
                    onClick={() => setIsSearchingMessages(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsSelectMode(!isSelectMode)}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      {isSelectMode ? 'Exit Select' : 'Select Messages'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleClearChat}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Clear Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCloseChat}>
                      <X className="h-4 w-4 mr-2" />
                      Close Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Selection Toolbar */}
            {isSelectMode && (
              <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-blue-700">
                    {selectedMessages.length} message(s) selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllMessages}
                    className="text-blue-600 hover:text-blue-700 rounded-full"
                  >
                    Select All
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-slate-600 hover:text-slate-700 rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedMessages}
                    disabled={selectedMessages.length === 0}
                    className="bg-red-500 hover:bg-red-600 rounded-full"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedMessages.length})
                  </Button>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div 
              ref={scrollAreaRef} 
              className="flex-1 bg-[#f7f9fc] overflow-y-auto px-4 md:px-6 py-4 min-h-0"
            >
              <div className="space-y-4">
                {loading || authLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {isSearchingMessages && messageSearchTerm && (
                      <div className="mb-4 p-2 bg-blue-100 rounded-lg text-sm text-blue-700">
                        Found {(isSearchingMessages && messageSearchTerm ? filteredMessages : messages).length} result(s) for "{messageSearchTerm}"
                      </div>
                    )}
                    {user && (isSearchingMessages && messageSearchTerm ? filteredMessages : messages).length > 0 ? (
                      (isSearchingMessages && messageSearchTerm ? filteredMessages : messages).map(renderMessage)
                    ) : (
                      <div className="flex items-center justify-center h-full min-h-[400px]">
                        <div className="text-center space-y-3 px-6">
                          <MessageSquare className="h-16 w-16 text-slate-300 mx-auto" />
                          <h3 className="text-lg font-semibold text-slate-700">No messages have started yet</h3>
                          <p className="text-sm text-slate-500">Send a message to begin the conversation.</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Typing indicator */}
                    {typingUsers.size > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-white rounded-lg px-3 py-2 shadow-sm border border-slate-200">
                          <div className="flex items-center space-x-1">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-sm text-slate-500 ml-2">
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
              </div>
            </div>

            {/* Message Input - Modern styling */}
            <div className="bg-white border-t border-slate-200 p-4 shrink-0" style={{ borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem' }}>
              {/* Selected file display */}
              {selectedFile && (
                <div className="flex items-center justify-between p-3 mb-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-900">{selectedFile.name}</span>
                    <span className="text-xs text-slate-500">
                      ({formatFileSize(selectedFile.size)})
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeSelectedFile} className="text-slate-500 hover:text-slate-700 rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg shadow-lg">
                  <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="p-2 hover:bg-slate-100 rounded text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                
                <div className="flex-1 flex items-center bg-slate-100 border border-slate-200 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 text-slate-600 hover:text-blue-600 rounded-full"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 border-0 bg-transparent focus:ring-0 text-sm placeholder-slate-500 text-slate-900"
                  />
                </div>
                
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim() && !selectedFile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </Button>
                
                 {/* Hidden file input - supports all common file formats */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                   accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.mp4,.webm,.ogg,.mov,.avi,.wmv,.mp3,.wav,.ogg,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.html,.xml,.json,.log,.zip"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-white overflow-hidden" style={{ borderRadius: '1.5rem' }}>
            <div className="text-center space-y-3 px-6">
              <MessageSquare className="h-16 w-16 text-slate-200 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-900">Select a conversation</h3>
              <p className="text-slate-500">Choose someone from the list to start chatting.</p>
            </div>
          </div>
        )}
        </Card>
      </div>

      {/* Group Creation/Add Members Modal */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {selectedConversation?.isGroupChat ? 'Add Members to Group' : 'Create New Group'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 overflow-y-auto max-h-[60vh]">
            {/* Group Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName" className="text-sm font-medium text-slate-700">
                  Group Name *
                </Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="mt-1"
                  disabled={selectedConversation?.isGroupChat}
                />
              </div>
              
              <div>
                <Label htmlFor="groupDescription" className="text-sm font-medium text-slate-700">
                  Description (Optional)
                </Label>
                <Textarea
                  id="groupDescription"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter group description"
                  className="mt-1"
                  rows={3}
                  disabled={selectedConversation?.isGroupChat}
                />
              </div>
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Selected Members ({selectedMembers.length})
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">
                          {member.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{typeof member.name === 'string' ? member.name : 'Unknown'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member._id)}
                        className="h-4 w-4 p-0 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Search with Filters */}
            <div>
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Add Members *
              </Label>
              <div className="mt-2 space-y-3">
                {/* Filters Row */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">User Type</Label>
                    <Select value={groupTypeFilter} onValueChange={setGroupTypeFilter}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="alumni">Alumni</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Batch</Label>
                    <Select value={groupBatchFilter} onValueChange={setGroupBatchFilter}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Batches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Department</Label>
                    <Select value={groupDepartmentFilter} onValueChange={setGroupDepartmentFilter}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="CSE">CSE</SelectItem>
                        <SelectItem value="ECE">ECE</SelectItem>
                        <SelectItem value="EEE">EEE</SelectItem>
                        <SelectItem value="ME">ME</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search users to add..."
                    value={userSearchTerm}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* User List */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {availableUsers.map((user) => {
                        const isSelected = selectedMembers.some(member => member._id === user._id);
                        return (
                          <div
                            key={user._id}
                            onClick={() => toggleMemberSelection(user)}
                            className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-blue-100 border border-blue-200' 
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMemberSelection(user)}
                              className="rounded"
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="text-sm">
                                {user.name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {typeof user.name === 'string' ? user.name : 'Unknown User'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {typeof user.email === 'string' ? user.email : 'No email'}
                              </p>
                            </div>
                            <div className="text-xs text-slate-400">
                              {typeof user.type === 'string' ? user.type : 'Unknown'}
                            </div>
                          </div>
                        );
                      })}
                      {availableUsers.length === 0 && !loadingUsers && (
                        <div className="text-center py-4 text-slate-500 text-sm">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => setShowGroupModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGroupCreation}
              disabled={!groupName.trim() || selectedMembers.length < 2}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Group ({selectedMembers.length} members)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Members Modal */}
      <Dialog open={showGroupMembers} onOpenChange={setShowGroupMembers}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {selectedConversation?.groupName} Members
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Group Admin Section */}
            {selectedConversation?.groupAdmin && (() => {
              const adminId = typeof selectedConversation.groupAdmin === 'object' && selectedConversation.groupAdmin !== null
                ? (selectedConversation.groupAdmin as any)._id
                : selectedConversation.groupAdmin;
              const admin = selectedConversation.participants.find(p => p._id === adminId || p._id?.toString() === adminId?.toString());
              
              if (!admin) return null;
              
              return (
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <Label className="text-xs font-semibold text-slate-600 mb-2 block uppercase tracking-wide">
                    Group Admin
                  </Label>
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <Avatar className="h-12 w-12 ring-2 ring-blue-400">
                      <AvatarImage src={admin.avatar} />
                      <AvatarFallback className="bg-blue-500 text-white font-semibold">
                        {typeof admin.name === 'string' ? admin.name.charAt(0) : 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {typeof admin.name === 'string' ? admin.name : 'Unknown Admin'}
                        </p>
                        <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">
                          Admin
                        </Badge>
                        {admin.isOnline && (
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-1">
                        {typeof admin.email === 'string' ? admin.email : 'No email'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {typeof admin.type === 'string' ? admin.type : 'Unknown'}
                        </Badge>
                        {admin.department && (
                          <Badge variant="outline" className="text-xs">
                            {typeof admin.department === 'string' ? admin.department : 'Unknown Dept'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowGroupMembers(false);
                        navigate(`/profile/${admin._id}`);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              );
            })()}
            
            {/* Regular Members Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold text-slate-600 block uppercase tracking-wide">
                  Members ({selectedConversation?.participants.filter(p => {
                    const adminId = typeof selectedConversation.groupAdmin === 'object' && selectedConversation.groupAdmin !== null
                      ? (selectedConversation.groupAdmin as any)._id
                      : selectedConversation.groupAdmin;
                    return p._id !== adminId && p._id?.toString() !== adminId?.toString();
                  }).length || 0})
                </Label>
                {/* Add Member Button - Only for admin */}
                {(() => {
                  const adminId = typeof selectedConversation?.groupAdmin === 'object' && selectedConversation?.groupAdmin !== null
                    ? (selectedConversation.groupAdmin as any)._id
                    : selectedConversation?.groupAdmin;
                  const isAdmin = adminId && adminId.toString() === user?._id?.toString();
                  
                  if (isAdmin && selectedConversation) {
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setShowAddMemberModal(true);
                          setAddMemberSelectedUsers([]);
                          setAddMemberSearchTerm('');
                          setAddMemberTypeFilter('all');
                          setAddMemberBatchFilter('all');
                          setAddMemberDepartmentFilter('all');
                          await loadAddMemberUsers('');
                        }}
                        className="text-xs h-7"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Add Members
                      </Button>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="space-y-2">
                {selectedConversation?.participants
                  .filter(member => {
                    // Exclude admin from regular members list
                    const adminId = typeof selectedConversation.groupAdmin === 'object' && selectedConversation.groupAdmin !== null
                      ? (selectedConversation.groupAdmin as any)._id
                      : selectedConversation.groupAdmin;
                    return member._id !== adminId && member._id?.toString() !== adminId?.toString();
                  })
                  .map((member) => (
              <div key={member._id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {typeof member.name === 'string' ? member.name.charAt(0) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {typeof member.name === 'string' ? member.name : 'Unknown User'}
                    </p>
                    {member.isOnline && (
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {typeof member.email === 'string' ? member.email : 'No email'}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {typeof member.type === 'string' ? member.type : 'Unknown'}
                    </Badge>
                    {member.department && (
                      <Badge variant="outline" className="text-xs">
                        {typeof member.department === 'string' ? member.department : 'Unknown Dept'}
                      </Badge>
                    )}
                  </div>
                </div>
                      <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowGroupMembers(false);
                    navigate(`/profile/${member._id}`);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  View Profile
                </Button>
                        {/* Remove member button - only for admin */}
                        {(() => {
                          const adminId = typeof selectedConversation.groupAdmin === 'object' && selectedConversation.groupAdmin !== null
                            ? (selectedConversation.groupAdmin as any)._id
                            : selectedConversation.groupAdmin;
                          const isAdmin = adminId && adminId.toString() === user?._id?.toString();
                          const isSelf = member._id === user?._id;
                          
                          if (isAdmin || isSelf) {
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMemberToRemove(member);
                                  setShowRemoveMemberModal(true);
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            );
                          }
                          return null;
                        })()}
                        {/* Make Admin button - only for main admin */}
                        {(() => {
                          const adminId = typeof selectedConversation.groupAdmin === 'object' && selectedConversation.groupAdmin !== null
                            ? (selectedConversation.groupAdmin as any)._id
                            : selectedConversation.groupAdmin;
                          const isMainAdmin = adminId && adminId.toString() === user?._id?.toString();
                          const isMemberAdmin = selectedConversation?.groupAdmins?.some(admin => {
                            const adminId = typeof admin === 'object' && admin !== null ? (admin as any)._id : admin;
                            return adminId?.toString() === member._id?.toString();
                          });
                          
                          if (isMainAdmin && !isMemberAdmin && member._id !== user?._id) {
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (!selectedConversation) return;
                                  try {
                                    const response = await api.post(`/api/conversations/${selectedConversation._id}/admins`, {
                                      adminId: member._id
                                    });
                                    if (response.status === 200) {
                                      toast({
                                        title: "Success",
                                        description: `${member.name} is now an admin`,
                                      });
                                      const convResponse = await api.get(`/api/conversations/${selectedConversation._id}`);
                                      setSelectedConversation(convResponse.data.conversation);
                                    }
                                  } catch (error: any) {
                                    console.error('Error adding admin:', error);
                                    toast({
                                      title: "Error",
                                      description: error.response?.data?.error || "Failed to add admin",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                title="Make Admin"
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            );
                          }
                          return null;
                        })()}
                      </div>
              </div>
            ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            {/* Delete Group Button - Only visible to admin */}
            {selectedConversation?.groupAdmin && (() => {
              const adminId = typeof selectedConversation.groupAdmin === 'object' && selectedConversation.groupAdmin !== null
                ? (selectedConversation.groupAdmin as any)._id
                : selectedConversation.groupAdmin;
              const isAdmin = adminId && adminId.toString() === user?._id?.toString();
              
              if (!isAdmin) return null;
              
              return (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteGroupDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Group
                </Button>
              );
            })()}
            
            <div className="flex justify-end space-x-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => setShowGroupMembers(false)}
            >
              Close
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal - Separate UI from Group Creation */}
      <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Members to {selectedConversation?.groupName || 'Group'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Filters Section */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-3">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Members
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 mb-1.5 block">User Type</Label>
                  <Select value={addMemberTypeFilter} onValueChange={setAddMemberTypeFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="alumni">Alumni</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                    </SelectContent>
                  </Select>
    </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1.5 block">Batch Year</Label>
                  <Select value={addMemberBatchFilter} onValueChange={setAddMemberBatchFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="All Batches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1.5 block">Department</Label>
                  <Select value={addMemberDepartmentFilter} onValueChange={setAddMemberDepartmentFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="CSE">CSE</SelectItem>
                      <SelectItem value="ECE">ECE</SelectItem>
                      <SelectItem value="EEE">EEE</SelectItem>
                      <SelectItem value="ME">ME</SelectItem>
                      <SelectItem value="CE">CE</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={addMemberSearchTerm}
                  onChange={(e) => {
                    setAddMemberSearchTerm(e.target.value);
                    loadAddMemberUsers(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Selected Members Preview */}
            {addMemberSelectedUsers.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <Label className="text-sm font-semibold text-blue-900 mb-2 block">
                  Selected ({addMemberSelectedUsers.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {addMemberSelectedUsers.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm border border-blue-300"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs bg-blue-200">
                          {member.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{typeof member.name === 'string' ? member.name : 'Unknown'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAddMemberSelectedUsers(prev => prev.filter(u => u._id !== member._id));
                        }}
                        className="h-4 w-4 p-0 text-blue-700 hover:text-blue-900 hover:bg-blue-200 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Users List */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                Available Members
              </Label>
              <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                {addMemberLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {addMemberAvailableUsers
                      .filter(user => {
                        // Exclude existing participants
                        if (!selectedConversation) return true;
                        return !selectedConversation.participants.some(p => 
                          (typeof p === 'object' ? p._id : p) === user._id
                        );
                      })
                      .map((user) => {
                        const isSelected = addMemberSelectedUsers.some(member => member._id === user._id);
                        return (
                          <div
                            key={user._id}
                            onClick={() => {
                              if (isSelected) {
                                setAddMemberSelectedUsers(prev => prev.filter(u => u._id !== user._id));
                              } else {
                                setAddMemberSelectedUsers(prev => [...prev, user]);
                              }
                            }}
                            className={`flex items-center space-x-3 p-3 cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded w-4 h-4 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                                {user.name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {typeof user.name === 'string' ? user.name : 'Unknown User'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {typeof user.email === 'string' ? user.email : 'No email'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {user.type && (
                                  <Badge variant="secondary" className="text-xs">
                                    {user.type}
                                  </Badge>
                                )}
                                {user.department && (
                                  <Badge variant="outline" className="text-xs">
                                    {user.department}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        );
                      })}
                    {addMemberAvailableUsers.filter(user => {
                      if (!selectedConversation) return true;
                      return !selectedConversation.participants.some(p => 
                        (typeof p === 'object' ? p._id : p) === user._id
                      );
                    }).length === 0 && !addMemberLoadingUsers && (
                      <div className="text-center py-8 text-slate-500">
                        <Users className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">No available users found</p>
                        <p className="text-xs text-slate-400 mt-1">All users may already be members</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              {addMemberSelectedUsers.length > 0 && (
                <span className="font-medium text-blue-600">
                  {addMemberSelectedUsers.length} member{addMemberSelectedUsers.length !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddMemberModal(false);
                  setAddMemberSelectedUsers([]);
                  setAddMemberSearchTerm('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedConversation || addMemberSelectedUsers.length === 0) return;
                  
                  try {
                    const response = await api.post(`/api/conversations/${selectedConversation._id}/members`, {
                      memberIds: addMemberSelectedUsers.map(member => member._id)
                    });
                    
                    if (response.status === 200) {
                      toast({
                        title: "Members Added",
                        description: `${addMemberSelectedUsers.length} member(s) added successfully.`,
                      });
                      setShowAddMemberModal(false);
                      setAddMemberSelectedUsers([]);
                      setAddMemberSearchTerm('');
                      // Reload conversation
                      const convResponse = await api.get(`/api/conversations/${selectedConversation._id}`);
                      setSelectedConversation(convResponse.data.conversation);
                      loadConversations();
                    }
                  } catch (error: any) {
                    console.error('Error adding members:', error);
                    toast({
                      title: "Error",
                      description: error.response?.data?.error || "Failed to add members",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={addMemberSelectedUsers.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add {addMemberSelectedUsers.length} Member{addMemberSelectedUsers.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={showRemoveMemberModal} onOpenChange={setShowRemoveMemberModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && (
                <>
                  {memberToRemove._id === user?._id
                    ? 'Are you sure you want to leave this group? You will no longer receive messages from this group.'
                    : `Are you sure you want to remove ${memberToRemove.name} from the group? They will no longer be able to send or receive messages in this group.`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedConversation || !memberToRemove) return;
                
                try {
                  const response = await api.delete(`/api/conversations/${selectedConversation._id}/members/${memberToRemove._id}`);
                  if (response.status === 200) {
                    toast({
                      title: "Success",
                      description: memberToRemove._id === user?._id ? "You left the group" : "Member removed successfully",
                    });
                    loadConversations();
                    if (memberToRemove._id === user?._id) {
                      setSelectedConversation(null);
                      setMessages([]);
                      setShowGroupMembers(false);
                    } else {
                      // Reload conversation to get updated participants
                      const convResponse = await api.get(`/api/conversations/${selectedConversation._id}`);
                      setSelectedConversation(convResponse.data.conversation);
                    }
                    setShowRemoveMemberModal(false);
                    setMemberToRemove(null);
                  }
                } catch (error: any) {
                  console.error('Error removing member:', error);
                  toast({
                    title: "Error",
                    description: error.response?.data?.error || "Failed to remove member",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {memberToRemove?._id === user?._id ? 'Leave Group' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={showDeleteGroupDialog} onOpenChange={(open) => !isDeletingGroup && setShowDeleteGroupDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedConversation?.groupName ? `"${selectedConversation.groupName}"` : 'this group'} including all messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingGroup}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteGroup}
              disabled={isDeletingGroup}
            >
              {isDeletingGroup ? 'Deleting...' : 'Delete Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deletion Options Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Messages</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Choose how you want to delete {selectedMessages.length} message(s):
            </p>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleDeleteMessages('forMe')}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Delete for Me</span>
                  <span className="text-xs text-slate-500">Remove only from your chat</span>
                </div>
              </Button>

              {(() => {
                // Check if all selected messages are from current user
                const allOwnMessages = selectedMessages.every(msgId => {
                  const msg = messages.find(m => m._id === msgId);
                  if (!msg) return false;
                  let senderId: string | undefined;
                  if (typeof msg.senderId === 'object' && msg.senderId !== null) {
                    senderId = (msg.senderId as any)._id?.toString();
                  } else {
                    senderId = msg.senderId?.toString();
                  }
                  return senderId === user?._id?.toString();
                });

                // Check if user is group admin
                const isGroupChat = selectedConversation?.isGroupChat;
                let isGroupAdmin = false;
                if (isGroupChat && selectedConversation?.groupAdmin && user?._id) {
                  const groupAdminId = typeof selectedConversation.groupAdmin === 'object' && selectedConversation.groupAdmin !== null
                    ? (selectedConversation.groupAdmin as any)._id?.toString()
                    : selectedConversation.groupAdmin.toString();
                  isGroupAdmin = groupAdminId === user?._id.toString();
                }

                if (allOwnMessages || isGroupAdmin) {
                  return (
                    <>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleDeleteMessages('forEveryone')}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">Delete for Everyone</span>
                          <span className="text-xs text-slate-500">Remove from all devices (within 15 min)</span>
                        </div>
                      </Button>

                      {isGroupAdmin && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleAdminDelete(selectedMessages)}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-semibold">Admin Delete</span>
                            <span className="text-xs text-slate-500">Delete as group admin (no time limit)</span>
                          </div>
                        </Button>
                      )}
                    </>
                  );
                }
                return null;
              })()}

              <Button
                variant="outline"
                className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleDeleteMessages('hard')}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Permanent Delete</span>
                  <span className="text-xs text-slate-500">Permanently remove (cannot be undone)</span>
                </div>
              </Button>
            </div>

            {/* Additional options */}
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-blue-600"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setShowAutoDeleteDialog(true);
                }}
              >
                <Clock className="h-4 w-4 mr-2" />
                Set Auto-Delete (Disappearing Messages)
              </Button>

              {selectedMessages.some(msgId => {
                const msg = messages.find(m => m._id === msgId);
                return msg && (msg.messageType !== 'text' || msg.mediaUrl);
              }) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-blue-600 mt-2"
                  onClick={() => {
                    const mediaMessageIds = selectedMessages.filter(msgId => {
                      const msg = messages.find(m => m._id === msgId);
                      return msg && (msg.messageType !== 'text' || msg.mediaUrl);
                    });
                    handleMediaDelete(mediaMessageIds, false);
                    setShowDeleteDialog(false);
                  }}
                >
                  <File className="h-4 w-4 mr-2" />
                  Delete Media Only
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Delete Dialog */}
      <Dialog open={showAutoDeleteDialog} onOpenChange={setShowAutoDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Auto-Delete (Disappearing Messages)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Messages will be automatically deleted after the selected duration:
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {['24h', '7d', '90d'].map((duration) => (
                <Button
                  key={duration}
                  variant="outline"
                  onClick={() => handleSetAutoDelete(selectedMessages, duration)}
                >
                  {duration === '24h' ? '24 Hours' : duration === '7d' ? '7 Days' : '90 Days'}
                </Button>
              ))}
            </div>

            <div className="pt-2">
              <Label>Custom Duration (hours)</Label>
              <Input
                type="number"
                placeholder="Enter hours"
                min="1"
                className="mt-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    const hours = parseInt(input.value);
                    if (hours > 0) {
                      handleSetAutoDelete(selectedMessages, hours.toString());
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAutoDeleteDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default EnhancedMessagesPage;
