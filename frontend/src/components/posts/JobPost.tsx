import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Building, MapPin, DollarSign, Users, Calendar, Link, ImageIcon, Play, File } from 'lucide-react';
import { Post } from '@/services/postsApi';
import { User } from '@/contexts/AuthContext';
import BasePost from './BasePost';

interface JobPostProps {
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

export default function JobPost({
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
}: JobPostProps) {
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
      return (
        <div className="relative group cursor-pointer w-full overflow-hidden rounded-xl">
          <img 
            src={mediaUrl} 
            alt="Job image"
            className="w-full h-auto rounded-xl transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            style={{ 
              width: '100%', 
              height: 'auto',
              display: 'block',
              borderRadius: '12px',
              backgroundColor: 'rgba(0,0,0,0.05)',
              maxWidth: '100%'
            }}
          />
        </div>
      );
    } else if (['mp4', 'avi', 'mov', 'webm'].includes(fileExtension || '')) {
      return (
        <div className="relative group">
          <video 
            src={mediaUrl} 
            controls
            className="w-full h-auto rounded-xl"
            preload="metadata"
            style={{
              borderRadius: '12px'
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center pointer-events-none">
            <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" size={32} />
          </div>
        </div>
      );
    } else if (['pdf'].includes(fileExtension || '')) {
      return (
        <div className="relative group">
          <div className="w-full h-32 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border hover:border-primary transition-colors">
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
    } else {
      // Default case for unknown file types
      return (
        <div className="relative group">
          <div className="w-full h-32 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border hover:border-primary transition-colors">
            <div className="text-center">
              <File className="mx-auto mb-2 text-foreground" size={32} />
              <p className="text-sm text-foreground">File Attachment</p>
              <a 
                href={mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 text-sm"
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
      postTypeLabel="💼 Job Post"
      postTypeIcon="💼"
    >
      {/* Job Details */}
      {post.jobDetails && (
        <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
          {/* Company and Position */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Company</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{post.jobDetails.company}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Job Type</p>
                <Badge className={getJobTypeColor(post.jobDetails.type || 'full-time')}>
                  {(post.jobDetails.type || 'full-time').charAt(0).toUpperCase() + (post.jobDetails.type || 'full-time').slice(1)}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Location and Salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {post.jobDetails.location && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Location</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{post.jobDetails.location}</p>
                        </div>
                      </div>
                    )}
            
            {post.jobDetails.salary && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Salary</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{post.jobDetails.salary}</p>
                  </div>
              </div>
            )}
          </div>

          {/* Deadline and Eligibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Job Description</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{post.jobDetails.description}</p>
            </div>
          )}

          {/* Apply Link */}
          {post.jobDetails.applyLink && (
            <div className="mt-4">
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
      )}
      
      {/* Media Display */}
      {post.media && post.media.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Attachments</h4>
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
            </div>
          )}
        </div>
      )}
    </BasePost>
  );
}
