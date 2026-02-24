import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, FileText, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import api from '@/services/api';
import BasePost from './BasePost';
import { Post } from '@/services/postsApi';
import { User } from '@/contexts/AuthContext';
import { socketService } from '@/services/socketService';
import MediaLightbox from './MediaLightbox';

// Using Post type from postsApi which has pollDetails with _id for options

interface PollPostProps {
  post: Post;
  user: User | null;
  onLike: (postId: string) => void;
  onComment: (postId: string, comment: string) => void;
  onEdit?: (postId: string) => void;
  onDelete: (postId: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onShare?: (postId: string) => void;
  showComments: boolean;
  onToggleComments: () => void;
  commentsCount: number;
  isLiked: boolean;
  onPollVote: (postId: string, optionId: string) => void;
  showDeleteButton?: boolean;
  showShareButton?: boolean;
  showAlwaysForAuthor?: boolean; // When true (e.g. profile page), show download button even if poll is ongoing
}

const PollPost: React.FC<PollPostProps> = ({
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
  isLiked,
  onPollVote,
  showDeleteButton,
  showShareButton = true,
  showAlwaysForAuthor = false
}) => {
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Update local state when post prop changes
  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  // Listen for real-time poll updates
  useEffect(() => {
    const handlePollUpdate = (data: any) => {
      if (data.postId === post._id) {
        console.log('Real-time poll update received:', data);
        setCurrentPost((prev) => ({
          ...prev,
          pollDetails: data.pollDetails
        }));
        // Update parent without triggering vote (just update state)
        // Don't call onPollVote here as it requires an optionId
      }
    };

    socketService.onPollVoteUpdate(handlePollUpdate);

    return () => {
      socketService.offPollVoteUpdate();
    };
  }, [post._id]);

  const handleVote = async (optionId: string) => {
    // Validate optionId first
    if (!optionId || optionId.trim() === '' || optionId === 'undefined' || optionId === 'null') {
      console.error('Invalid optionId received:', optionId);
      toast({
        title: "Invalid Option",
        description: "Please select a valid poll option.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to vote in polls",
        variant: "destructive",
      });
      return;
    }

    // Check if poll has ended
    if (!canVote) {
      toast({
        title: "Poll Ended",
        description: "This poll has ended. You can no longer vote.",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    // Check if user has already voted on any option (for "Vote updated" message)
    const hasVotedBefore = hasUserVoted();
    // Find option by comparing both _id and id as strings
    const optionIdStr = String(optionId);
    const selectedOption = currentPost.pollDetails?.options.find(opt => {
      const optId = opt._id ? String(opt._id) : '';
      const optStringId = (opt as any).id ? String((opt as any).id) : '';
      return optId === optionIdStr || optStringId === optionIdStr;
    });

    if (!selectedOption) {
      console.error('Selected option not found in poll options:', optionIdStr);
      console.log('Available options:', currentPost.pollDetails?.options.map(opt => ({
        _id: opt._id,
        id: (opt as any).id,
        text: opt.text
      })));
      toast({
        title: "Invalid Option",
        description: "The selected option was not found.",
        variant: "destructive",
      });
      return;
    }

    const isCurrentVote = selectedOption?.votes?.includes(user._id || '');

    try {
      setIsSubmitting(true);

      // Ensure optionId is a string
      const optionIdToSend = String(optionId);

      console.log('Voting on poll:', post._id, 'with optionId:', optionIdToSend);
      const response = await api.post(`/api/posts/${post._id}/poll-vote`, {
        optionId: optionIdToSend
      });

      if (response.data) {
        // Backend returns the full updated post
        const updatedPost = response.data;

        // Check if vote was actually removed (user clicked same option) BEFORE updating state
        const stillHasVote = updatedPost?.pollDetails?.options.some((opt: any) =>
          opt.votes?.includes(user._id || '')
        );

        // Update local state immediately
        setCurrentPost(updatedPost);

        // Update parent PostFeed state with the updated post data
        // Pass empty string to indicate this is just a state update, not a new vote
        // The PostFeed will update its posts array with the new pollDetails
        onPollVote(post._id, '');

        // Also update the PostFeed posts array directly to ensure consistency
        // This is done via the onPollVote callback which will update the parent state

        // Show appropriate message based on vote state
        if (hasVotedBefore && isCurrentVote && !stillHasVote) {
          // User clicked the same option they already voted for (removes vote)
          toast({
            title: "Vote Removed",
            description: "Your vote has been removed.",
          });
        } else if (hasVotedBefore && !isCurrentVote && stillHasVote) {
          toast({
            title: "Vote Updated",
            description: "Your vote has been updated.",
          });
        } else if (!hasVotedBefore && stillHasVote) {
          toast({
            title: "Vote Recorded",
            description: "Your vote has been recorded successfully!",
          });
        } else {
          // Fallback - shouldn't happen but handle gracefully
          console.warn('Unexpected vote state:', { hasVotedBefore, isCurrentVote, stillHasVote });
        }
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to record your vote. Please try again.";
      toast({
        title: "Voting Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUserVoted = () => {
    return currentPost.pollDetails?.options.some(option =>
      option.votes?.includes(user?._id || '')
    ) || false;
  };

  const getUserVotedOption = () => {
    return currentPost.pollDetails?.options.find(option =>
      option.votes?.includes(user?._id || '')
    );
  };

  const canVote = (() => {
    if (!currentPost.pollDetails?.endDate) return true;
    try {
      const endDate = new Date(currentPost.pollDetails.endDate);
      return !isNaN(endDate.getTime()) && endDate > new Date();
    } catch {
      return true;
    }
  })();

  const isPollEnded = (() => {
    if (!currentPost.pollDetails?.endDate) return false;
    try {
      const endDate = new Date(currentPost.pollDetails.endDate);
      return !isNaN(endDate.getTime()) && endDate <= new Date();
    } catch {
      return false;
    }
  })();

  // Always show results
  const shouldShowResults = true;

  const formatEndDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await api.get(`/api/posts/${post._id}/poll-data/excel`, {
        responseType: 'blob'
      });

      // Create a blob from the response
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Create a temporary URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `poll-data-${post._id}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Poll data is being downloaded.",
      });
    } catch (error: any) {
      console.error('Error downloading poll data:', error);
      toast({
        title: "Download Failed",
        description: error.response?.data?.error || "Failed to download poll data.",
        variant: "destructive",
      });
    }
  };

  const renderMedia = (mediaItem: any, isGrid: boolean = false) => {
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
        <div
          className={`mb-3 w-full ${isGrid ? 'aspect-square' : 'max-w-[450px] aspect-[4/3]'} overflow-hidden rounded-lg bg-muted mx-auto cursor-zoom-in group shadow-sm`}
          onClick={() => setLightboxUrl(mediaUrl)}
        >
          <img
            src={mediaUrl}
            alt="Poll media"
            className="w-full h-full object-cover rounded-lg transition-all duration-300 group-hover:scale-105"
          />
        </div>
      );
    } else if (type === 'video') {
      return (
        <div className={`mb-3 w-full ${isGrid ? 'aspect-square' : 'aspect-video'} overflow-hidden rounded-xl bg-muted mx-auto shadow-sm`}>
          <video
            src={mediaUrl}
            controls
            className="w-full h-full object-cover rounded-xl"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    } else if (type === 'pdf' || type === 'document') {
      return (
        <div className="mb-3">
          <div className="flex items-center space-x-2 p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <FileText className="h-6 w-6 text-blue-600" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">Document attached</span>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs underline"
              >
                View Document
              </a>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <BasePost
        post={currentPost}
        user={user}
        onLike={onLike}
        onComment={onComment}
        onEdit={onEdit}
        onDelete={onDelete}
        onDeleteComment={onDeleteComment}
        onShare={onShare}
        showComments={showComments}
        onToggleComments={onToggleComments}
        commentsCount={commentsCount}
        isLiked={isLiked}
        showDeleteButton={showDeleteButton}
        showShareButton={showShareButton}
        postTypeLabel="Poll"
        postTypeIcon="📊"
        footerRight={
          currentPost.pollDetails?.endDate ? (
            <span>
              {new Date(currentPost.pollDetails.endDate) <= new Date() ? 'Poll ended ' : 'Polling ending '}
              {formatEndDate(currentPost.pollDetails.endDate)}
            </span>
          ) : null
        }
      >

        {/* Media Content - Display First */}
        {currentPost.media && currentPost.media.length > 0 && (
          <div className="px-3 pt-3">
            <div className="space-y-2">
              {currentPost.media.length === 1 ? (
                <div className="rounded-lg overflow-hidden">
                  {renderMedia(currentPost.media[0])}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {currentPost.media.slice(0, 4).map((mediaItem, index) => (
                    <div key={index} className="rounded-lg overflow-hidden shadow-sm">
                      {renderMedia(mediaItem, true)}
                    </div>
                  ))}
                  {currentPost.media.length > 4 && (
                    <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 aspect-square shadow-sm">
                      <div className="text-center">
                        <span className="text-xl font-bold text-primary">+{currentPost.media.length - 4}</span>
                        <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">more</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Poll Content Below Images */}
        <div className="px-3 py-3">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {currentPost.pollDetails?.question || 'Poll Question'}
            </h3>
            {currentPost.content && (
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                {currentPost.content}
              </p>
            )}
          </div>

          {/* Poll Options */}
          <div className="space-y-2 mb-3">
            {currentPost.pollDetails?.options.map((option, index) => {
              const votes = option.votes?.length || 0;
              const totalVotes = (currentPost.pollDetails?.options || []).reduce((sum, opt) =>
                sum + (opt.votes?.length || 0), 0
              );
              const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const userVoted = option.votes?.includes(user?._id || '');

              const canClick = !isSubmitting && canVote && !isPollEnded;
              // Get optionId - prefer _id (MongoDB ObjectId) over id (string like "option_0")
              // Convert to string to ensure consistency
              let optionId: string = '';
              if (option._id) {
                optionId = String(option._id);
              } else if ((option as any).id) {
                optionId = String((option as any).id);
              } else {
                // Fallback: use index-based ID if neither exists
                optionId = `option_${index}`;
              }

              // Validate optionId before allowing vote
              if (!optionId || optionId === 'undefined' || optionId === 'null' || optionId.trim() === '') {
                console.error('Invalid optionId:', option, 'index:', index);
                return null;
              }

              return (
                <div
                  key={optionId}
                  className={`relative p-2 rounded-lg border-2 transition-all ${userVoted
                    ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/20 cursor-pointer hover:border-purple-600'
                    : canClick
                      ? 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer'
                      : 'border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                    }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (canClick) {
                      handleVote(optionId);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100 leading-tight">
                      {option.text}
                    </span>
                    {shouldShowResults && (
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        {percentage}%
                      </span>
                    )}
                  </div>

                  {shouldShowResults && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}

                  {shouldShowResults && (
                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>{votes} votes</span>
                      {userVoted && (
                        <Badge variant="secondary" className="text-xs">
                          <Vote className="h-3 w-3 mr-1" />
                          Your vote
                        </Badge>
                      )}
                    </div>
                  )}

                  {!shouldShowResults && canVote && (
                    <div className="text-center">
                      <Button
                        size="sm"
                        variant={userVoted ? "default" : "outline"}
                        className={`mt-2 ${userVoted ? 'bg-purple-500 hover:bg-purple-600' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(optionId);
                        }}
                        disabled={isSubmitting}
                      >
                        <Vote className="h-3 w-3 mr-1" />
                        {userVoted ? 'Change Vote' : 'Vote'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Poll Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-purple-200 dark:border-purple-700">
            {(isPollEnded || showAlwaysForAuthor) && currentPost.pollDetails?.endDate && (
              <>
                {isPollEnded && (
                  <Badge variant="destructive">
                    Poll ended on {formatEndDate(currentPost.pollDetails.endDate)}
                  </Badge>
                )}
                {user && user._id === currentPost.author?._id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadExcel}
                    className="ml-2"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Poll Data
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

      </BasePost>

      {lightboxUrl && (
        <MediaLightbox
          url={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
          title={currentPost.pollDetails?.question}
        />
      )}
    </>
  );
};

export default PollPost;
