import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, Link, Repeat, Globe, Users2, CalendarDays, ImageIcon, Play, File } from 'lucide-react';
import { Post } from '@/services/postsApi';
import { User } from '@/contexts/AuthContext';
import BasePost from './BasePost';
import MediaLightbox from './MediaLightbox';

interface EventPostProps {
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

// Event post images are now standardized to 4:5 (800x1000)
export default function EventPost({
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
}: EventPostProps) {
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
          className={`w-full ${isGrid ? 'aspect-square' : 'max-w-[450px] aspect-[4/3]'} overflow-hidden rounded-xl mx-auto bg-muted cursor-zoom-in group shadow-sm`}
          onClick={() => setLightboxUrl(mediaUrl)}
        >
          <img
            src={mediaUrl}
            alt="Event image"
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
        <div className={`w-full ${isGrid ? 'aspect-square' : 'max-w-4xl aspect-[4/5]'} overflow-hidden rounded-xl mx-auto shadow-sm`}>
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

  const formatEventDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAttendanceModeColor = (mode: string) => {
    switch (mode) {
      case 'in-person':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'online':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800';
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
        postTypeLabel="Event Post"
        postTypeIcon="📅"
      >
        {/* Images First - Media Display */}
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
                    <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 aspect-square shadow-sm">
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

        {/* Event Details Below Images */}
        {post.eventDetails && (
          <div className="px-4 py-3">
            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
              {/* Event Title */}
              {post.title && (
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{post.title}</h3>
                </div>
              )}

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start space-x-2">
                  <div className="mt-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm font-semibold">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Date</p>
                    <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-tight">{formatEventDate(post.eventDetails.date)}</p>
                  </div>
                </div>

                {post.eventDetails.time && (
                  <div className="flex items-start space-x-2">
                    <div className="mt-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Time</p>
                      <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-tight">{post.eventDetails.time}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Location and Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start space-x-2">
                  <div className="mt-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Location</p>
                    <p className="text-[12px] text-gray-600 dark:text-gray-400 break-words leading-tight">{post.eventDetails.location}</p>
                  </div>
                </div>

                {post.eventDetails.attendanceMode && (
                  <div className="flex items-start space-x-2">
                    <div className="mt-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Mode</p>
                      <Badge className={`${getAttendanceModeColor(post.eventDetails.attendanceMode)} text-[10px] py-0 px-1.5 h-4`}>
                        {post.eventDetails.attendanceMode.charAt(0).toUpperCase() + post.eventDetails.attendanceMode.slice(1)}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Recurring */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {post.eventDetails.maxAttendees && (
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Capacity</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{post.eventDetails.maxAttendees} attendees max</p>
                    </div>
                  </div>
                )}

                {post.eventDetails.recurring && (
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <Repeat className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Frequency</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">This is a recurring event</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Registration Link */}
              {post.eventDetails.registrationForm && (
                <div className="pt-2">
                  <Button
                    asChild
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200"
                  >
                    <a
                      href={post.eventDetails.registrationForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2"
                    >
                      <Link className="h-4 w-4" />
                      <span>Register for Event</span>
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post Content Below Event Details */}
        {post.content && (
          <div className="px-4 py-2">
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
          title={post.title || "Event Image"}
        />
      )}
    </>
  );
}
