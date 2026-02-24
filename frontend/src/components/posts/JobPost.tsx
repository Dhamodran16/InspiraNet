import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Building, MapPin, DollarSign, Users, Calendar, Link, ImageIcon, Play, File } from 'lucide-react';
import { Post } from '@/services/postsApi';
import { User } from '@/contexts/AuthContext';
import BasePost from './BasePost';
import MediaLightbox from './MediaLightbox';

interface JobPostProps {
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
  likesCount: number;
  isLiked: boolean;
  showDeleteButton?: boolean;
  showShareButton?: boolean;
}

export default function JobPost({
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
  likesCount,
  isLiked,
  showDeleteButton = false,
  showShareButton = true
}: JobPostProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const formatDeadline = (dateString: string) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getJobTypeColor = (jobType: string) => {
    switch (jobType) {
      case 'full-time':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'part-time':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'internship':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'contract':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'freelance':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300 border-pink-200 dark:border-pink-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800';
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

    // Determine media type based on file extension
    const fileExtension = mediaUrl.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
      return (
        <div
          className={`relative group cursor-zoom-in w-full ${isGrid ? 'aspect-square' : 'max-w-[450px] aspect-[4/3]'} overflow-hidden rounded-xl bg-muted mx-auto shadow-sm`}
          onClick={() => setLightboxUrl(mediaUrl)}
        >
          <img
            src={mediaUrl}
            alt="Job image"
            className="w-full h-full object-cover rounded-xl transition-all duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      );
    } else if (['mp4', 'avi', 'mov', 'webm'].includes(fileExtension || '')) {
      return (
        <div className={`relative group w-full ${isGrid ? 'aspect-square' : 'aspect-video'} overflow-hidden rounded-xl bg-muted mx-auto shadow-sm`}>
          <video
            src={mediaUrl}
            controls
            className="w-full h-full object-cover rounded-xl"
            preload="metadata"
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
            <Play className="text-white" size={isGrid ? 24 : 32} />
          </div>
        </div>
      );
    } else if (['pdf'].includes(fileExtension || '')) {
      return (
        <div className={`relative group w-full ${isGrid ? 'aspect-square' : 'h-32'} overflow-hidden rounded-xl bg-muted mx-auto shadow-sm`}>
          <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border hover:border-primary transition-colors">
            <div className="text-center p-2">
              <File className="mx-auto mb-1 text-foreground" size={isGrid ? 24 : 32} />
              <p className={`${isGrid ? 'text-[10px]' : 'text-sm'} text-foreground font-medium truncate max-w-full px-2`}>PDF Document</p>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 text-[10px] mt-1 inline-block"
                onClick={(e) => e.stopPropagation()}
              >
                View PDF
              </a>
            </div>
          </div>
        </div>
      );
    } else {
      // Default case for unknown file types
      return (
        <div className={`relative group w-full ${isGrid ? 'aspect-square' : 'h-32'} overflow-hidden rounded-xl bg-muted mx-auto shadow-sm`}>
          <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border hover:border-primary transition-colors">
            <div className="text-center p-2">
              <File className="mx-auto mb-1 text-foreground" size={isGrid ? 24 : 32} />
              <p className={`${isGrid ? 'text-[10px]' : 'text-sm'} text-foreground font-medium truncate max-w-full px-2`}>File Attachment</p>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 text-[10px] mt-1 inline-block"
                onClick={(e) => e.stopPropagation()}
              >
                View File
              </a>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <BasePost
        post={post}
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
        postTypeLabel="Job Post"
        postTypeIcon="💼"
      >
        {/* Images First - Media Display */}
        {post.media && post.media.length > 0 && (
          <div className="px-3 pt-3">
            <div className="space-y-2">
              {post.media.length === 1 ? (
                <div className="rounded-lg overflow-hidden">
                  {renderMedia(post.media[0])}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {post.media.slice(0, 4).map((mediaItem, index) => (
                    <div key={index} className="rounded-lg overflow-hidden shadow-sm">
                      {renderMedia(mediaItem, true)}
                    </div>
                  ))}
                  {post.media.length > 4 && (
                    <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 aspect-square">
                      <div className="text-center">
                        <span className="text-xl font-bold text-primary">+{post.media.length - 4}</span>
                        <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">more</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Job Details Below Images */}
        {post.jobDetails && (
          <div className="px-3 py-3">
            <div className="space-y-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
              {/* Job Title */}
              {post.jobDetails.title && (
                <div className="mb-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{post.jobDetails.title}</h3>
                </div>
              )}

              {/* Company and Position */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100">Company</p>
                    <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-tight">{post.jobDetails.company}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100">Job Type</p>
                    <Badge className={`${getJobTypeColor(post.jobDetails.type || 'full-time')} text-[10px] py-0 px-1.5 h-4`}>
                      {(post.jobDetails.type || 'full-time').charAt(0).toUpperCase() + (post.jobDetails.type || 'full-time').slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Location and Salary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {post.jobDetails.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100">Location</p>
                      <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-tight">{post.jobDetails.location}</p>
                    </div>
                  </div>
                )}

                {post.jobDetails.salary && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100">Salary</p>
                      <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-tight">{post.jobDetails.salary}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Deadline and Eligibility */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {post.jobDetails.applicationDeadline && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Application Deadline</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatDeadline(post.jobDetails.applicationDeadline)}</p>
                    </div>
                  </div>
                )}

                {post.jobDetails.requirements && post.jobDetails.requirements.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Requirements</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{post.jobDetails.requirements.join(', ')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Job Description */}
              {post.jobDetails.description && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">Job Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{post.jobDetails.description}</p>
                </div>
              )}

              {/* Apply Link */}
              {post.jobDetails.applyLink && (
                <div className="mt-3">
                  <Button
                    asChild
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <a
                      href={post.jobDetails.applyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2"
                    >
                      <Link className="h-4 w-4" />
                      <span>Apply for this Position</span>
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post Content Below Job Details */}
        {post.content && (
          <div className="px-3 py-2">
            <p className="text-gray-700 dark:text-gray-300 text-[13px] leading-relaxed line-clamp-3">
              {post.content}
            </p>
          </div>
        )}
      </BasePost>

      {lightboxUrl && (
        <MediaLightbox
          url={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
          title={post.jobDetails?.title || "Job Image"}
        />
      )}
    </>
  );
}
