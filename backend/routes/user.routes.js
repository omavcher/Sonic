const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth.middleware');
const {
  getProfile,
  updateProfile,
  updateSubscription,
  deleteAccount,
  savePayment,
  getPaymentDetails
} = require('../controllers/user.controller');

// Validation middleware
const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('profilePicture').optional().isURL().withMessage('Profile picture must be a valid URL')
];

const updateSubscriptionValidation = [
  body('subscriptionStatus').isIn(['free', 'paid']).withMessage('Invalid subscription status'),
  body('subscriptionEndDate').optional().isISO8601().withMessage('Invalid date format')
];

// Protected routes
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, updateProfile);
router.put('/subscription', auth, updateSubscriptionValidation, updateSubscription);
router.delete('/profile', auth, deleteAccount);
router.post('/payment/save', auth, savePayment);
router.get('/payments', auth, getPaymentDetails);

module.exports = router; 