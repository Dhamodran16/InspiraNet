const mongoose = require('mongoose');

const placementExperienceSchema = new mongoose.Schema({
  // Student information
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Company information
  company: {
    type: String,
    required: true,
    trim: true
  },
  
  position: {
    type: String,
    required: true,
    trim: true
  },
  
  // Interview details
  interviewDate: {
    type: Date,
    required: true
  },
  
  rounds: [{
    type: String,
    trim: true
  }],
  
  result: {
    type: String,
    enum: ['Selected', 'Not Selected', 'Pending', 'Rejected'],
    required: true
  },
  
  package: {
    type: String,
    trim: true
  },
  
  feedback: {
    type: String,
    trim: true
  },
  
  skills: {
    type: String,
    trim: true
  },
  
  batch: {
    type: String,
    trim: true
  },
  
  department: {
    type: String,
    trim: true
  },
  
  // Enhanced fields
  companyType: {
    type: String,
    enum: ['startup', 'midsize', 'enterprise', 'government'],
    default: 'enterprise'
  },
  
  companySize: {
    type: String,
    enum: ['1-50', '51-200', '201-1000', '1000+'],
    default: '1000+'
  },
  
  workMode: {
    type: String,
    enum: ['on-site', 'remote', 'hybrid'],
    default: 'on-site'
  },
  
  location: {
    type: String,
    trim: true
  },
  
  experienceRequired: {
    type: String,
    trim: true
  },
  
  interviewDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'very-hard'],
    default: 'medium'
  },
  
  preparationTime: {
    type: String,
    trim: true
  },
  
  interviewDuration: {
    type: String,
    trim: true
  },
  
  totalCandidates: {
    type: Number,
    default: 0
  },
  
  selectedCandidates: {
    type: Number,
    default: 0
  },
  
  selectionRate: {
    type: Number,
    default: 0
  },
  
  benefits: [{
    type: String,
    trim: true
  }],
  
  workCulture: {
    type: String,
    trim: true
  },
  
  growthOpportunities: {
    type: String,
    trim: true
  },
  
  challenges: {
    type: String,
    trim: true
  },
  
  tips: {
    type: String,
    trim: true
  },
  
  resume: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
placementExperienceSchema.index({ student: 1, createdAt: -1 });
placementExperienceSchema.index({ company: 1 });
placementExperienceSchema.index({ result: 1 });
placementExperienceSchema.index({ batch: 1 });
placementExperienceSchema.index({ department: 1 });

// Virtual for selection rate calculation
placementExperienceSchema.virtual('calculatedSelectionRate').get(function() {
  if (this.totalCandidates > 0) {
    return Math.round((this.selectedCandidates / this.totalCandidates) * 100);
  }
  return 0;
});

// Pre-save middleware to calculate selection rate
placementExperienceSchema.pre('save', function(next) {
  if (this.totalCandidates > 0) {
    this.selectionRate = Math.round((this.selectedCandidates / this.totalCandidates) * 100);
  }
  next();
});

// Method to get formatted package
placementExperienceSchema.methods.getFormattedPackage = function() {
  if (!this.package) return 'Not specified';
  return this.package;
};

// Method to get interview difficulty level
placementExperienceSchema.methods.getDifficultyLevel = function() {
  const levels = {
    'easy': 'Beginner Friendly',
    'medium': 'Moderate',
    'hard': 'Challenging',
    'very-hard': 'Expert Level'
  };
  return levels[this.interviewDifficulty] || 'Moderate';
};

module.exports = mongoose.model('Placement', placementExperienceSchema);














































