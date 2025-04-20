const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');

// Helper function to check if two dates are the same day
const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, profilePicture } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create new user with default tokens
    user = new User({
      name,
      email,
      password,
      profilePicture: profilePicture || "https://imgs.search.brave.com/vLZ44Uli4ZlkgAjdMiftogg6vX7--GvMQWTk4ZDQ8zc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/cmVkZGl0c3RhdGlj/LmNvbS9hdmF0YXJz/L2RlZmF1bHRzL3Yy/L2F2YXRhcl9kZWZh/dWx0XzcucG5n",
      tokens: 100, // Starting tokens
      lastLogin: new Date()
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      tokensGranted: 0, // No tokens granted on registration
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        role: user.role,
        profilePicture: user.profilePicture,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in registration',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const now = new Date();
    let tokensGranted = 0;
    
   
    if (!user.lastTokenGrantDate || !isSameDay(new Date(user.lastTokenGrantDate), now)) {
      user.tokens += 50;
      user.lastTokenGrantDate = now;
      tokensGranted = 50;
    }

    // Update last login
    user.lastLogin = now;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      tokensGranted,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        role: user.role,
        profilePicture: user.profilePicture,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in login',
      error: error.message
    });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, profilePicture } = req.body;

    // Check if user exists with Google ID
    let user = await User.findOne({ googleId });
    const now = new Date();
    let tokensGranted = 0;

    if (!user) {
      // Check if user exists with email
      user = await User.findOne({ email });
      
      if (user) {
        // Update existing user with Google ID
        user.googleId = googleId;
        user.profilePicture = profilePicture;
        
        // Grant tokens if first login today
        if (!user.lastTokenGrantDate || !isSameDay(new Date(user.lastTokenGrantDate), now)) {
          user.tokens += 50;
          user.lastTokenGrantDate = now;
          tokensGranted = 50;
        }
      } else {
        // Create new user with bonus tokens
        user = new User({
          googleId,
          email,
          name,
          profilePicture,
          tokens: 150, // 100 default + 50 bonus
          lastTokenGrantDate: now,
          lastLogin: now
        });
        await user.save();
        tokensGranted = 50;

        const token = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.json({
          success: true,
          token,
          tokensGranted,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            tokens: user.tokens,
            role: user.role,
            profilePicture: user.profilePicture,
            subscriptionStatus: user.subscriptionStatus,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
          }
        });
      }
    } else {
      // Grant tokens if first login today
      if (!user.lastTokenGrantDate || !isSameDay(new Date(user.lastTokenGrantDate), now)) {
        user.tokens += 50;
        user.lastTokenGrantDate = now;
        tokensGranted = 50;
      }
    }

    // Update last login
    user.lastLogin = now;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      tokensGranted,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        role: user.role,
        profilePicture: user.profilePicture,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in Google authentication',
      error: error.message
    });
  }
};

const logout = async (req, res) => {
  try {
    // In a real implementation, you might want to invalidate the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in logout',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  logout
};