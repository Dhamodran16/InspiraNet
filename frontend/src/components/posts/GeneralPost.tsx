import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Play, File } from 'lucide-react';
import { Post } from '@/services/postsApi';
import { User } from '@/contexts/AuthContext';
import BasePost from './BasePost';

interface GeneralPostProps {
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
}

// Utility function to determine Instagram-style aspect ratio
const getInstagramAspectRatio = (width: number, height: number): string => {
  const ratio = width / height;
  
  if (Math.abs(ratio - 1) < 0.1) {
    return 'aspect-square'; // Square (1:1) - 1080 × 1080
  } else if (ratio < 1) {
    return 'aspect-[4/5]'; // Portrait (4:5) - 1080 × 1350
  } else {
    return 'aspect-[1.91/1]'; // Landscape (1.91:1) - 1080 × 566
  }
};

export default function GeneralPost({
  post,
  user,
  onLike,
  onComment,
  onEdit,
  onDelete,
  showComments,
  onToggleComments,
  commentsCount,
  isLiked,
  showDeleteButton = false
}: GeneralPostProps) {
  const [imageDimensions, setImageDimensions] = useState<{ [key: string]: { width: number; height: number } }>({});

  const getImageAspectRatio = (mediaUrl: string): string => {
    const dimensions = imageDimensions[mediaUrl];
    if (dimensions) {
      return getInstagramAspectRatio(dimensions.width, dimensions.height);
    }
    return 'aspect-square'; // Default to square
  };

  const handleImageLoad = (mediaUrl: string, event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageDimensions(prev => ({
      ...prev,
      [mediaUrl]: { width: img.naturalWidth, height: img.naturalHeight }
    }));
  };

  const renderMedia = (mediaItem: any) => {
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
      const aspectRatio = getImageAspectRatio(mediaUrl);
      
      return (
        <div className={`w-full max-w-[1080px] ${aspectRatio} overflow-hidden rounded-xl mx-auto`}>
          <img 
            src={mediaUrl} 
            alt="Post image"
            className="w-full h-full object-cover rounded-xl transition-transform duration-200 hover:scale-105"
            loading="lazy"
            onLoad={(e) => handleImageLoad(mediaUrl, e)}
          />
        </div>
      );
    } else if (['mp4', 'avi', 'mov', 'webm'].includes(fileExtension || '')) {
      return (
        <div className="w-full max-w-[1080px] aspect-video overflow-hidden rounded-xl mx-auto">
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
        <div className="w-full max-w-[1080px] aspect-[4/5] overflow-hidden rounded-xl mx-auto">
          <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border hover:border-primary transition-colors">
            <div className="text-center">
              <File className="mx-auto mb-2 text-foreground" size={32} />
              <p className="text-sm text-foreground">PDF Document</p>
              <a 
                href={mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 text-sm"
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
    <BasePost
      post={post}
      user={user}
      onLike={onLike}
      onComment={onComment}
      onEdit={onEdit}
      onDelete={onDelete}
      showComments={showComments}
      onToggleComments={onToggleComments}
      commentsCount={commentsCount}
      isLiked={isLiked}
      showDeleteButton={showDeleteButton}
      postTypeLabel="📝 General Post"
      postTypeIcon="📝"
    >
        {/* Enhanced Media Display */}
        {post.media && post.media.length > 0 && (
          <div className="space-y-3">
            {post.media.length === 1 ? (
              <div className="rounded-lg overflow-hidden">
                {renderMedia(post.media[0])}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {post.media.slice(0, 4).map((mediaItem, index) => (
                  <div key={index} className="rounded-lg overflow-hidden">
                    {renderMedia(mediaItem)}
                  </div>
                ))}
                {post.media.length > 4 && (
                  <div className="relative rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-muted-foreground">+{post.media.length - 4}</span>
                      <p className="text-sm text-muted-foreground">more</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </BasePost>
  );
}
