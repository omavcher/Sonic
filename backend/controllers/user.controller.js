const User = require('../models/user.model');
const Payment = require('../models/payment.model');
const { v4: uuidv4 } = require('uuid'); // Add uuid for random string generation
// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, email, profilePicture } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Update subscription status
const updateSubscription = async (req, res) => {
  try {
    const { subscriptionStatus, subscriptionEndDate } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.subscriptionStatus = subscriptionStatus;
    if (subscriptionEndDate) {
      user.subscriptionEndDate = new Date(subscriptionEndDate);
    }

    // Update role based on subscription
    if (subscriptionStatus === 'paid') {
      user.role = 'premium';
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating subscription',
      error: error.message
    });
  }
};

// Delete user account
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
};

const savePayment = async (req, res) => {
  try {
    const {
      rupees: amount,
      transaction_id: razorpayPaymentId,
      plan,
      receipt_id: receiptId,
      currency,
      status: incomingStatus,
      created_at: paymentDate,
      razorpayOrderId = `order_${uuidv4().replace(/-/g, '').slice(0, 14)}` // Generate random order ID if not provided
    } = req.body;

    // Validate required fields
    if (!razorpayPaymentId || !amount || !plan || !receiptId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // Map incoming status to valid enum value
    let mappedStatus;
    switch (incomingStatus?.toLowerCase()) {
      case 'success':
        mappedStatus = 'completed';
        break;
      case 'failed':
        mappedStatus = 'failed';
        break;
      default:
        mappedStatus = 'pending';
    }

    // Get authenticated user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create new payment record
    const payment = new Payment({
      user: user._id,
      razorpayPaymentId,
      razorpayOrderId, // Use provided or generated order ID
      amount,
      currency: currency || 'INR',
      plan,
      receiptId,
      status: mappedStatus,
      paymentDate: paymentDate || new Date()
    });

    await payment.save();

    // Update user subscription
    const subscriptionEndDate = new Date();
    if (plan === 'monthly') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    }

    user.subscriptionStatus = 'paid';
    user.role = 'premium';
    user.subscriptionEndDate = subscriptionEndDate;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Payment saved and subscription updated successfully',
      data: {
        payment: {
          id: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          plan: payment.plan,
          status: payment.status,
          paymentDate: payment.paymentDate
        },
        user: {
          subscriptionStatus: user.subscriptionStatus,
          role: user.role,
          subscriptionEndDate: user.subscriptionEndDate
        }
      }
    });
  } catch (error) {
    console.error('Error saving payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getPaymentDetails = async (req, res) => {
  try {
    // Get authenticated user
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has paid subscription
    if (user.subscriptionStatus !== 'paid') {
      return res.status(200).json({
        success: false,
        message: 'No payment details available for free users'
      });
    }

    // Fetch the newest payment record for the user
    const payment = await Payment.findOne({ user: user._id })
      .sort({ paymentDate: -1 }) // Sort by payment date, newest first
      .select('razorpayPaymentId amount currency plan status paymentDate receiptId');

    if (!payment) {
      return res.status(200).json({
        success: false,
        message: 'No payment records found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Latest payment details retrieved successfully',
      data: {
        user: {
          id: user._id,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndDate: user.subscriptionEndDate,
          role: user.role
        },
        payment: {
          id: payment._id,
          razorpayPaymentId: payment.razorpayPaymentId,
          amount: payment.amount,
          currency: payment.currency,
          plan: payment.plan,
          status: payment.status,
          paymentDate: payment.paymentDate,
          receiptId: payment.receiptId
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



module.exports = {
  getProfile,
  updateProfile,
  updateSubscription,
  deleteAccount,
  savePayment,
  getPaymentDetails
}; 