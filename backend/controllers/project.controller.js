const Project = require('../models/projects.model');
const User = require('../models/user.model');

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    // Find project by conversationId
    const project = await Project.findOne({ conversationId: id });

    if (!project) {
      return res.status(200).json({
        success: false,
        flag: 'none',
        message: 'Project not found'
      });
    }

    // Return project details
    return res.status(200).json({
      success: true,
      data: {
        owner:project.owner,
        id: project.conversationId,
        title: project.title,
        description: project.description,
        features: project.features,
        files: project.files,
        mainColorTheme: project.mainColorTheme,
        secondaryColorTheme: project.secondaryColorTheme,
        chatHistory: project.chatHistory,
        Code: project.Code,
        createdAt: project.createdAt,
        visibility: project.visibility,
        chai_count: project.chai_count,
        thumbnail: project.thumbnail
      }
    });

  } catch (error) {
    console.error('Error getting project:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting project details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllProjects = async (req, res) => {
  try {
    // Get all projects
    const projects = await Project.find({ type: 1 }).sort({ createdAt: -1 });

    // Return projects with basic info
    return res.status(200).json({
      success: true,
      data: projects.map(project => ({
        id: project.conversationId,
        thumbnail: project.thumbnail,
        chai_count:project.chai_count,
        title: project.title,
        description: project.description,
        features: project.features,
        mainColorTheme: project.mainColorTheme,
        secondaryColorTheme: project.secondaryColorTheme,
        createdAt: project.createdAt
      }))
    });

  } catch (error) {
    console.error('Error getting projects:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getProjectChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages } = req.query;

    // Find project by conversationId
    const project = await Project.findOne({ conversationId: id });

    if (!project) {
      return res.status(200).json({
        flag: 'none',
        success: false,
        message: 'Project not found'
      });
    }

    // Return project chat history
    return res.status(200).json({
      success: true,
      data: {
        id: project.conversationId,
        chatHistory: project.chatHistory,
        Code: project.Code
      }
    });

  } catch (error) {
    console.error('Error getting project chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting project chat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



const changeVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { visibility } = req.body;
    const userId = req.user.userId; // Assuming you have authentication middleware

    // Validate input
    if (!['public', 'private'].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visibility value'
      });
    }

    // Find the project
    const project = await Project.findOne({ conversationId: id });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is owner (optional - remove if not needed)
    if (project.owner !== userId && project.owner !== 'guest') {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can change visibility'
      });
    }

    // For private projects, check if user is premium
    if (visibility === 'private') {
      const user = await User.findById(userId);
      if (!user || user.role !== 'premium' || user.subscriptionStatus !== 'paid') {
        return res.status(403).json({
          success: false,
          message: 'Premium subscription required for private projects',
          requiresPremium: true
        });
      }
    }

    // Update visibility
    project.visibility = visibility;
    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Project visibility updated successfully',
      data: {
        visibility: project.visibility
      }
    });

  } catch (error) {
    console.error('Error changing project visibility:', error);
    return res.status(500).json({
      success: false,
      message: 'Error changing project visibility',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add this to your projects.controller.js file
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId; // From auth middleware
    const updates = req.body;

    // Validate input
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    // Find the project
    const project = await Project.findOne({ conversationId: id });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is owner (optional - remove if not needed)
    if (project.owner !== userId && project.owner !== 'guest') {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can update project'
      });
    }

    // Allowed fields to update
    const allowedUpdates = {
      title: updates.title,
      description: updates.description,
      thumbnail: updates.thumbnail,
      chai_count:updates.chai_count,
      mainColorTheme: updates.mainColorTheme,
      secondaryColorTheme: updates.secondaryColorTheme
    };

    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    // Update the project
    Object.assign(project, allowedUpdates);
    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: {
        id: project.conversationId,
        title: project.title,
        description: project.description,
        thumbnail: project.thumbnail,
        mainColorTheme: project.mainColorTheme,
        secondaryColorTheme: project.secondaryColorTheme
      }
    });

  } catch (error) {
    console.error('Error updating project:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


const chaiUpvote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId; // From auth middleware

    // Find the project
    const project = await Project.findOne({ conversationId: id });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Add user to upvoters and increment chai_count
    project.chai_count += 1;
    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Project upvoted successfully',
      data: {
        chai_count: project.chai_count,
        upvoted: true
      }
    });

  } catch (error) {
    console.error('Error upvoting project:', error);
    return res.status(500).json({
      success: false,
      message: 'Error upvoting project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add updateProject to your exports
module.exports = {
  changeVisibility,
  getProjectById,
  getAllProjects,
  getProjectChat,
  updateProject,
  chaiUpvote
};