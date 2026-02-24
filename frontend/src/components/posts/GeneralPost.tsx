import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Play, File } from 'lucide-react';
import { Post } from '@/services/postsApi';
import { User } from '@/contexts/AuthContext';
import BasePost from './BasePost';
import MediaLightbox from './MediaLightbox';

interface GeneralPostProps {
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
}

// Image post dimensions are now standardized to 4:5 (800x1000)
export default function GeneralPost({
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
  showDeleteButton = false,
  showShareButton = true
}: GeneralPostProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Image logic standardized to 4:5 aspect ratio for single, square for grid
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
          className={`w-full ${isGrid ? 'aspect-square' : 'max-w-[450px] aspect-[4/3]'} overflow-hidden rounded-xl mx-auto bg-muted cursor-zoom-in group`}
          onClick={() => setLightboxUrl(mediaUrl)}
        >
          <img
            src={mediaUrl}
            alt="Post image"
            className="w-full h-full object-cover rounded-xl transition-all duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      );
    } else if (['mp4', 'avi', 'mov', 'webm'].includes(fileExtension || '')) {
      return (
        <div className={`w-full ${isGrid ? 'aspect-square' : 'max-w-4xl aspect-video'} overflow-hidden rounded-xl mx-auto shadow-sm`}>
          <video
            src={mediaUrl}
            controls
            className="w-full h-full object-cover rounded-xl"
            preload="metadata"
          />
        </div>
      );
    } else if (['pdf'].includes(fileExtension || '')) {
      return (
        <div className={`w-full ${isGrid ? 'aspect-square' : 'max-w-4xl aspect-[4/5]'} overflow-hidden rounded-xl mx-auto`}>
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
    }

    return null;
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
        postTypeLabel="General Post"
        postTypeIcon="📝"
      >
        {/* Images First - Enhanced Media Display */}
        {post.media && post.media.length > 0 && (
          <div className="px-4 pt-4">
            <div className="space-y-3">
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
                        <span className="text-2xl font-bold text-primary">+{post.media.length - 4}</span>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">more</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post Content Below Images */}
        {post.content && (
          <div className="px-4 py-2">
            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap text-[13px] leading-relaxed">
              {post.content}
            </p>
          </div>
        )}
      </BasePost>

      {lightboxUrl && (
        <MediaLightbox
          url={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
          title={post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : '')}
        />
      )}
    </>
  );
}
