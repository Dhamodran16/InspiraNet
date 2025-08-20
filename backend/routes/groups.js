const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Post = require('../models/Post');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Create a new group (only alumni & faculty can create)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPrivate = false, allowStudentJoin = true, tags = [], rules = [] } = req.body;
    const currentUser = req.user;

    // Check if user can create groups (only alumni & faculty)
    if (currentUser.type === 'student') {
      return res.status(403).json({ 
        error: 'Students cannot create groups. Only alumni and faculty can create groups.' 
      });
    }

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Check if group name already exists
    const existingGroup = await Group.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingGroup) {
      return res.status(400).json({ error: 'Group name already exists' });
    }

    // Create new group
    const group = new Group({
      name,
      description,
      createdBy: currentUser._id,
      isPrivate,
      allowStudentJoin,
      tags,
      rules
    });

    await group.save();

    // Populate creator info
    await group.populate('createdBy', 'name avatar type department');

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get all groups (public groups or groups user is member of)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tag } = req.query;
    const skip = (page - 1) * limit;
    const currentUser = req.user;

    // Build query
    const query = { isActive: true };
    
    // If user is student, only show groups that allow student join
    if (currentUser.type === 'student') {
      query.allowStudentJoin = true;
    }

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by tag
    if (tag) {
      query.tags = { $in: [tag] };
    }

    // Get groups user can see (public or member)
    const userGroups = await Group.find({
      $or: [
        { isPrivate: false },
        { 'members.userId': currentUser._id }
      ]
    }).select('_id');

    const userGroupIds = userGroups.map(g => g._id);
    query._id = { $in: userGroupIds };

    const groups = await Group.find(query)
      .populate('createdBy', 'name avatar type department')
      .populate('members.userId', 'name avatar type department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Group.countDocuments(query);

    res.json({
      groups,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page < Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get group by ID
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUser = req.user;

    const group = await Group.findById(groupId)
      .populate('createdBy', 'name avatar type department')
      .populate('members.userId', 'name avatar type department')
      .populate('posts');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user can access the group
    const isMember = group.members.some(member => 
      member.userId._id.toString() === currentUser._id.toString()
    );

    if (group.isPrivate && !isMember) {
      return res.status(403).json({ error: 'Access denied. This is a private group.' });
    }

    // Check if user is member
    const userMember = group.members.find(member => 
      member.userId._id.toString() === currentUser._id.toString()
    );

    res.json({
      group,
      isMember: !!userMember,
      userRole: userMember?.role || null
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Join group
router.post('/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUser = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if group is active
    if (!group.isActive) {
      return res.status(400).json({ error: 'Group is not active' });
    }

    // Check if user is already a member
    const isAlreadyMember = group.members.some(member => 
      member.userId.toString() === currentUser._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ error: 'Group is full' });
    }

    // Check if students can join
    if (currentUser.type === 'student' && !group.allowStudentJoin) {
      return res.status(403).json({ error: 'Students cannot join this group' });
    }

    // Add user to group
    group.members.push({
      userId: currentUser._id,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    res.json({ message: 'Successfully joined the group' });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Leave group
router.post('/:groupId/leave', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUser = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member
    const memberIndex = group.members.findIndex(member => 
      member.userId.toString() === currentUser._id.toString()
    );

    if (memberIndex === -1) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    // Check if user is the creator (admin)
    const isCreator = group.createdBy.toString() === currentUser._id.toString();
    if (isCreator) {
      return res.status(400).json({ error: 'Group creator cannot leave. Transfer ownership or delete the group.' });
    }

    // Remove user from group
    group.members.splice(memberIndex, 1);
    await group.save();

    res.json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Create post in group
router.post('/:groupId/posts', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, media = [], tags = [] } = req.body;
    const currentUser = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some(member => 
      member.userId.toString() === currentUser._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member to post in this group' });
    }

    // Create post
    const post = new Post({
      author: currentUser._id,
      userType: currentUser.type,
      batch: currentUser.batch,
      department: currentUser.department,
      postType: 'general',
      content,
      media,
      tags,
      groupId: groupId // Add group reference
    });

    await post.save();

    // Add post to group
    group.posts.push(post._id);
    await group.save();

    // Populate author info
    await post.populate('author', 'name avatar type department');

    res.status(201).json({
      message: 'Post created successfully in group',
      post
    });
  } catch (error) {
    console.error('Error creating group post:', error);
    res.status(500).json({ error: 'Failed to create post in group' });
  }
});

// Get group posts
router.get('/:groupId/posts', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const currentUser = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user can access the group
    const isMember = group.members.some(member => 
      member.userId.toString() === currentUser._id.toString()
    );

    if (group.isPrivate && !isMember) {
      return res.status(403).json({ error: 'Access denied. This is a private group.' });
    }

    // Get posts for this group
    const posts = await Post.find({ groupId })
      .populate('author', 'name avatar type department')
      .populate('comments.author', 'name avatar type department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Post.countDocuments({ groupId });

    res.json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: page < Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching group posts:', error);
    res.status(500).json({ error: 'Failed to fetch group posts' });
  }
});

// Update group (only admin can update)
router.put('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, isPrivate, allowStudentJoin, tags, rules } = req.body;
    const currentUser = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is admin
    const userMember = group.members.find(member => 
      member.userId.toString() === currentUser._id.toString()
    );

    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can update group settings' });
    }

    // Update group
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (typeof isPrivate === 'boolean') updateData.isPrivate = isPrivate;
    if (typeof allowStudentJoin === 'boolean') updateData.allowStudentJoin = allowStudentJoin;
    if (tags) updateData.tags = tags;
    if (rules) updateData.rules = rules;

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      updateData,
      { new: true }
    ).populate('createdBy', 'name avatar type department')
     .populate('members.userId', 'name avatar type department');

    res.json({
      message: 'Group updated successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete group (only admin can delete)
router.delete('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUser = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is admin
    const userMember = group.members.find(member => 
      member.userId.toString() === currentUser._id.toString()
    );

    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can delete the group' });
    }

    // Delete all posts in the group
    await Post.deleteMany({ groupId });

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

module.exports = router;

