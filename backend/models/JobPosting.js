const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema({
  // Company Information
  companyName: { type: String, required: true, trim: true },
  industry: { type: String, trim: true },
  location: { type: String, required: true, trim: true },
  companyDescription: { type: String, trim: true },
  companyLogo: { type: String, trim: true },

  // Job Position Details
  title: { type: String, required: true, trim: true },
  jobType: { type: String, enum: ['full-time', 'part-time', 'internship', 'contract', 'freelance'], required: true },

  // Compensation & Benefits
  salaryRange: { type: String, trim: true },
  benefits: { type: [String], default: [] },
  referralBonus: { type: String, trim: true },

  // Requirements & Eligibility
  skillsRequired: { type: [String], default: [] },
  cgpaCutoff: { type: String, trim: true },
  eligibleBranches: { type: [String], default: [] },
  experienceLevel: { type: String, trim: true },
  eligibilityCriteria: { type: String, trim: true },

  // Application Process
  deadline: { type: Date },
  applicationLink: { type: String, trim: true },
  hiringTimeline: { type: String, trim: true },
  contactEmail: { type: String, required: true, trim: true, lowercase: true },

  // Interview Process
  interviewRounds: { type: Number, default: 0 },
  interviewDetails: [{
    roundName: String,
    duration: String,
    tips: String,
    mode: { type: String, enum: ['online', 'offline', 'hybrid'] }
  }],

  // Meta
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('JobPosting', jobPostingSchema);
