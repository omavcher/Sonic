const express = require('express');
const router = express.Router();
const { getProjectById, getAllProjects, getProjectChat , changeVisibility , updateProject ,chaiUpvote} = require('../controllers/project.controller');
const auth = require('../middleware/auth.middleware');

// Get all projects
router.get('/public',auth, getAllProjects);

// Get project by ID
router.get('/:id/details',auth, getProjectById);

router.post('/:id/upvote',auth,chaiUpvote);

// Get project chat by conversation ID
router.get('/chat/:id',auth, getProjectChat);


router.put('/visibility/:id',auth, changeVisibility);

router.put('/:id',auth, updateProject);


module.exports = router; 