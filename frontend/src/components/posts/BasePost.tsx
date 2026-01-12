import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Edit, Trash2, MoreVertical, X, Share2, Send } from 'lucide-react';
import { Post } from '@/services/postsApi';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';

// Comment Menu Component
const CommentMenu = ({ commentId, onDelete }: { commentId: string; onDelete: (commentId: string) => void }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="relative ml-auto" ref={menuRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        onClick={() => setShowMenu(!showMenu)}
      >
        <MoreVertical className="h-3 w-3" />
      </Button>
      
      {showMenu && (
        <div className="absolute right-0 top-6 w-40 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-20">
          <div className="p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete(commentId);
                setShowMenu(false);
              }}
              className="w-full justify-start text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-3 w-3 mr-2" /> Delete comment
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => setShowMenu(false)}
            >
              <X className="h-3 w-3 mr-2" /> Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

type User = {
  _id: string;
  name: string;
  avatar?: string;
  type: string;
  department?: string;
  batch?: string;
};

interface BasePostProps {
  post: Post;
  user: User | null;
  onLike: (postId: string) => void;
  onComment: (postId: string, commentContent: string) => void;
  onEdit?: (postId: string) => void;
  onDelete: (postId: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onShare?: (postId: string) => void;
  showComments: boolean;
  onToggleComments: () => void;
  commentsCount: number;
  isLiked: boolean;
  showDeleteButton?: boolean;
  showShareButton?: boolean;
  postTypeLabel: string;
  postTypeIcon: React.ReactNode;
  children?: React.ReactNode;
}

export default function BasePost({
  post,
  user,
  onLike,
  onComment,
  onEdit,
  onDelete,
  onDeleteComment,
  onShare,
  showComments,
  onToggleComments,
  commentsCount,
  isLiked: initialIsLiked,
  showDeleteButton = false,
  showShareButton = true,
  postTypeLabel,
  postTypeIcon,
  children
}: BasePostProps) {
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Local like state management - rely on server state
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isDisabled, setIsDisabled] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPostMenu(false);
      }
    };

    if (showPostMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPostMenu]);

  // Update local state when props change (server state)
  useEffect(() => {
    console.log('🔄 BasePost like state update:', {
      postId: post._id,
      initialIsLiked,
      currentIsLiked: isLiked,
      likeCount: post.likes?.length || 0
    });
    setIsLiked(initialIsLiked);
  }, [initialIsLiked, post._id, post.likes?.length]);

  const handleLike = async () => {
    if (isDisabled) return;
    
    setIsDisabled(true);
    
    try {
      console.log('🔄 Like button clicked for post:', post._id, 'Current state:', isLiked);
      
      // Call parent handler (which will update server state)
      await onLike(post._id);
      
      // Update local state immediately for better UX
      setIsLiked(!isLiked);
      
      console.log('✅ Like action completed, new state:', !isLiked);
    } catch (error) {
      console.error('❌ Error in handleLike:', error);
      // Revert state if there was an error
      setIsLiked(isLiked);
    } finally {
      // Prevent spam clicks for 500ms
      setTimeout(() => setIsDisabled(false), 500);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return;
    
    // Find the comment to check if user is the author
    const comment = post.comments?.find(c => c._id === commentId);
    if (!comment || comment.author?._id?.toString() !== user?._id?.toString()) {
      console.warn('User is not the author of this comment, deletion not allowed');
      return;
    }
    
    try {
      await onDeleteComment(post._id, commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Function to deduplicate comments based on comment ID
  const getUniqueComments = (comments: any[]) => {
    if (!comments || !Array.isArray(comments)) return [];
    
    const seen = new Set();
    return comments.filter(comment => {
      if (seen.has(comment._id)) {
        console.warn(`Duplicate comment detected: ${comment._id}`);
        return false;
      }
      seen.add(comment._id);
      return true;
    });
  };

  return (
    <Card className="post-card border border-gray-200 dark:border-gray-700 shadow-sm mx-auto" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Post Header */}
      <div className="post-header p-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author?.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {post.author?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {post.author?.name || 'Unknown User'}
                </p>
                {post.author?.type && (
                  <Badge variant="secondary" className="text-xs">
                    {post.author.type}
                  </Badge>
                )}
                {/* Post Type Badge - Enhanced Design */}
                <Badge 
                  variant="outline" 
                  className={`text-xs font-semibold px-2.5 py-1 border-2 flex items-center gap-1.5 shadow-sm ${
                    post.postType === 'poll' 
                      ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-400 dark:border-orange-600 text-orange-700 dark:text-orange-300'
                      : post.postType === 'job'
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-400 dark:border-green-600 text-green-700 dark:text-green-300'
                      : post.postType === 'event'
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                      : 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                  }`}
                >
                  <span className="text-sm leading-none">{postTypeIcon}</span>
                  <span className="font-bold">{postTypeLabel}</span>
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {post.author?.department || 
                   (post.author as any)?.studentInfo?.department || 
                   (post.author as any)?.facultyInfo?.department || 
                   'Unknown Department'}
                </span>
                {post.author?.batch && (
                  <>
                    <span>•</span>
                    <span>{post.author.batch}</span>
                  </>
                )}
                <span>•</span>
                <span>{formatTimeAgo(post.createdAt)}</span>
              </div>
            </div>
          </div>
          
          {/* Post Actions Menu - Three dot menu */}
          <div className="flex items-center space-x-2">
            <div className="relative" ref={menuRef}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-500 dark:text-gray-400"
                onClick={() => setShowPostMenu(!showPostMenu)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              {showPostMenu && (
                <div className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-10">
                  <div className="p-1">
                    {showShareButton && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onShare?.(post._id);
                          setShowPostMenu(false);
                        }}
                        className="w-full justify-start text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Share2 className="h-4 w-4 mr-2" /> Share
                      </Button>
                    )}
                    {showDeleteButton && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onDelete?.(post._id);
                          setShowPostMenu(false);
                        }}
                        className="w-full justify-start text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setShowPostMenu(false)}
                    >
                      <X className="h-4 w-4 mr-2" /> Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Content - Images First, then other content */}
      <div className="post-content flex-1">
        {/* Display tags if they exist */}
        {post.tags && post.tags.length > 0 && (
          <div className="px-3 pt-3 pb-2">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: string, index: number) => {
                // Remove existing # if present, then add it
                const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
                return (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{cleanTag}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        {children}
      </div>

      {/* Post Actions */}
      <div className="px-3 pb-2 flex-shrink-0 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`flex items-center space-x-2 ${
                isLiked ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-600 dark:text-gray-400'
              }`}
              disabled={isDisabled}
              title={`${isLiked ? 'Unlike' : 'Like'} this post`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">
                {post.likes?.length || post.likeIds?.length || 0}
              </span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleComments}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">{commentsCount || 0}</span>
            </Button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="space-y-1.5">
              {(() => {
                const uniqueComments = getUniqueComments(post.comments);
                const commentsToShow = showAllComments ? uniqueComments : uniqueComments.slice(0, 3);
                
                return commentsToShow.map((comment, index) => {
                  // Ensure unique key by combining comment ID with index
                  const uniqueKey = `${comment._id}-${index}`;
                  return (
                    <div key={uniqueKey} className="flex space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={comment.author?.avatar} />
                        <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium">
                          {comment.author?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-2.5 py-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {comment.author?.name || 'Unknown User'}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300 ml-2">
                                {comment.content}
                              </span>
                            </p>
                            {comment.author?._id?.toString() === user?._id?.toString() && (
                              <CommentMenu commentId={comment._id} onDelete={handleDeleteComment} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              
              {getUniqueComments(post.comments).length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllComments(!showAllComments)}
                  className="text-blue-600 dark:text-blue-400 text-sm"
                >
                  {showAllComments 
                    ? `Hide comments` 
                    : `View all ${getUniqueComments(post.comments).length} comments`
                  }
                </Button>
              )}
              
              {/* Add Comment */}
              <div className="flex space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex items-center space-x-2">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                        e.preventDefault();
                        onComment?.(post._id, commentText.trim());
                        setCommentText('');
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (commentText.trim()) {
                        onComment?.(post._id, commentText.trim());
                        setCommentText('');
                      }
                    }}
                    disabled={!commentText.trim()}
                    className="shrink-0"
                    title="Send comment"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}