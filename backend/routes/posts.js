const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const { uploadImage, uploadVideo, deleteFile } = require('../services/cloudinary');
const cloudinary = require('cloudinary').v2;
const Group = require('../models/Group');
const multer = require('multer');



// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') || 
        file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'), false);
    }
  }
});

// Get all posts with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, author, tags, search, postType, department, batch, fromDate, toDate } = req.query;
    const skip = (page - 1) * limit;

    let query = { isPublic: true };

    if (author) {
      query.author = author;
    }

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Additional filters
    if (postType) {
      query.postType = postType;
    }
    if (department) {
      query.department = department;
    }
    if (batch) {
      query.batch = batch;
    }
    // Event section date filters for event posts
    if (postType === 'event' && (fromDate || toDate)) {
      const dateFilter = {};
      if (fromDate) dateFilter.$gte = fromDate;
      if (toDate) dateFilter.$lte = toDate;
      query['eventDetails.date'] = dateFilter;
    }

    const posts = await Post.find(query)
      .populate('author', 'name avatar type batch department studentInfo facultyInfo')
      .populate('comments.author', 'name avatar')
      .populate('likes', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    // Add likeIds field to each post for easier frontend checking
    const postsWithLikeIds = posts.map(post => {
      const postObj = post.toObject();
      postObj.likeIds = post.likes.map(like => like._id.toString());
      return postObj;
    });

    res.json({
      posts: postsWithLikeIds,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get a single post by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name avatar type batch department studentInfo facultyInfo')
      .populate('comments.author', 'name avatar')
      .populate('likes', 'name avatar');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Add likeIds field for easier frontend checking
    const postObj = post.toObject();
    postObj.likeIds = post.likes.map(like => like._id.toString());

    res.json(postObj);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Debug endpoint to test data parsing
router.post('/debug', authenticateToken, (req, res) => {
  console.log('Debug endpoint - Request body:', JSON.stringify(req.body, null, 2));
  console.log('Debug endpoint - Content-Type:', req.get('Content-Type'));
  console.log('Debug endpoint - Data types:', {
    jobDetails: typeof req.body.jobDetails,
    pollDetails: typeof req.body.pollDetails,
    eventDetails: typeof req.body.eventDetails
  });
  
  res.json({
    message: 'Debug data received',
    body: req.body,
    contentType: req.get('Content-Type'),
    dataTypes: {
      jobDetails: typeof req.body.jobDetails,
      pollDetails: typeof req.body.pollDetails,
      eventDetails: typeof req.body.eventDetails
    }
  });
});

// Create a new post
router.post('/', authenticateToken, upload.array('media', 5), async (req, res) => {
  try {
    console.log('Post creation request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Files:', req.files ? req.files.length : 0);
    
    const { 
      postType = 'general',
      title: originalTitle,
      content, 
      tags, 
      isPublic, 
      allowComments,
      jobDetails,
      pollDetails,
      eventDetails
    } = req.body;
    
    console.log('Post type:', postType);
    console.log('Job details:', jobDetails);
    console.log('Poll details:', pollDetails);
    console.log('Event details:', eventDetails);
    
    // Log the raw data types
    console.log('Data types - jobDetails:', typeof jobDetails);
    console.log('Data types - pollDetails:', typeof pollDetails);
    console.log('Data types - eventDetails:', typeof eventDetails);
    
    const userId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    // Determine title based on post type
    let title = originalTitle;
    if (postType === 'poll') {
      // Don't validate pollDetails here - wait until after parsing
      // The validation will happen in the poll details processing section
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let mediaFiles = [];
    
    // Handle file uploads to Cloudinary
    if (req.files && req.files.length > 0) {
      console.log('Processing', req.files.length, 'media files...');
      for (const file of req.files) {
        try {
          console.log('Uploading file:', file.originalname, 'Type:', file.mimetype);
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'alumni-network',
                resource_type: 'auto',
                public_id: `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, '')}`
              },
              (error, result) => {
                if (error) {
                  console.error('Cloudinary upload error:', error);
                  reject(error);
                } else {
                  console.log('File uploaded successfully:', result.secure_url);
                  resolve(result);
                }
              }
            );
            uploadStream.end(file.buffer);
          });

          mediaFiles.push({
            type: file.mimetype.startsWith('image/') ? 'image' : 
                  file.mimetype.startsWith('video/') ? 'video' : 'pdf',
            url: result.secure_url,
            filename: file.originalname,
            size: file.size,
            mimeType: file.mimetype
          });
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          console.error('Upload error details:', uploadError.message);
          return res.status(500).json({ 
            error: 'Failed to upload media file',
            details: uploadError.message 
          });
        }
      }
    }

    // Prepare post data based on type
    const postData = {
      author: userId,
      userType: user.type,
      batch: user.batch,
      department: user.department || 
                  user.studentInfo?.department || 
                  user.facultyInfo?.department || 
                  'Unknown Department',
      postType,
      title: title?.trim(),
      content: content.trim(),
      media: mediaFiles,
      tags: tags ? (Array.isArray(tags) ? tags.map(tag => tag.trim()) : 
                   typeof tags === 'string' ? (
                     // Try to parse as JSON first, then fall back to comma-separated
                      tags.startsWith('[') ? JSON.parse(tags).map(tag => tag.trim()) :
                      tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                   ) : 
                   []) : [],
      isPublic: isPublic !== 'false',
      allowComments: allowComments !== 'false'
    };

    // Add type-specific details
    if (postType === 'job' && jobDetails) {
      try {
        console.log('Raw jobDetails received:', jobDetails);
        const parsedJobDetails = typeof jobDetails === 'string' ? JSON.parse(jobDetails) : jobDetails;
        console.log('Parsed jobDetails:', parsedJobDetails);
        
        // Validate required job fields
        if (!parsedJobDetails.title || !parsedJobDetails.title.trim()) {
          console.error('Job validation failed - missing title');
          return res.status(400).json({ 
            error: 'Job title is required' 
          });
        }
        
        if (!parsedJobDetails.company || !parsedJobDetails.company.trim()) {
          console.error('Job validation failed - missing company');
          return res.status(400).json({ 
            error: 'Company name is required' 
          });
        }
        
        postData.jobDetails = parsedJobDetails;
        console.log('Job details processed successfully:', postData.jobDetails);
      } catch (error) {
        console.error('Error parsing job details:', error);
        return res.status(400).json({ error: 'Invalid job details format' });
      }
    }
    
    if (postType === 'poll' && pollDetails) {
      try {
        console.log('Raw pollDetails received:', pollDetails);
        const parsedPollDetails = typeof pollDetails === 'string' ? JSON.parse(pollDetails) : pollDetails;
        console.log('Parsed pollDetails:', parsedPollDetails);
        
        // Validate required poll fields
        if (!parsedPollDetails.question || !parsedPollDetails.question.trim()) {
          console.error('Poll validation failed - missing question');
          return res.status(400).json({ 
            error: 'Poll question is required' 
          });
        }
        
        if (!parsedPollDetails.options || !Array.isArray(parsedPollDetails.options) || parsedPollDetails.options.length < 2) {
          console.error('Poll validation failed - invalid options');
          return res.status(400).json({ 
            error: 'Poll must have at least 2 options' 
          });
        }
        
        // Process poll options
        if (parsedPollDetails.options && Array.isArray(parsedPollDetails.options)) {
          postData.pollDetails = {
            question: parsedPollDetails.question.trim(),
            options: parsedPollDetails.options.map((option, index) => ({
              id: `option_${index}`,
              text: option.trim(),
              votes: []
            })),
            totalVotes: 0,
            endDate: parsedPollDetails.endDate ? new Date(parsedPollDetails.endDate) : null,
            isActive: true
          };
          
          // Set title from poll question for poll posts
          postData.title = parsedPollDetails.question.trim();
          
          console.log('Poll details processed successfully:', postData.pollDetails);
        }
      } catch (error) {
        console.error('Error parsing poll details:', error);
        return res.status(400).json({ error: 'Invalid poll details format' });
      }
    }
    
    if (postType === 'event' && eventDetails) {
      try {
        console.log('Raw eventDetails received:', eventDetails);
        const parsedEventDetails = typeof eventDetails === 'string' ? JSON.parse(eventDetails) : eventDetails;
        console.log('Parsed eventDetails:', parsedEventDetails);
        
        // Ensure required fields are present
        if (!parsedEventDetails.title || !parsedEventDetails.title.trim()) {
          console.error('Event validation failed - missing title');
          return res.status(400).json({ 
            error: 'Event posts require title, date, and location' 
          });
        }
        
        if (!parsedEventDetails.date || !parsedEventDetails.date.trim()) {
          console.error('Event validation failed - missing date');
          return res.status(400).json({ 
            error: 'Event posts require title, date, and location' 
          });
        }
        
        if (!parsedEventDetails.location || !parsedEventDetails.location.trim()) {
          console.error('Event validation failed - missing location');
          return res.status(400).json({ 
            error: 'Event posts require title, date, and location' 
          });
        }
        
        // If time is not provided, extract it from date if it contains time
        if (!parsedEventDetails.time && parsedEventDetails.date) {
          const dateStr = parsedEventDetails.date;
          if (dateStr.includes(' ')) {
            const [datePart, timePart] = dateStr.split(' ');
            parsedEventDetails.date = datePart;
            parsedEventDetails.time = timePart;
          }
        }
        
        postData.eventDetails = parsedEventDetails;
        console.log('Event details processed successfully:', postData.eventDetails);
      } catch (error) {
        console.error('Error parsing event details:', error);
        return res.status(400).json({ error: 'Invalid event details format' });
      }
    }

    console.log('Creating post with data:', JSON.stringify(postData, null, 2));
    
    let post;
    try {
      post = new Post(postData);
      console.log('Post object created, attempting to save...');
      
      // Validate the post before saving
      const validationError = post.validateSync();
      if (validationError) {
        console.error('Post validation error:', validationError);
        console.error('Validation error details:', JSON.stringify(validationError.errors, null, 2));
        return res.status(400).json({ 
          error: 'Post validation failed',
          details: validationError.message,
          fieldErrors: validationError.errors
        });
      }
      
      await post.save();
      console.log('Post saved successfully:', post._id);
    } catch (saveError) {
      console.error('Error saving post:', saveError);
      console.error('Save error details:', saveError.message);
      console.error('Save error stack:', saveError.stack);
      
      // Check if it's a validation error
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({ 
          error: 'Post validation failed',
          details: saveError.message,
          fieldErrors: saveError.errors
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to save post',
        details: saveError.message 
      });
    }

    // Populate author info before sending response
    await post.populate('author', 'name avatar type batch department studentInfo facultyInfo');

    // realtime broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', { post, author: post.author, timestamp: new Date() });
      if (post.postType === 'event') {
        io.emit('event_post_created', { post });
      }
    }

    console.log('Post created successfully:', post._id);
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create post',
      details: error.message 
    });
  }
});

