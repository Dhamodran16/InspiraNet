import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import postsApi from '@/services/postsApi';
import { Post } from '@/services/postsApi';
import PostRenderer from './PostRenderer';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { socketService } from '@/services/socketService';

const PostFeed: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [originalPosts, setOriginalPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const observer = useRef<IntersectionObserver>();
  const lastPostRef = useRef<HTMLDivElement>(null);

  // Load posts when user is authenticated
  const loadPosts = useCallback(async (page = 1, append = false) => {
    if (!user || !user._id) {
      console.log('PostFeed: No authenticated user, skipping post loading');
      return;
    }
      
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('PostFeed: Loading posts for page:', page);
      const response = await postsApi.getPosts(page);
      
      if (response && response.posts) {
        // Temporarily use the posts directly to fix the type issue
        if (append) {
          // Deduplicate posts by _id to prevent duplicate key warnings
          const existingIds = new Set(posts.map(p => p._id));
          const newPosts = response.posts.filter(post => !existingIds.has(post._id));
          
          setPosts(prev => [...prev, ...newPosts]);
          setOriginalPosts(prev => [...prev, ...newPosts]);
        } else {
          setPosts(response.posts);
          setOriginalPosts(response.posts);
        }
        
        setCurrentPage(page);
        setHasMore(page < response.totalPages);
        console.log('PostFeed: Successfully loaded posts:', response.posts.length);
      } else {
        console.warn('PostFeed: Invalid response format:', response);
        setPosts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('PostFeed: Error loading posts:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('No authentication token found')) {
          setError('Authentication required. Please log in again.');
          toast({
            title: "Authentication Error",
            description: "Please log in again to view posts.",
            variant: "destructive",
          });
        } else {
          setError(error.message || 'Failed to load posts');
        }
      } else {
        setError('An unexpected error occurred');
      }
      
      setPosts([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user && user._id) {
      console.log('PostFeed useEffect - loadPosts called with authenticated user:', user._id);
      loadPosts(1, false);
    } else {
      console.log('PostFeed useEffect - User not authenticated yet:', user);
    }
  }, [user, loadPosts]);

  // Real-time socket listeners for post updates
  useEffect(() => {
    if (!user?._id) return;

    console.log('PostFeed: Setting up socket listeners for user:', user._id);

    // Listen for new comments
    const handlePostCommentAdded = (data: any) => {
      console.log('PostFeed: Received new comment:', data);
      setPosts(prev => prev.map(post => {
        if (post._id === data.postId) {
          return {
            ...post,
            comments: [...post.comments, data.comment]
          };
        }
        return post;
      }));
    };

    // Listen for new notifications
    const handleNewNotification = (notification: any) => {
      console.log('PostFeed: Received new notification:', notification);
      if (notification.type === 'post_like' || notification.type === 'post_comment') {
        toast({
          title: notification.title,
          description: notification.message,
        });
      }
    };

    // Add socket listeners (removed like updates to prevent conflicts)
    socketService.onPostCommentAdded(handlePostCommentAdded);
    socketService.onNewNotification(handleNewNotification);

    console.log('PostFeed: Socket listeners set up successfully');

    // Cleanup
    return () => {
      console.log('PostFeed: Cleaning up socket listeners');
      socketService.offPostCommentAdded();
      socketService.offNewNotification();
    };
  }, [user?._id, toast]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (isLoading || !hasMore) return;

    const currentObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadPosts(currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.current = currentObserver;

    if (lastPostRef.current) {
      currentObserver.observe(lastPostRef.current);
    }

    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
      }
    };
  }, [isLoading, hasMore, currentPage, loadPosts]);

  // Refresh posts
  const handleRefresh = useCallback(async () => {
    if (!user || !user._id) return;
    
    setRefreshing(true);
    try {
      await loadPosts(1, false);
      toast({
        title: "Posts Refreshed",
        description: "Latest posts have been loaded.",
      });
    } catch (error) {
      console.error('Error refreshing posts:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, loadPosts]);

  // Handle post deletion
  const handlePostDeleted = useCallback(async (postId: string) => {
    try {
      // Call the API to delete from MongoDB
      await postsApi.deletePost(postId);
      
      // Update frontend state
      setPosts(prev => prev.filter(post => post._id !== postId));
      
      toast({
        title: "Post Deleted",
        description: "Post has been removed successfully from the database.",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    }
  }, []);

  // Handle post updates
  const handlePostUpdated = useCallback((updatedPost: Post) => {
    setPosts(prev => prev.map(post => 
      post._id === updatedPost._id ? updatedPost : post
    ));
      toast({
      title: "Post Updated",
      description: "Post has been updated successfully.",
    });
  }, []);

  // Handle post like
  const handlePostLike = useCallback(async (postId: string) => {
    if (!user || !user._id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to like posts.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔄 Starting like process for post:', postId);
      
      // Store current state for comparison
      const currentPost = posts.find(p => p._id === postId);
      const currentLikeCount = currentPost?.likes?.length || 0;
      const currentIsLiked = currentPost?.likeIds?.includes(user._id) || false;
      
      console.log('📊 Current state:', {
        postId,
        currentLikeCount,
        currentIsLiked,
        userId: user._id
      });
      
      // Make API call to MongoDB first
      const response = await postsApi.likePost(postId);
      console.log('✅ Like response from MongoDB:', response);
      
      // Validate response
      if (!response || typeof response.liked !== 'boolean') {
        throw new Error('Invalid response from server');
      }
      
      // Update posts with server response to ensure consistency
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          const newLikes = response.likeIds || response.likes || [];
          const newIsLiked = response.liked;
          
          console.log('🔄 Updating post likes:', {
            postId,
            oldCount: post.likes?.length || 0,
            newCount: newLikes.length,
            oldIsLiked: currentIsLiked,
            newIsLiked: newIsLiked,
            liked: response.liked
          });
          
          return {
            ...post,
            likes: newLikes,
            likeIds: newLikes // Ensure likeIds is also updated
          };
        }
        return post;
      }));
      
      // Show success message
      toast({
        title: response.liked ? "Post Liked" : "Post Unliked",
        description: response.liked ? "You liked this post!" : "You unliked this post.",
      });
    } catch (error) {
      console.error('❌ Error liking post:', error);
      
      toast({
        title: "Error",
        description: "Failed to like/unlike post. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, toast, posts]);

  // Handle comment addition
  const handleCommentAdded = useCallback(async (postId: string, commentContent: string) => {
    if (!user || !user._id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to comment.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Adding comment to post:', postId, 'Content:', commentContent);
      const response = await postsApi.commentOnPost(postId, { content: commentContent });
      console.log('Comment response:', response);
      
      // Handle both success and direct response formats
      if (response) {
        const comment = response.success ? response.comment : response;
        if (comment) {
          setPosts(prev => prev.map(post => 
            post._id === postId 
              ? { ...post, comments: [...post.comments, comment] }
              : post
          ));
          toast({
            title: "Comment Added",
            description: "Your comment has been posted successfully!",
          });
          console.log('Comment added successfully');
        } else {
          console.error('No comment in response:', response);
          toast({
            title: "Error",
            description: "No comment data received from server.",
            variant: "destructive",
          });
        }
      } else {
        console.error('Invalid comment response:', response);
        toast({
          title: "Error",
          description: "Invalid response from server.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  }, [user]);

  // Handle poll voting
  const handlePollVote = useCallback(async (postId: string, optionId: string) => {
    if (!user || !user._id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to vote.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Voting on poll:', postId, 'Option:', optionId);
      const response = await postsApi.voteOnPollOption(postId, optionId);
      console.log('Poll vote response:', response);
      
      if (response && response.success) {
        setPosts(prev => prev.map(post => 
          post._id === postId 
            ? { ...post, pollDetails: response.pollResults }
            : post
        ));
        toast({
          title: "Vote Recorded",
          description: "Your vote has been recorded successfully!",
        });
        console.log('Poll vote recorded successfully');
      } else {
        console.error('Invalid poll vote response:', response);
        toast({
          title: "Error",
          description: "Invalid response from server.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error voting on poll:', error);
      toast({
        title: "Voting Failed",
        description: "Failed to record your vote. Please try again.",
        variant: "destructive",
      });
    }
  }, [user]);

  // Handle post edit
  const handlePostEdit = useCallback((postId: string) => {
    // Post editing functionality will be implemented in a future update
    console.log('Edit post:', postId);
  }, []);

  // Handle comments toggle
  const handleToggleComments = useCallback((postId: string) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }, []);

  // Render loading state
  if (isLoading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading posts...</p>
                </div>
      </div>
    );
  }

  // Render error state
  if (error && posts.length === 0) {
  return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="text-center">
            <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Retrying...
                  </>
                ) : (
                  <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
                  </>
                )}
              </Button>
                </div>
                    </div>
    );
  }

  // Render empty state
  if (!isLoading && (!posts || posts.length === 0)) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No posts yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Be the first to share something with your alumni network!
          </p>
                              <Button
            onClick={handleRefresh}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
            Refresh Posts
                          </Button>
                      </div>
                    </div>
    );
  }
                    
  return (
    <div className="space-y-6 min-h-full">
      {/* Header with Refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/create-post')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post, index) => {
          // Safety check - ensure post exists and has required properties
          if (!post || !post._id) {
            console.warn('Invalid post found:', post);
            return null;
          }

          // Handle likes field - use likeIds if available, otherwise fallback to likes array
          let likesArray: string[] = [];
          if (post.likeIds && Array.isArray(post.likeIds)) {
            // Use the likeIds field from backend (most reliable)
            likesArray = post.likeIds;
          } else if (Array.isArray(post.likes)) {
            // Fallback: handle both populated user objects and user ID strings
            likesArray = post.likes.map((like: any) => {
              if (typeof like === 'string') {
                return like;
              } else if (like && typeof like === 'object' && like._id) {
                return like._id.toString();
              }
              return null;
            }).filter(Boolean);
          } else {
            // Fallback: if likes is not an array, treat as empty
            likesArray = [];
          }
          
          const commentsArray = Array.isArray(post.comments) ? post.comments : [];
          
          // Additional safety check for user ID - ensure exact match
          const userId = user?._id?.toString() || '';
          const isLiked = likesArray.some(likeId => likeId === userId);
          
          console.log('🔍 Like check for post:', post._id, {
            userId,
            likesArray,
            isLiked,
            likesCount: likesArray.length,
            hasLikeIds: !!post.likeIds,
            exactMatch: likesArray.includes(userId)
          });
          
          const commentsCount = commentsArray.length;
          const showCommentsForPost = showComments[post._id] || false;
                
          return (
            <div key={post._id} ref={index === posts.length - 1 ? lastPostRef : null}>
              <PostRenderer
                post={post}
                user={user}
                onLike={handlePostLike}
                onComment={handleCommentAdded}
                onEdit={undefined}
                onDelete={handlePostDeleted}
                showComments={showCommentsForPost}
                onToggleComments={() => handleToggleComments(post._id)}
                commentsCount={commentsCount}
                isLiked={isLiked}
                onPollVote={handlePollVote}
                showDeleteButton={post.author?._id === user?._id}
              />
            </div>
          );
        }).filter(Boolean)} {/* Filter out null posts */}
        </div>

      {/* Loading more indicator */}
      {isLoading && posts.length > 0 && (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400 mt-2">Loading more posts...</p>
      </div>
      )}

      {/* No more posts indicator */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500 dark:text-gray-400">
            You've reached the end of all posts
          </p>
        </div>
      )}
    </div>
  );
};

export default PostFeed;
