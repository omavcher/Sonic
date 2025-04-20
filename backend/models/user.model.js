const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password is required only if googleId is not present
    },
    minlength: 6
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  profilePicture: {
    type: String,
    default: 'https://imgs.search.brave.com/vLZ44Uli4ZlkgAjdMiftogg6vX7--GvMQWTk4ZDQ8zc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/cmVkZGl0c3RhdGlj/LmNvbS9hdmF0YXJz/L2RlZmF1bHRzL3Yy/L2F2YXRhcl9kZWZh/dWx0XzcucG5n'
  },
  role: {
    type: String,
    enum: ['normal', 'premium'],
    default: 'normal'
  },
  subscriptionStatus: {
    type: String,
    enum: ['free', 'paid'],
    default: 'free'
  },
  subscriptionEndDate: {
    type: Date
  },
  lastLogin: {
    type: Date,
    default: null
  },
  tokens: {
    type: Number,
    default: 100 // Starting tokens
  },
  lastTokenGrantDate: {
    type: Date,
    default: null
  },
  projects: [{
    conversationId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]  
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 