// Update a post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { content, tags, isPublic, allowComments } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    const updates = {};
    if (content !== undefined) updates.content = content.trim();
    if (tags !== undefined) updates.tags = tags.split(',').map(tag => tag.trim());
    if (isPublic !== undefined) updates.isPublic = isPublic;
    if (allowComments !== undefined) updates.allowComments = allowComments;

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      updates,
      { new: true, runValidators: true }
    ).populate('author', 'name avatar type batch department');

    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id; // Use req.user._id since that's what the auth middleware sets

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Fix the comparison by converting both to strings
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete media files from Cloudinary
    if (post.media && post.media.length > 0) {
      for (const media of post.media) {
        try {
          await cloudinary.uploader.destroy(media.url.split('/').pop().split('.')[0]);
        } catch (error) {
          console.error('Error deleting media from Cloudinary:', error);
        }
      }
    }

    await Post.findByIdAndDelete(postId);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Like/unlike a post (atomic, race-safe)
router.post('/:id/like', authenticateToken, async (req, res) => {
  const session = await Post.startSession();
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    console.log('🔄 Like request:', { postId, userId: userId.toString() });

    let liked = false;
    let authorId = null;
    let contentSnippet = '';

    await session.withTransaction(async () => {
      // Fetch minimal fields once inside the transaction
      const post = await Post.findById(postId).select('author content').session(session);
      if (!post) {
        console.log('❌ Post not found:', postId);
        throw new Error('POST_NOT_FOUND');
      }

      authorId = post.author;
      contentSnippet = (post.content || '').substring(0, 50) + '...';

      console.log('📊 Post found:', { postId, authorId: authorId.toString() });

      // Try to add like (only if not already liked)
      const add = await Post.updateOne(
        { _id: postId, likes: { $ne: userId } },
        { $addToSet: { likes: userId }, $set: { updatedAt: new Date() } },
        { session }
      );

      console.log('➕ Add like result:', { modifiedCount: add.modifiedCount, matchedCount: add.matchedCount });

      if (add.modifiedCount === 1) {
        liked = true;
        console.log('✅ Like added successfully');
      } else {
        // Was already liked → perform unlike
        const pull = await Post.updateOne(
          { _id: postId, likes: userId },
          { $pull: { likes: userId }, $set: { updatedAt: new Date() } },
          { session }
        );
        liked = false;
        console.log('➖ Unlike result:', { modifiedCount: pull.modifiedCount, matchedCount: pull.matchedCount });
        
        if (pull.matchedCount === 0) {
          // The post may not exist or state changed; validate existence for clarity
          const exists = await Post.exists({ _id: postId }).session(session);
          if (!exists) throw new Error('POST_NOT_FOUND');
        }
      }
    });

    // Get updated like data
    const [rawPost, populated] = await Promise.all([
      Post.findById(req.params.id).select('likes'),
      Post.findById(req.params.id).select('likes').populate('likes', 'name avatar')
    ]);

    if (!rawPost) {
      console.log('❌ Post not found after transaction:', req.params.id);
      return res.status(404).json({ error: 'Post not found' });
    }

    console.log('📊 Final like count:', rawPost.likes.length);

    // Notification only when newly liked and not your own post
    if (liked && authorId && authorId.toString() !== req.user._id.toString()) {
      try {
        const createdNotification = await NotificationService.createPostLikeNotification(
          req.user._id,
          authorId,
          req.params.id,
          contentSnippet
        );
        const io = req.app.get('io');
        if (io && createdNotification) {
          io.to(`user_${authorId}`).emit('new_notification', {
            notification: createdNotification,
            timestamp: new Date()
          });
        }
      } catch (notifyErr) {
        console.error('Failed to create/emits like notification:', notifyErr.message);
      }
    }

    const response = {
      liked,
      likeCount: rawPost.likes.length,
      likes: (populated?.likes) || [],
      likeIds: rawPost.likes
    };

    console.log('✅ Like response:', response);
    return res.json(response);
  } catch (error) {
    if (error && error.message === 'POST_NOT_FOUND') {
      return res.status(404).json({ error: 'Post not found' });
    }
    console.error('Error toggling like (atomic):', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  } finally {
    session.endSession();
  }
});

