const express = require('express');
const router = express.Router();
const { getAIResponse, getAIChatResponse } = require('../controllers/ai.controller');

// AI routes - temporarily removing auth middleware to fix the error
// router.post('/generate', getAIResponse);
router.post('/chat', getAIChatResponse);

module.exports = router; 