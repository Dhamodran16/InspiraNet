import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, Link, Repeat, Globe, Users2, CalendarDays, ImageIcon, Play, File } from 'lucide-react';
import { Post } from '@/services/postsApi';
import { User } from '@/contexts/AuthContext';
import BasePost from './BasePost';

interface EventPostProps {
  post: Post;
  user: User | null;
  onLike: (postId: string) => void;
  onComment: (postId: string, commentContent: string) => void;
  onEdit?: (postId: string) => void;
  onDelete: (postId: string) => void;
  showComments: boolean;
  onToggleComments: () => void;
  commentsCount: number;
  likesCount: number;
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

export default function EventPost({
  post,
  user,
  onLike,
  onComment,
  onEdit,
  onDelete,
  showComments,
  onToggleComments,
  commentsCount,
  likesCount,
  isLiked,
  showDeleteButton = false
}: EventPostProps) {
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
            alt="Event image"
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

  const getAttendanceModeIcon = (mode: string) => {
    switch (mode) {
      case 'in-person':
        return <Users2 className="h-4 w-4 text-green-600" />;
      case 'online':
        return <Globe className="h-4 w-4 text-blue-600" />;
      case 'hybrid':
        return <Users2 className="h-4 w-4 text-purple-600" />;
      default:
        return <Users2 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAttendanceModeColor = (mode: string) => {
    switch (mode) {
      case 'in-person':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'online':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const isEventUpcoming = () => {
    if (!post.eventDetails?.date) return false;
    const eventDate = new Date(post.eventDetails.date);
    const now = new Date();
    return eventDate > now;
  };

  const isEventToday = () => {
    if (!post.eventDetails?.date) return false;
    const eventDate = new Date(post.eventDetails.date);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const getEventStatus = () => {
    if (!post.eventDetails?.date) return 'unknown';
    const eventDate = new Date(post.eventDetails.date);
    const now = new Date();
    
    if (eventDate < now) return 'past';
    if (isEventToday()) return 'today';
    return 'upcoming';
  };

  const getEventStatusColor = () => {
    const status = getEventStatus();
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'today':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'past':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getEventStatusText = () => {
    const status = getEventStatus();
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'today':
        return 'Today';
      case 'past':
        return 'Past Event';
      default:
        return 'Unknown';
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatEventTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString;
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
      likesCount={likesCount}
      isLiked={isLiked}
      showDeleteButton={showDeleteButton}
      postTypeLabel="📅 Event"
      postTypeIcon="📅"
    >
      {/* Event Details */}
      {post.eventDetails && (
        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          {/* Event Status */}
        <div className="flex items-center justify-between">
            <Badge className={getEventStatusColor()}>
                {getEventStatusText()}
            </Badge>
            {post.eventDetails.recurring && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                Recurring
              </Badge>
            )}
          </div>

          {/* Event Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Date</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatEventDate(post.eventDetails.date)}</p>
                  </div>
                </div>
                
                {post.eventDetails.time && (
                  <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Time</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{formatEventTime(post.eventDetails.time)}</p>
                    </div>
                  </div>
                )}
              </div>

          {/* Event Location and Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {post.eventDetails.location && (
                  <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                    <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Location</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{post.eventDetails.location}</p>
                    </div>
                  </div>
                )}
                
                  <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Attendance</p>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {post.eventDetails.attendanceMode ? (
                    <Badge className={getAttendanceModeColor(post.eventDetails.attendanceMode)}>
                    {getAttendanceModeIcon(post.eventDetails.attendanceMode)}
                      {post.eventDetails.attendanceMode.charAt(0).toUpperCase() + post.eventDetails.attendanceMode.slice(1)}
                    </Badge>
                  ) : 'Not specified'}
                    </div>
                  </div>
              </div>
            </div>

          {/* Max Attendees */}
              {post.eventDetails.maxAttendees && (
                <div className="flex items-center space-x-2">
              <Users2 className="h-5 w-5 text-blue-600" />
                  <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Max Attendees</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{post.eventDetails.maxAttendees}</p>
                  </div>
                </div>
              )}
              
          {/* Registration Form */}
          {post.eventDetails.registrationForm && (
                <div className="flex items-center space-x-2">
              <Link className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Registration</p>
                <a 
                  href={post.eventDetails.registrationForm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
                >
                  Register for Event
                </a>
              </div>
          </div>
        )}
        </div>
      )}

      {/* Media Content */}
      {post.media && post.media.length > 0 && (
        <div className="space-y-3">
          {post.media.map((mediaItem, index) => (
            <div key={index} className="w-full">
              {renderMedia(mediaItem)}
            </div>
          ))}
        </div>
      )}
    </BasePost>
  );
}