// Add a comment to a post
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.allowComments) {
      return res.status(400).json({ error: 'Comments are disabled for this post' });
    }

    const comment = {
      author: userId,
      content: content.trim(),
      likes: []
    };

    post.comments.push(comment);
    await post.save();

    // Populate comment author info
    await post.populate('comments.author', 'name avatar');

    const newComment = post.comments[post.comments.length - 1];
    // notification to post author on comment
    if (post.author.toString() !== userId.toString()) {
      console.log(`Creating notification for post comment: ${post.author} from ${userId}`);
      const createdNotification = await NotificationService.createPostCommentNotification(
        userId,
        post.author,
        post._id,
        post.content.substring(0, 50) + '...',
        content.trim()
      );
      console.log(`Comment notification created:`, createdNotification._id);
      
      const io = req.app.get('io');
      if (io) {
        console.log(`Emitting comment notification to user_${post.author}`);
        io.to(`user_${post.author}`).emit('new_notification', {
          notification: createdNotification,
          timestamp: new Date()
        });
        console.log(`Comment notification emitted successfully`);
      } else {
        console.error('Socket.io instance not found for comment notification');
      }
    }

    // Real-time broadcast comment update
    const io = req.app.get('io');
    if (io) {
      io.emit('post_comment_added', {
        postId: postId,
        comment: newComment,
        commentCount: post.comments.length,
        timestamp: new Date()
      });
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Vote on a poll
router.post('/:id/poll-vote', authenticateToken, async (req, res) => {
  try {
    const { optionId } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    console.log('Poll vote request:', { optionId, postId, userId });

    if (!optionId) {
      return res.status(400).json({ error: 'Option ID is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.postType !== 'poll') {
      return res.status(400).json({ error: 'This post is not a poll' });
    }

    if (!post.pollDetails || !post.pollDetails.options) {
      return res.status(400).json({ error: 'Poll options not found' });
    }

    console.log('Poll options:', post.pollDetails.options);

    // Check if poll has ended (handle both date-only and datetime formats)
    if (post.pollDetails.endDate) {
      const endDate = new Date(post.pollDetails.endDate);
      const now = new Date();
      if (isNaN(endDate.getTime())) {
        console.error('Invalid endDate format:', post.pollDetails.endDate);
      } else if (endDate <= now) {
        return res.status(400).json({ error: 'Poll has ended' });
      }
    }

    // Find the option by id or _id (support both formats)
    // Convert optionId to string for comparison
    const optionIdStr = String(optionId);
    const option = post.pollDetails.options.find(opt => {
      // Check both id (string) and _id (ObjectId or string)
      const optId = String(opt.id || '');
      const optMongoId = opt._id ? String(opt._id) : '';
      return optId === optionIdStr || optMongoId === optionIdStr;
    });
    if (!option) {
      console.log('Option not found for ID:', optionId);
      console.log('Available options:', post.pollDetails.options.map(opt => ({ id: opt.id, _id: opt._id, text: opt.text })));
      return res.status(400).json({ error: 'Invalid option' });
    }

    console.log('Found option:', option);

    // Check if user is clicking the same option they already voted for (remove vote)
    // IMPORTANT: Check BEFORE removing votes, as we need to know if this was the current vote
    const isCurrentVote = option.votes && option.votes.includes(userId.toString());
    
    // Check if user has voted before (to determine action type)
    let hasVotedBefore = false;
    post.pollDetails.options.forEach(opt => {
      if (opt.votes && opt.votes.includes(userId.toString())) {
        hasVotedBefore = true;
      }
    });
    
    // Mutable voting: Remove user's vote from all options first (if they voted before)
    let previousVoteRemoved = false;
    post.pollDetails.options.forEach(opt => {
      if (opt.votes && opt.votes.includes(userId.toString())) {
        opt.votes = opt.votes.filter(vote => vote !== userId.toString());
        previousVoteRemoved = true;
      }
    });

    // Initialize voteHistory if it doesn't exist (handle old posts without voteHistory)
    if (!post.pollDetails.voteHistory) {
      post.pollDetails.voteHistory = [];
    }
    
    // Ensure voteHistory is an array (defensive check)
    if (!Array.isArray(post.pollDetails.voteHistory)) {
      post.pollDetails.voteHistory = [];
    }

    // If user clicked the same option they already voted for, just remove the vote (don't add it back)
    if (isCurrentVote) {
      // Vote has already been removed above, just update total votes
      if (post.pollDetails.totalVotes > 0) {
        post.pollDetails.totalVotes = post.pollDetails.totalVotes - 1;
      }
      // Record vote removal in history
      post.pollDetails.voteHistory.push({
        userId: userId,
        optionId: optionIdStr,
        action: 'vote_removed',
        timestamp: new Date()
      });
      // Don't add the vote back - user is removing their vote
    } else {
      // User is voting on a different option (or voting for the first time)
      // If user was switching votes, don't increment total (they already had a vote)
      // If this is a new vote, increment total
      if (!previousVoteRemoved) {
        post.pollDetails.totalVotes = (post.pollDetails.totalVotes || 0) + 1;
        // Record new vote
        post.pollDetails.voteHistory.push({
          userId: userId,
          optionId: optionIdStr,
          action: 'voted',
          timestamp: new Date()
        });
      } else {
        // Record vote update
        post.pollDetails.voteHistory.push({
          userId: userId,
          optionId: optionIdStr,
          action: 'vote_updated',
          timestamp: new Date()
        });
      }

      // Add vote to the selected option
      if (!option.votes) {
        option.votes = [];
      }
      // Only add if not already there (shouldn't happen after removal, but safety check)
      if (!option.votes.includes(userId.toString())) {
        option.votes.push(userId.toString());
      }
    }

    await post.save();

    // Populate the updated post
    await post.populate('author', 'name avatar');

    // Real-time broadcast poll update
    const io = req.app.get('io');
    if (io) {
      io.emit('poll_vote_updated', {
        postId: post._id,
        pollDetails: post.pollDetails,
        totalVotes: post.pollDetails.totalVotes,
        timestamp: new Date()
      });
    }

    // Return the full updated post for frontend consistency
    const updatedPost = await Post.findById(postId)
      .populate('author', 'name avatar type department batch')
      .lean();

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found after update' });
    }

    res.json(updatedPost);

  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({ error: 'Failed to vote on poll' });
  }
});

// Like/unlike a comment
router.post('/:postId/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex > -1) {
      // Unlike
      comment.likes.splice(likeIndex, 1);
    } else {
      // Like
      comment.likes.push(userId);
    }

    await post.save();
    await comment.populate('likes', 'name avatar');

    res.json({ 
      liked: likeIndex === -1,
      likeCount: comment.likes.length,
      likes: comment.likes
    });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ error: 'Failed to toggle comment like' });
  }
});

