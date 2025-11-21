import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Vote, Eye, EyeOff, Calendar, Clock, Users, Award, Image as ImageIcon, Video, FileText, MoreVertical, X, Share2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/services/api';

interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

interface PollDetails {
  question: string;
  options: PollOption[];
  endDate?: string;
  hideResults: boolean;
  allowMultipleVotes: boolean;
  maxVotes?: number;
}

interface Post {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
    type: string;
  };
  createdAt: string;
  pollDetails: PollDetails;
  media?: Array<{
    type: string;
    url: string;
    filename?: string;
    size?: number;
    mimeType?: string;
  }>;
  likes: string[];
  comments: any[];
  postType: string;
}

interface PollPostProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string, comment: string) => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onShare?: (postId: string) => void;
  showComments: boolean;
  onToggleComments: () => void;
  commentsCount: number;
  likesCount: number;
  isLiked: boolean;
  onPollVote: (postId: string, optionId: string) => void;
  showDeleteButton?: boolean;
  showShareButton?: boolean;
}

const PollPost: React.FC<PollPostProps> = ({
  post,
  onLike,
  onComment,
  onEdit,
  onDelete,
  onDeleteComment,
  onShare,
  showComments,
  onToggleComments,
  commentsCount,
  likesCount,
  isLiked,
  onPollVote,
  showDeleteButton,
  showShareButton = true
}) => {
  const { user } = useAuth();
  const [currentPost, setCurrentPost] = useState(post);
  const [showResults, setShowResults] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Update local state when post prop changes
  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  const handleVote = async (optionId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to vote in polls",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post(`/api/posts/${post._id}/poll-vote`, {
        optionId
      });

      if (response.data) {
        setCurrentPost(response.data);
        onPollVote(post._id, optionId);
        toast({
          title: "Vote Recorded",
          description: "Your vote has been recorded successfully!",
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Voting Failed",
        description: "Failed to record your vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUserVoted = () => {
    return currentPost.pollDetails.options.some(option => 
      option.votes?.includes(user?._id || '')
    );
  };

  const canVote = !currentPost.pollDetails.endDate || 
    new Date(currentPost.pollDetails.endDate) > new Date();

  const isPollEnded = currentPost.pollDetails.endDate && 
    new Date(currentPost.pollDetails.endDate) <= new Date();

  const shouldShowResults = showResults || isPollEnded || !currentPost.pollDetails.hideResults;

  const formatEndDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const renderMedia = (mediaItem: any) => {
    // Handle both string (legacy) and object (new) media formats
    const mediaUrl = typeof mediaItem === 'string' ? mediaItem : mediaItem?.url;
    
    // Safety check: ensure mediaUrl is a string
    if (!mediaUrl || typeof mediaUrl !== 'string') {
      console.warn('Invalid media item:', mediaItem);
      return null;
    }
    
    const type = typeof mediaItem === 'string' ? 'image' : mediaItem.type;
    
    if (type === 'image') {
      return (
        <div className="mb-4">
          <img
            src={mediaUrl}
            alt="Poll media"
            className="w-full h-auto rounded-lg"
          />
        </div>
      );
    } else if (type === 'video') {
      return (
        <div className="mb-4">
          <video
            src={mediaUrl}
            controls
            className="w-full h-auto rounded-xl"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    } else if (type === 'pdf' || type === 'document') {
      return (
        <div className="mb-4">
          <div className="flex items-center space-x-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <FileText className="h-6 w-6 text-blue-600" />
            <span className="text-sm font-medium">Document attached</span>
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              View Document
            </a>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm max-w-4xl mx-auto">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <img
                        src={currentPost.author.avatar || '/default-avatar.png'}
                        alt={currentPost.author.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {currentPost.author.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatDistanceToNow(new Date(currentPost.createdAt), { addSuffix: true })}</span>
                        <span>•</span>
                        <span className="capitalize">{currentPost.author.type}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Three dot menu */}
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
                                onShare?.(currentPost._id);
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
                                onDelete?.(currentPost._id);
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

      {/* Media Content - Display First */}
      {currentPost.media && currentPost.media.length > 0 && (
        <div className="px-4 pt-4">
          {currentPost.media.map((mediaItem, index) => (
            <div key={index}>
              {renderMedia(mediaItem)}
            </div>
          ))}
        </div>
      )}

      {/* Poll Content Below Images */}
      <div className="px-4 py-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {currentPost.pollDetails.question}
          </h3>
          {currentPost.content && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {currentPost.content}
            </p>
          )}
        </div>

          {/* Poll Options */}
        <div className="space-y-3 mb-4">
          {currentPost.pollDetails.options.map((option) => {
              const votes = option.votes?.length || 0;
            const totalVotes = currentPost.pollDetails.options.reduce((sum, opt) => 
              sum + (opt.votes?.length || 0), 0
            );
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const userVoted = option.votes?.includes(user?._id || '');
              
              return (
                <div
                  key={option.id}
                  className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    userVoted 
                      ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                  onClick={() => handleVote(option.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {option.text}
                    </span>
                    {shouldShowResults && (
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {percentage}%
                      </span>
                    )}
                  </div>
                  
                  {shouldShowResults && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                  
                  {shouldShowResults && (
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{votes} votes</span>
                      {userVoted && (
                        <Badge variant="secondary" className="text-xs">
                          <Vote className="h-3 w-3 mr-1" />
                          Your vote
                        </Badge>
                      )}
                  </div>
                )}
                  
                  {!shouldShowResults && canVote && !hasUserVoted() && (
                    <div className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(option.id);
                        }}
                      >
                        <Vote className="h-3 w-3 mr-1" />
                        Vote
                      </Button>
                  </div>
                )}
              </div>
              );
            })}
          </div>

          {/* Poll Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-purple-200 dark:border-purple-700">
          {currentPost.pollDetails.hideResults && !isPollEnded && (
            <Button 
              variant="ghost" 
              size="sm"
                onClick={() => setShowResults(!showResults)}
                className="text-purple-600 hover:text-purple-800"
              >
                {showResults ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Hide Results
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Show Results
                  </>
                )}
            </Button>
            )}
            
            {isPollEnded && (
              <Badge variant="destructive" className="ml-auto">
                Poll ended on {formatEndDate(currentPost.pollDetails.endDate || '')}
              </Badge>
            )}
          </div>
        </div>
    </div>
  );
};

export default PollPost;
