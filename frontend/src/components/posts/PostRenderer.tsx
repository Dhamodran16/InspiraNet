import React from 'react';
import { Post } from '@/services/postsApi';
import { User } from '@/contexts/AuthContext';
import GeneralPost from './GeneralPost';
import JobPost from './JobPost';
import PollPost from './PollPost';
import EventPost from './EventPost';

interface PostRendererProps {
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
  onPollVote: (postId: string, optionId: string) => void;
  showDeleteButton?: boolean;
}

export default function PostRenderer({
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
  onPollVote,
  showDeleteButton = false
}: PostRendererProps) {
  // Determine which post component to render based on post type
  switch (post.postType) {
    case 'event':
      return (
        <EventPost
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
        />
      );
    
    case 'job':
      return (
        <JobPost
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
        />
      );
    
    case 'poll':
      return (
        <PollPost
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
          onPollVote={onPollVote}
          showDeleteButton={showDeleteButton}
        />
      );
    
    case 'general':
    default:
      return (
        <GeneralPost
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
        />
      );
  }
}
