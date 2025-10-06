import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import postsApi, { Post } from '@/services/postsApi';
import { useAuth } from '@/contexts/AuthContext';
import PostRenderer from '@/components/posts/PostRenderer';
import { Loader2 } from 'lucide-react';

interface ProfilePostsProps {
  userId: string;
}

export default function ProfilePosts({ userId }: ProfilePostsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1, append = false) => {
    try {
      setLoading(true);
      const res = await postsApi.getUserPosts(userId, p, 10);
      // Backend returns { posts, pagination: { totalPages, ... } }
      const totalPages = (res as any)?.pagination?.totalPages ?? (res as any)?.totalPages ?? 1;
      const rawPosts = (res as any)?.posts ?? [];
      // Strict filter: only posts authored by this profile user
      const profileId = (userId as any)?.toString?.() || userId;
      const list = rawPosts.filter((x: any) => (((x?.author?._id as any)?.toString?.() || x?.author?._id) === profileId));

      setHasMore(p < totalPages);
      if (append) {
        setPosts(prev => {
          const ids = new Set(prev.map(x => x._id));
          const add = list.filter((x: any) => !ids.has(x._id));
          return [...prev, ...add];
        });
      } else {
        setPosts(list);
      }
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Reset state when userId changes to avoid mixing
  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    load(1, false);
  }, [userId, load]);

  const onLike = async () => {};
  const onComment = async () => {};
  const onDelete = async () => {};
  const onToggle = () => {};
  const onEdit = () => {};
  const onPollVote = () => {};

  return (
    <div className="space-y-6">
      {posts.length === 0 && !loading && (
        <div className="text-center py-10 border rounded-lg">
          <p className="text-lg font-semibold mb-2">No posts created yet</p>
          {user?._id === userId && (
            <button
              className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => { window.location.href = '/#/create-post'; }}
            >
              Create Post
            </button>
          )}
        </div>
      )}
      {posts.map((post) => (
        <PostRenderer
          key={post._id}
          post={post}
          user={user}
          onLike={onLike}
          onComment={onComment as any}
          onEdit={onEdit}
          onDelete={onDelete as any}
          showComments={false}
          onToggleComments={onToggle}
          commentsCount={post.comments?.length || 0}
          isLiked={!!post.likes?.includes(user?._id || '')}
          onPollVote={onPollVote}
          showDeleteButton={post.author?._id === user?._id}
        />
      ))}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {!loading && hasMore && (
        <div className="text-center">
          <button
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => load(page + 1, true)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