// Delete a comment
router.delete('/:postId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    console.log('🗑️ Deleting comment:', { postId, commentId, userId });
    console.log('🔍 Comment ID type:', typeof commentId);
    console.log('🔍 Comment ID length:', commentId?.length);
    console.log('🔍 Comment ID value:', commentId);
    console.log('🔍 User ID type:', typeof userId);
    console.log('🔍 User ID value:', userId);

    const post = await Post.findById(postId);
    if (!post) {
      console.log('❌ Post not found:', postId);
      return res.status(404).json({ error: 'Post not found' });
    }

    console.log('📝 Post found, comments count:', post.comments.length);
    console.log('🔍 Looking for comment ID:', commentId);
    console.log('📋 Available comment IDs:', post.comments.map(c => ({ id: c._id.toString(), type: typeof c._id })));

    // Find the comment index using multiple methods
    let commentIndex = -1;
    let comment = null;
    
    // Method 1: Try using .id() method (handles both _id and commentId)
    try {
      comment = post.comments.id(commentId);
      commentIndex = post.comments.findIndex(c => c._id.toString() === comment._id.toString());
      console.log('✅ Found comment using .id() method, index:', commentIndex);
    } catch (error) {
      console.log('❌ .id() method failed:', error.message);
    }

    // Method 2: Try finding by _id (MongoDB default field)
    if (commentIndex === -1) {
      commentIndex = post.comments.findIndex(c => c._id.toString() === commentId);
      if (commentIndex !== -1) {
        comment = post.comments[commentIndex];
        console.log('✅ Found comment by _id, index:', commentIndex);
      } else {
        console.log('❌ Comment not found by _id');
      }
    }

    // Method 3: Try finding by commentId field (custom field)
    if (commentIndex === -1) {
      commentIndex = post.comments.findIndex(c => c.commentId && c.commentId.toString() === commentId);
      if (commentIndex !== -1) {
        comment = post.comments[commentIndex];
        console.log('✅ Found comment by commentId field, index:', commentIndex);
      } else {
        console.log('❌ Comment not found by commentId field');
      }
    }

    // Method 4: Try finding by ObjectId conversion (handle malformed IDs)
    if (commentIndex === -1) {
      try {
        const objectId = new mongoose.Types.ObjectId(commentId);
        commentIndex = post.comments.findIndex(c => 
          c._id.equals(objectId) || 
          (c.commentId && c.commentId.equals(objectId))
        );
        if (commentIndex !== -1) {
          comment = post.comments[commentIndex];
          console.log('✅ Found comment by ObjectId conversion, index:', commentIndex);
        } else {
          console.log('❌ Comment not found by ObjectId conversion');
        }
      } catch (error) {
        console.log('❌ ObjectId conversion failed:', error.message);
      }
    }

    // Method 5: Try partial match
    if (commentIndex === -1) {
      commentIndex = post.comments.findIndex(c => 
        c._id.toString().includes(commentId) || 
        (c.commentId && c.commentId.toString().includes(commentId))
      );
      if (commentIndex !== -1) {
        comment = post.comments[commentIndex];
        console.log('✅ Found comment by partial match, index:', commentIndex);
      } else {
        console.log('❌ Comment not found by partial match');
      }
    }

    if (commentIndex === -1 || !comment) {
      console.log('❌ Comment not found with any method:', commentId);
      console.log('🔍 Available comment IDs (_id):', post.comments.map(c => c._id.toString()));
      console.log('🔍 Available comment IDs (commentId):', post.comments.map(c => c.commentId ? c.commentId.toString() : 'No commentId'));
      return res.status(404).json({ error: 'Comment not found' });
    }

    console.log('✅ Comment found, author:', comment.author.toString());
    console.log('👤 User ID:', userId.toString());

    if (comment.author.toString() !== userId.toString()) {
      console.log('❌ Unauthorized: User cannot delete this comment');
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Remove the comment by index using splice
    post.comments.splice(commentIndex, 1);
    await post.save();

    console.log('✅ Comment deleted successfully');
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Share post
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { groupId } = req.body; // Optional: share to specific group

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user has already shared this post
    const alreadyShared = post.shares.some(share => 
      share.userId.toString() === userId.toString()
    );

    if (alreadyShared) {
      return res.status(400).json({ error: 'You have already shared this post' });
    }

    // Add share to original post
    post.shares.push({
      userId: userId,
      sharedAt: new Date()
    });
    await post.save();

    // If sharing to a group, create a new post in that group
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Check if user is member of the group
      const isMember = group.members.some(member => 
        member.userId.toString() === userId.toString()
      );

      if (!isMember) {
        return res.status(403).json({ error: 'You must be a member to share to this group' });
      }

      // Create shared post in group
      const sharedPost = new Post({
        author: userId,
        userType: req.user.type,
        batch: req.user.batch,
        department: req.user.department,
        postType: 'general',
        content: `Shared: ${post.content}`,
        media: post.media,
        tags: post.tags,
        groupId: groupId,
        isShared: true,
        originalPostId: postId
      });

      await sharedPost.save();

      // Add post to group
      group.posts.push(sharedPost._id);
      await group.save();
    }

    // Create notification for post author
    await NotificationService.createPostSharedNotification(
      userId,
      post.author,
      post._id,
      post.content.substring(0, 50) + '...'
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('post_shared', {
        postId: post._id,
        sharedBy: userId,
        shareCount: post.shares.length
      });
    }

    res.json({ 
      message: 'Post shared successfully', 
      shareCount: post.shares.length 
    });
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ error: 'Failed to share post' });
  }
});

