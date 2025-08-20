const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const Placement = require('../models/Placement');

// Get all placement experiences
router.get('/', authenticateToken, async (req, res) => {
  try {
    const experiences = await Placement.find()
      .sort({ createdAt: -1 })
      .populate('student', 'name batch department');
    
    res.json({
      experiences,
      total: experiences.length,
      message: 'Placement experiences loaded successfully'
    });
  } catch (error) {
    console.error('Error fetching placement experiences:', error);
    res.status(500).json({ error: 'Failed to fetch placement experiences' });
  }
});

// Create new placement experience
router.post('/', authenticateToken, async (req, res) => {
  try {
    const experienceData = req.body;
    
    const newExperience = new Placement({
      ...experienceData,
      student: req.user._id,
      interviewDate: experienceData.interviewDate || new Date()
    });
    
    await newExperience.save();
    
    // Populate student information
    await newExperience.populate('student', 'name batch department');
    
    res.status(201).json({
      message: 'Placement experience created successfully',
      experience: newExperience
    });
  } catch (error) {
    console.error('Error creating placement experience:', error);
    res.status(500).json({ error: 'Failed to create placement experience' });
  }
});

// Update placement experience
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedExperience = await Placement.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('student', 'name batch department');
    
    if (!updatedExperience) {
      return res.status(404).json({ error: 'Placement experience not found' });
    }
    
    res.json({
      message: 'Placement experience updated successfully',
      experience: updatedExperience
    });
  } catch (error) {
    console.error('Error updating placement experience:', error);
    res.status(500).json({ error: 'Failed to update placement experience' });
  }
});

// Delete placement experience
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedExperience = await Placement.findByIdAndDelete(id);
    
    if (!deletedExperience) {
      return res.status(404).json({ error: 'Placement experience not found' });
    }
    
    res.json({
      message: 'Placement experience deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting placement experience:', error);
    res.status(500).json({ error: 'Failed to delete placement experience' });
  }
});

module.exports = router;
