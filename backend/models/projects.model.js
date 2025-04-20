const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.Mixed,
    default: 'guest'
  },  
  thumbnail:{
    type: String,
    default: "https://cdn-icons-png.flaticon.com/512/1420/1420337.png"
  },
  chai_count:{
    type: Number,
    default: 0
  },
  conversationId: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: Number,
    enum: [0, 1],
    required: true,
  },
  title: {
    type: String,
    required: function () {
      return this.type === 1;
    },
  },
  description: {
    type: String,
    required: function () {
      return this.type === 1;
    },
  },
  features: {
    type: [String],
    required: function () {
      return this.type === 1;
    },
  },
  files: [
    {
      path: {
        type: String,
      },
      description: {
        type: String,
      },
      features: {
        type: [String],
      },
    },
  ],
  mainColorTheme: {
    type: String,
    required: function () {
      return this.type === 1;
    },
  },
  secondaryColorTheme: {
    type: String,
    required: function () {
      return this.type === 1;
    },
  },
  chatHistory: [
    {
      role: {
        type: String,
        enum: ['user', 'model'],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  response: {
    type: String,
    required: false, // Remove the conditional requirement
  },
  Code: [
    {
      name: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    required: true,
    default: 'public', 
  }
});

module.exports = mongoose.model('Project', ProjectSchema);