const express = require('express');
const Configuration = require('../models/Configuration');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Health check endpoint for configuration service
router.get('/health', async (req, res) => {
  try {
    // Test database connection by trying to count configurations
    const count = await Configuration.countDocuments();
    res.json({ 
      status: 'OK', 
      message: 'Configuration service is running',
      configCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Configuration health check failed:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Configuration service is not healthy',
      error: error.message 
    });
  }
});

// Get all configurations by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const configurations = await Configuration.find({ 
      category, 
      isActive: true 
    }).select('key value description');
    
    res.json(configurations);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// Get all departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await Configuration.findOne({ 
      key: 'departments',
      isActive: true 
    });
    
    if (!departments) {
      // If departments don't exist, create them
      const defaultDepartments = [
        'Mechanical Engineering',
        'Artificial Intelligence and Data Science',
        'Artificial Intelligence and Machine Learning',
        'Mechatronics Engineering',
        'Automobile Engineering',
        'Electrical and Electronics Engineering',
        'Electronics and Communication Engineering',
        'Electronics and Instrumentation Engineering',
        'Computer Science and Engineering',
        'Information Technology',
        'Computer Science and Design'
      ];
      
      const newDepartments = new Configuration({
        key: 'departments',
        value: defaultDepartments,
        category: 'academic',
        description: 'KEC Engineering Departments'
      });
      
      await newDepartments.save();
      res.json(defaultDepartments);
    } else {
      res.json(departments.value);
    }
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get all designations
router.get('/designations', async (req, res) => {
  try {
    const designations = await Configuration.findOne({ 
      key: 'designations',
      isActive: true 
    });
    
    if (!designations) {
      // If designations don't exist, create them
      const defaultDesignations = [
        'Professor',
        'Associate Professor',
        'Assistant Professor',
        'Lecturer',
        'Senior Lecturer',
        'Head of Department',
        'Dean',
        'Principal',
        'Director'
      ];
      
      const newDesignations = new Configuration({
        key: 'designations',
        value: defaultDesignations,
        category: 'academic',
        description: 'Academic Designations'
      });
      
      await newDesignations.save();
      res.json(defaultDesignations);
    } else {
      res.json(designations.value);
    }
  } catch (error) {
    console.error('Error fetching designations:', error);
    res.status(500).json({ error: 'Failed to fetch designations' });
  }
});

// Get all placement statuses
router.get('/placement-statuses', async (req, res) => {
  try {
    const placementStatuses = await Configuration.findOne({ 
      key: 'placementStatuses',
      isActive: true 
    });
    
    if (!placementStatuses) {
      // If placement statuses don't exist, create them
      const defaultStatuses = [
        'seeking',
        'placed',
        'not_interested',
        'higher_studies',
        'entrepreneur'
      ];
      
      const newStatuses = new Configuration({
        key: 'placementStatuses',
        value: defaultStatuses,
        category: 'placement',
        description: 'Student Placement Statuses'
      });
      
      await newStatuses.save();
      res.json(defaultStatuses);
    } else {
      res.json(placementStatuses.value);
    }
  } catch (error) {
    console.error('Error fetching placement statuses:', error);
    res.status(500).json({ error: 'Failed to fetch placement statuses' });
  }
});

// Admin routes (protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { key, value, category, description } = req.body;
    
    if (!key || !value || !category) {
      return res.status(400).json({ error: 'Key, value, and category are required' });
    }
    
    const configuration = new Configuration({
      key,
      value,
      category,
      description
    });
    
    await configuration.save();
    res.status(201).json(configuration);
  } catch (error) {
    console.error('Error creating configuration:', error);
    res.status(500).json({ error: 'Failed to create configuration' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { value, description, isActive } = req.body;
    
    const configuration = await Configuration.findByIdAndUpdate(
      id,
      { value, description, isActive, updatedAt: new Date() },
      { new: true }
    );
    
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json(configuration);
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const configuration = await Configuration.findByIdAndDelete(id);
    
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting configuration:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

module.exports = router;
