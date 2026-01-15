const express = require('express');
const Job = require('../models/Job');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Create job (company only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'company') {
      return res.status(403).json({ message: 'Only companies can create jobs' });
    }

    const job = new Job({
      ...req.body,
      company: req.user.userId
    });

    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all jobs (public)
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'active' }).populate('company', 'name companyName email');
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get company jobs
router.get('/company', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'company') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const jobs = await Job.find({ company: req.user.userId }).populate('applications.user', 'name email');
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Apply for job (user only)
router.post('/:id/apply', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'user') {
      return res.status(403).json({ message: 'Only users can apply for jobs' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const existingApplication = job.applications.find(app => app.user.toString() === req.user.userId);
    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    job.applications.push({ user: req.user.userId });
    await job.save();

    res.json({ message: 'Application submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update application status
router.patch('/:jobId/applications/:userId', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'company') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const job = await Job.findOne({ _id: req.params.jobId, company: req.user.userId });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const application = job.applications.find(app => app.user.toString() === req.params.userId);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.status = req.body.status;
    await job.save();

    res.json({ message: 'Application status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user applications
router.get('/applications', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'user') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const jobs = await Job.find({ 'applications.user': req.user.userId })
      .populate('company', 'name companyName email');
    
    const applications = jobs.map(job => {
      const application = job.applications.find(app => app.user.toString() === req.user.userId);
      return {
        job: {
          _id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type
        },
        status: application.status,
        appliedAt: application.appliedAt
      };
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
