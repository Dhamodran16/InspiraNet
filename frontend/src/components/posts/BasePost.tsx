import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Edit, Trash2 } from 'lucide-react';
import { Post } from '@/services/postsApi';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';

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
  showComments: boolean;
  onToggleComments: () => void;
  commentsCount: number;
  isLiked: boolean;
  showDeleteButton?: boolean;
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
  showComments,
  onToggleComments,
  commentsCount,
  isLiked: initialIsLiked,
  showDeleteButton = false,
  postTypeLabel,
  postTypeIcon,
  children
}: BasePostProps) {
  const [commentText, setCommentText] = useState('');
  
  // Local like state management - rely on server state
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isDisabled, setIsDisabled] = useState(false);

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

  return (
    <Card className="post-card border border-gray-200 dark:border-gray-700 shadow-sm max-w-2xl mx-auto">
      {/* Post Header */}
      <div className="post-header p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{post.author?.department || 'Unknown Department'}</span>
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
          
          {/* Post Actions Menu */}
          <div className="flex items-center space-x-2">
            {showDeleteButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(post._id)}
                className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="post-content p-4">
        {children}
      </div>

      {/* Post Actions */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="space-y-3">
              {post.comments?.slice(0, 3).map((comment) => (
                <div key={comment._id} className="flex space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.author?.avatar} />
                    <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium">
                      {comment.author?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <p className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {comment.author?.name || 'Unknown User'}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 ml-2">
                          {comment.content}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {post.comments && post.comments.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 dark:text-blue-400 text-sm"
                >
                  View all {post.comments.length} comments
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
                <div className="flex-1">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && commentText.trim()) {
                        onComment?.(post._id, commentText.trim());
                        setCommentText('');
                      }
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}