// Export poll data to Excel (MUST come before /:id/poll-data route)
router.get('/:id/poll-data/excel', authenticateToken, async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.postType !== 'poll') {
      return res.status(400).json({ error: 'This post is not a poll' });
    }

    // Check if poll has ended (handle both date-only and datetime formats)
    let isPollEnded = false;
    if (post.pollDetails?.endDate) {
      try {
        const endDate = new Date(post.pollDetails.endDate);
        if (!isNaN(endDate.getTime())) {
          isPollEnded = endDate <= new Date();
        }
      } catch (error) {
        console.error('Error parsing endDate:', error);
      }
    }
    if (!isPollEnded) {
      return res.status(400).json({ error: 'Poll has not ended yet' });
    }

    // Check if user is the author
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the poll creator can download voting data' });
    }

    // Get all unique user IDs from vote history (handle missing voteHistory)
    const voteHistory = post.pollDetails.voteHistory || [];
    const userIds = [...new Set(voteHistory.map(vh => vh.userId.toString()))];
    
    // Fetch user details
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email type department batch studentInfo facultyInfo')
      .lean();

    // Create a map of user data
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = {
        name: user.name || 'Unknown',
        email: user.email || 'N/A',
        type: user.type || 'N/A',
        department: user.department || user.studentInfo?.department || user.facultyInfo?.department || 'N/A',
        batch: user.batch || user.studentInfo?.batch || 'N/A',
        rollNumber: user.studentInfo?.rollNumber || (user.type === 'student' ? 'N/A' : user.type)
      };
    });

    // Build voting data
    const votingData = [];
    voteHistory.forEach(vote => {
      const user = userMap[vote.userId.toString()] || {
        name: 'Unknown',
        email: 'N/A',
        type: 'N/A',
        department: 'N/A',
        batch: 'N/A',
        rollNumber: 'N/A'
      };

      const option = post.pollDetails.options.find(opt => 
        String(opt.id || opt._id) === vote.optionId
      );

      votingData.push({
        'Profile Name': user.name,
        'Department': user.department,
        'Batch Number': user.batch,
        'College Mail ID': user.email,
        'Roll Number': user.rollNumber,
        'Time Voted': new Date(vote.timestamp).toLocaleString(),
        'Action': vote.action === 'voted' ? 'Voted' : vote.action === 'vote_updated' ? 'Vote Updated' : 'Vote Removed',
        'Option Selected': option ? option.text : 'N/A'
      });
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(votingData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Poll Voting Data');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="poll-data-${postId}.xlsx"`);

    // Send Excel file
    res.send(excelBuffer);

  } catch (error) {
    console.error('Error exporting poll data to Excel:', error);
    res.status(500).json({ error: 'Failed to export poll data' });
  }
});

