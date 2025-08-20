const express = require('express');
const JobPosting = require('../models/JobPosting');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all job postings with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, jobType, location, industry, search, skills, branches, experienceLevel, from, to } = req.query;
    
    let query = { isActive: true };
    
    // Add filters
    if (jobType) query.jobType = jobType;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (industry) query.industry = { $regex: industry, $options: 'i' };
    if (experienceLevel) query.experienceLevel = { $regex: experienceLevel, $options: 'i' };
    if (skills) query.skillsRequired = { $in: skills.split(',').map(s => s.trim()) };
    if (branches) query.eligibleBranches = { $in: branches.split(',').map(b => b.trim()) };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { companyDescription: { $regex: search, $options: 'i' } },
        { eligibilityCriteria: { $regex: search, $options: 'i' } }
      ];
    }

    const jobPostings = await JobPosting.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalJobs = await JobPosting.countDocuments(query);

    res.json({
      jobPostings,
      currentPage: page,
      totalPages: Math.ceil(totalJobs / limit),
      totalJobs
    });
  } catch (error) {
    console.error('Error fetching job postings:', error);
    res.status(500).json({ error: 'Failed to fetch job postings' });
  }
});

// Get a specific job posting
router.get('/:id', async (req, res) => {
  try {
    const jobPosting = await JobPosting.findById(req.params.id);

    if (!jobPosting) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    res.json(jobPosting);
  } catch (error) {
    console.error('Error fetching job posting:', error);
    res.status(500).json({ error: 'Failed to fetch job posting' });
  }
});

// Create a new job posting
router.post('/', authenticateToken, async (req, res) => {
  try {
    const job = req.body;
    
    const newJob = new JobPosting({
      companyName: job.companyName,
      industry: job.industry,
      location: job.location,
      companyDescription: job.companyDescription,
      companyLogo: job.companyLogo,
      title: job.title,
      jobType: job.jobType,
      salaryRange: job.salaryRange,
      benefits: job.benefits || [],
      referralBonus: job.referralBonus,
      skillsRequired: job.skillsRequired || [],
      cgpaCutoff: job.cgpaCutoff,
      eligibleBranches: job.eligibleBranches || [],
      experienceLevel: job.experienceLevel,
      eligibilityCriteria: job.eligibilityCriteria,
      deadline: job.deadline,
      applicationLink: job.applicationLink,
      hiringTimeline: job.hiringTimeline,
      contactEmail: job.contactEmail,
      interviewRounds: job.interviewRounds || 0,
      interviewDetails: job.interviewDetails || [],
      postedBy: req.user._id
    });
    
    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (error) {
    console.error('Error creating job posting:', error);
    res.status(500).json({ error: 'Failed to create job posting' });
  }
});

// Update a job posting (poster only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const update = req.body;
    
    const jobPosting = await JobPosting.findById(req.params.id);
    if (!jobPosting) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    if (jobPosting.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this job posting' });
    }

    Object.assign(jobPosting, update);
    jobPosting.updatedAt = new Date();
    
    const updatedJob = await jobPosting.save();
    res.json(updatedJob);
  } catch (error) {
    console.error('Error updating job posting:', error);
    res.status(500).json({ error: 'Failed to update job posting' });
  }
});

// Delete a job posting (poster only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const jobPosting = await JobPosting.findById(req.params.id);
    
    if (!jobPosting) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    if (jobPosting.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this job posting' });
    }

    await JobPosting.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job posting deleted successfully' });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    res.status(500).json({ error: 'Failed to delete job posting' });
  }
});

// Apply to a job (mark as applied)
router.post('/:id/apply', authenticateToken, async (req, res) => {
  try {
    const jobPosting = await JobPosting.findById(req.params.id);
    
    if (!jobPosting) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    if (!jobPosting.isActive) {
      return res.status(400).json({ error: 'This job posting is no longer active' });
    }

    // Create a placement application notification for poster
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: jobPosting.postedBy,
      sender: req.user._id,
      type: 'placement_application',
      title: 'New Job Application',
      message: `${req.user.name} applied for ${jobPosting.title} at ${jobPosting.companyName}`,
      category: 'placement',
      actionData: { placementId: jobPosting._id, userId: req.user._id }
    });
    const updatedJob = jobPosting; // no applicants array in schema anymore
    
    res.json({ message: 'Application submitted successfully', jobPosting: updatedJob });
  } catch (error) {
    console.error('Error applying to job:', error);
    res.status(500).json({ error: 'Failed to apply to job' });
  }
});

// Get job postings by company
router.get('/company/:companyName', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const jobPostings = await JobPosting.find({
      companyName: { $regex: req.params.companyName, $options: 'i' },
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const totalJobs = await JobPosting.countDocuments({
      companyName: { $regex: req.params.companyName, $options: 'i' },
      isActive: true
    });

    res.json({
      jobPostings,
      currentPage: page,
      totalPages: Math.ceil(totalJobs / limit),
      totalJobs
    });
  } catch (error) {
    console.error('Error fetching company job postings:', error);
    res.status(500).json({ error: 'Failed to fetch company job postings' });
  }
});

// Get job postings by location
router.get('/location/:location', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const jobPostings = await JobPosting.find({
      location: { $regex: req.params.location, $options: 'i' },
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const totalJobs = await JobPosting.countDocuments({
      location: { $regex: req.params.location, $options: 'i' },
      isActive: true
    });

    res.json({
      jobPostings,
      currentPage: page,
      totalPages: Math.ceil(totalJobs / limit),
      totalJobs
    });
  } catch (error) {
    console.error('Error fetching location job postings:', error);
    res.status(500).json({ error: 'Failed to fetch location job postings' });
  }
});

// Get recent job postings
router.get('/recent/jobs', async (req, res) => {
  try {
    const recentJobs = await JobPosting.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json(recentJobs);
  } catch (error) {
    console.error('Error fetching recent job postings:', error);
    res.status(500).json({ error: 'Failed to fetch recent job postings' });
  }
});

module.exports = router;
