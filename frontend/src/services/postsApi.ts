import api, { makeAuthenticatedRequest } from './api';

export interface Post {
  _id: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
    type: string;
    department?: string;
    batch?: string;
  };
  title?: string;
  content: string;
  postType: 'general' | 'event' | 'job' | 'poll';
  media?: Array<{
    type: string;
    url: string;
    filename?: string;
    size?: number;
    mimeType?: string;
  }>;
  tags?: string[];
  likes: string[];
  likeIds?: string[]; // Array of user IDs who liked the post (for easier checking)
  comments: Array<{
    _id: string;
    author: {
      _id: string;
      name: string;
      avatar?: string;
    };
    content: string;
    createdAt: string;
    likes: string[];
  }>;
  createdAt: string;
  updatedAt: string;
  // Event-specific fields
  eventDetails?: {
    title: string;
    date: string;
    location: string;
    description: string;
    time?: string;
    recurring?: boolean;
    attendanceMode?: 'in-person' | 'online' | 'hybrid';
    maxAttendees?: number;
    registrationForm?: string;
  };
  // Job-specific fields
  jobDetails?: {
    title: string;
    company: string;
    location: string;
    type: string;
    description: string;
    requirements: string[];
    salary?: string;
    applicationDeadline?: string;
    applyLink?: string;
  };
  // Poll-specific fields
  pollDetails?: {
    question: string;
    options: Array<{
      _id: string;
      text: string;
      votes: string[];
    }>;
    endDate?: string;
    isActive: boolean;
  };
}

export interface CreatePostData {
  content: string;
  postType: 'general' | 'event' | 'job' | 'poll';
  media?: File[];
  eventDetails?: {
    title: string;
    date: string;
    location: string;
    description: string;
    time?: string;
    recurring?: boolean;
    attendanceMode?: 'in-person' | 'online' | 'hybrid';
    maxAttendees?: number;
    registrationForm?: string;
  };
  jobDetails?: {
    title: string;
    company: string;
    location: string;
    type: string;
    description: string;
    requirements: string[];
    salary?: string;
    applicationDeadline?: string;
    applyLink?: string;
  };
  pollDetails?: {
    question: string;
    options: string[];
    endDate?: string;
  };
}

export interface UpdatePostData {
  content?: string;
  eventDetails?: Partial<CreatePostData['eventDetails']>;
  jobDetails?: Partial<CreatePostData['jobDetails']>;
  pollDetails?: Partial<CreatePostData['pollDetails']>;
}

export interface CommentData {
  content: string;
}

export interface PollVoteData {
  optionId: string;
}

class PostsApiService {
  async getPosts(page = 1, limit = 10): Promise<{ posts: Post[]; totalPages: number; currentPage: number; total: number }> {
    try {
      const response = await makeAuthenticatedRequest<{ posts: Post[]; totalPages: number; currentPage: number; total: number }>({
        method: 'GET',
        url: `/api/posts?page=${page}&limit=${limit}`,
      });
      return response;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  async getPost(postId: string): Promise<Post> {
    try {
      const response = await makeAuthenticatedRequest<Post>({
        method: 'GET',
        url: `/api/posts/${postId}`,
      });
      return response;
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  }

  async createPost(postData: CreatePostData): Promise<Post> {
    try {
      const formData = new FormData();
      formData.append('content', postData.content);
      formData.append('postType', postData.postType);

      if (postData.media) {
        postData.media.forEach((file) => {
          formData.append('media', file);
        });
      }

      if (postData.eventDetails) {
        formData.append('eventDetails', JSON.stringify(postData.eventDetails));
      }

      if (postData.jobDetails) {
        formData.append('jobDetails', JSON.stringify(postData.jobDetails));
      }

      if (postData.pollDetails) {
        formData.append('pollDetails', JSON.stringify(postData.pollDetails));
      }

      const response = await makeAuthenticatedRequest<Post>({
        method: 'POST',
        url: '/api/posts',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async updatePost(postId: string, postData: UpdatePostData): Promise<Post> {
    try {
      const response = await makeAuthenticatedRequest<Post>({
        method: 'PUT',
        url: `/api/posts/${postId}`,
        data: postData,
      });
      return response;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  async deletePost(postId: string): Promise<{ message: string }> {
    try {
      const response = await makeAuthenticatedRequest<{ message: string }>({
        method: 'DELETE',
        url: `/api/posts/${postId}`,
      });
      return response;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  async likePost(postId: string): Promise<{ liked: boolean; likeCount: number; likes: string[]; likeIds: string[] }> {
    try {
      const response = await makeAuthenticatedRequest<{ liked: boolean; likeCount: number; likes: string[]; likeIds: string[] }>({
        method: 'POST',
        url: `/api/posts/${postId}/like`,
      });
      return response;
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }

  async commentOnPost(postId: string, commentData: CommentData): Promise<{ success: boolean; comment: any }> {
    try {
      const response = await makeAuthenticatedRequest<{ success: boolean; comment: any }>({
        method: 'POST',
        url: `/api/posts/${postId}/comments`,
        data: commentData,
      });
      return response;
    } catch (error) {
      console.error('Error commenting on post:', error);
      throw error;
    }
  }

  async likeComment(postId: string, commentId: string): Promise<{ success: boolean; likes: string[] }> {
    try {
      const response = await makeAuthenticatedRequest<{ success: boolean; likes: string[] }>({
        method: 'POST',
        url: `/api/posts/${postId}/comments/${commentId}/like`,
      });
      return response;
    } catch (error) {
      console.error('Error liking comment:', error);
      throw error;
    }
  }

  async deleteComment(postId: string, commentId: string): Promise<{ message: string }> {
    try {
      const response = await makeAuthenticatedRequest<{ message: string }>({
        method: 'DELETE',
        url: `/api/posts/${postId}/comments/${commentId}`,
      });
      return response;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  async voteOnPollOption(postId: string, optionId: string): Promise<{ success: boolean; pollResults: any }> {
    try {
      const response = await makeAuthenticatedRequest<{ success: boolean; pollResults: any }>({
        method: 'POST',
        url: `/api/posts/${postId}/poll-vote`,
        data: { optionId },
      });
      return response;
    } catch (error) {
      console.error('Error voting on poll:', error);
      throw error;
    }
  }

  async getUserPosts(userId: string, page = 1, limit = 10): Promise<{ posts: Post[]; totalPages: number; currentPage: number; total: number }> {
    try {
      const response = await makeAuthenticatedRequest<{ posts: Post[]; totalPages: number; currentPage: number; total: number }>({
        method: 'GET',
        url: `/api/users/${userId}/posts?page=${page}&limit=${limit}`,
      });
      return response;
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw error;
    }
  }

  async searchPosts(query: string, page = 1, limit = 10): Promise<{ posts: Post[]; totalPages: number; currentPage: number; total: number }> {
    try {
      const response = await makeAuthenticatedRequest<{ posts: Post[]; totalPages: number; currentPage: number; total: number }>({
        method: 'GET',
        url: `/api/posts/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
      });
      return response;
    } catch (error) {
      console.error('Error searching posts:', error);
      throw error;
    }
  }
}

export const postsApi = new PostsApiService();
export default postsApi;