// Get poll voting data for JSON export
router.get('/:id/poll-data', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.postType !== 'poll') {
      return res.status(400).json({ error: 'This post is not a poll' });
    }

    // Check if poll has ended (handle both date-only and datetime formats)
    let isPollEnded = false;
    if (post.pollDetails?.endDate) {
      try {
        const endDate = new Date(post.pollDetails.endDate);
        if (!isNaN(endDate.getTime())) {
          isPollEnded = endDate <= new Date();
        }
      } catch (error) {
        console.error('Error parsing endDate:', error);
      }
    }
    if (!isPollEnded) {
      return res.status(400).json({ error: 'Poll has not ended yet' });
    }

    // Check if user is the author
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the poll creator can download voting data' });
    }

    // Get all unique user IDs from vote history
    const userIds = [...new Set(post.pollDetails.voteHistory.map(vh => vh.userId.toString()))];
    
    // Fetch user details
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email type department batch studentInfo facultyInfo')
      .lean();

    // Create a map of user data
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = {
        name: user.name || 'Unknown',
        email: user.email || 'N/A',
        type: user.type || 'N/A',
        department: user.department || user.studentInfo?.department || user.facultyInfo?.department || 'N/A',
        batch: user.batch || user.studentInfo?.batch || 'N/A',
        rollNumber: user.studentInfo?.rollNumber || (user.type === 'student' ? 'N/A' : user.type)
      };
    });

    // Build voting data
    const votingData = [];
    post.pollDetails.voteHistory.forEach(vote => {
      const user = userMap[vote.userId.toString()] || {
        name: 'Unknown',
        email: 'N/A',
        type: 'N/A',
        department: 'N/A',
        batch: 'N/A',
        rollNumber: 'N/A'
      };

      const option = post.pollDetails.options.find(opt => 
        String(opt.id || opt._id) === vote.optionId
      );

      votingData.push({
        'Profile Name': user.name,
        'Department': user.department,
        'Batch Number': user.batch,
        'College Mail ID': user.email,
        'Roll Number': user.rollNumber,
        'Time Voted': new Date(vote.timestamp).toLocaleString(),
        'Action': vote.action === 'voted' ? 'Voted' : vote.action === 'vote_updated' ? 'Vote Updated' : 'Vote Removed',
        'Option Selected': option ? option.text : 'N/A'
      });
    });

    res.json({
      pollQuestion: post.pollDetails.question,
      votingData: votingData
    });

  } catch (error) {
    console.error('Error fetching poll data:', error);
    res.status(500).json({ error: 'Failed to fetch poll data' });
  }
});


module.exports = router;
