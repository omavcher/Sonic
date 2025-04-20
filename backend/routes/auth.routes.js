const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, googleAuth } = require('../controllers/auth.controller');

// Validation middleware
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('profilePicture').optional().isURL().withMessage('Profile picture must be a valid URL')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const googleAuthValidation = [
  body('googleId').notEmpty().withMessage('Google ID is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('profilePicture').optional().isURL().withMessage('Profile picture must be a valid URL')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/google', googleAuthValidation, googleAuth);

module.exports = router; 