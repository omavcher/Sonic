const { GoogleGenerativeAI } = require('@google/generative-ai');
const Project = require('../models/projects.model');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const getAIChatResponse = async (req, res) => {
  try {
    const { messages, conversationId } = req.body;
    console.log('Request Body:', { messages, conversationId });

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages array is required and cannot be empty' });
    }
    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'conversationId is required' });
    }

    // Extract and verify JWT token
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }

    const token = authHeader.split(' ')[1];
    let decodedUser;
    try {
      decodedUser = jwt.verify(token, SECRET);
      console.log('Decoded Token:', decodedUser);
    } catch (err) {
      console.error('Token Verification Error:', err.message);
      return res.status(401).json({ error: 'Login Required Sorry, there was an error processing your request. Please try again' });
    }

    const userId = decodedUser.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    console.log('User ID:', userId);

    // Verify user existence
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check subscription status and handle tokens for free users
    if (user.subscriptionStatus !== 'paid') {
      // Check if user has enough tokens
      if (user.tokens < 20) {
        return res.status(403).json({ error: 'token_over' });
      }

      // Deduct 20 tokens for using the AI feature
      user.tokens -= 20;
      await user.save();
      console.log(`Deducted 20 tokens for user ${userId}. Remaining tokens: ${user.tokens}`);
    } else {
      console.log(`User ${userId} has paid subscription. No token deduction required.`);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase().trim();
    if (!lastUserMessage) {
      return res.status(400).json({ success: false, message: 'No user message found' });
    }

    const existingProject = await Project.findOne({ conversationId }).lean();

    // Prepare chat history with correct roles
    const chatHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      content: msg.content,
    }));

    // Function to check if project is empty (missing essential fields)
    const isProjectEmpty = (project) => {
      return !project?.title ||
             !project?.files ||
             project.files.length === 0 ||
             !project?.features ||
             project.features.length === 0;
    };

    // Function to handle Type 0 responses
    const handleType0Response = async (project, newMessage) => {
      // Check if this is a response to a modification prompt
      const lastAssistantMessage = project.chatHistory
        .filter(m => m.role === 'model')
        .pop()?.content || '';

      const isModificationFollowUp = lastAssistantMessage.includes('Would you like to modify it?');

      if (isModificationFollowUp) {
        if (['yes', 'y'].includes(newMessage.toLowerCase())) {
          return await handleModificationRequest(project, 'Please help me modify this project');
        } else {
          const responseText = 'Okay, let me know if you want to discuss anything else about your project.';
          const updatedChatHistory = [
            ...project.chatHistory,
            { role: 'user', content: newMessage },
            { role: 'model', content: responseText },
          ];

          await Project.updateOne(
            { conversationId },
            { chatHistory: updatedChatHistory }
          );

          return {
            type: 0,
            response: responseText,
            chatHistory: updatedChatHistory,
            projectDetails: {
              title: project.title,
              description: project.description,
              features: project.features,
              filePaths: project.files.map(f => f.path),
              mainColorTheme: project.mainColorTheme || '#ffffff',
              secondaryColorTheme: project.secondaryColorTheme || '#000000',
              Code: project.Code,
            },
          };
        }
      }

      // Normal chat handling with enhanced context prompt
      const customInstruction = `
      You are an AI assistant helping users build and modify web development projects.
      Always respond in JSON format:
      - If no code change is needed: { "message": "..." }
      - Every time provide full code, not partial code, without any comments
      - Don't use any kind of icons, use emojis only
      - If code changes are needed:
        {
          "message": "Explain what's changed in short,   - Tell user what you are building
                  - response less than 15 lines.  use Markdown format to better explain 
                  Skip code examples and commentary
           ",
          "code": [ { "name": "file", "content": "full content" }, ... ]
        }
      Do not include code samples outside JSON. Keep messages concise (max 15 lines).
      `;

      const contextDetails = `
      NOTE: If you change any file, include it in the "code" array with full content.
      Only include changed files. Do not mix code and commentary.
      `;

      const customPrompt = `${customInstruction}\n\nUser says: "${newMessage}"\n\nCurrent Project: ${project.title}\nFeatures: ${project.features.join(', ')}\nFiles: ${project.files.map(f => f.path).join(', ')}\n\n${contextDetails}`;

      const chat = model.startChat({
        history: chatHistory.slice(0, -1).map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(customPrompt);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || [, responseText];
      const cleanedResponse = jsonMatch[1]?.trim() || responseText.trim();

      let jsonResponse;
      try {
        jsonResponse = JSON.parse(cleanedResponse);
      } catch (err) {
        console.error('Failed to parse JSON from AI response:', err, cleanedResponse);
        return res.status(500).json({ success: false, message: 'AI response format error' });
      }

      // Update files if code changes are provided
      const updatedCode = [...project.Code];
      if (jsonResponse.code && Array.isArray(jsonResponse.code)) {
        jsonResponse.code.forEach(updatedFile => {
          const fileIndex = updatedCode.findIndex(f => f.name === updatedFile.name);
          if (fileIndex !== -1) {
            updatedCode[fileIndex].content = updatedFile.content;
          } else {
            updatedCode.push({ name: updatedFile.name, content: updatedFile.content });
          }
        });
      }

      const updatedChatHistory = [
        ...project.chatHistory,
        { role: 'user', content: newMessage },
        { role: 'model', content: jsonResponse.message },
      ];

      await Project.updateOne(
        { conversationId },
        {
          Code: updatedCode,
          chatHistory: updatedChatHistory,
          files: updatedCode.map(file => ({ path: file.name })),
        }
      );

      return {
        type: 0,
        response: jsonResponse.message,
        chatHistory: updatedChatHistory,
        projectDetails: {
          title: project.title,
          description: project.description,
          features: project.features,
          filePaths: updatedCode.map(f => f.name),
          mainColorTheme: project.mainColorTheme || '#ffffff',
          secondaryColorTheme: project.secondaryColorTheme || '#000000',
          Code: updatedCode,
        },
      };
    };

    // Placeholder for handleModificationRequest (since it was referenced but not provided)
    const handleModificationRequest = async (project, message) => {
      // Implement modification logic here if needed
      return {
        type: 0,
        response: 'Modification not implemented yet.',
        chatHistory: project.chatHistory,
        projectDetails: {
          title: project.title,
          description: project.description,
          features: project.features,
          filePaths: project.files.map(f => f.path),
          mainColorTheme: project.mainColorTheme || '#ffffff',
          secondaryColorTheme: project.secondaryColorTheme || '#000000',
          Code: project.Code,
        },
      };
    };

    // Function to handle Type 1 project creation
    const handleType1Creation = async (message, existingEmptyProject = null) => {
      try {
        const projectPrompt = `
Create a single-page React web app based on the idea: "${message}"

📦 Requirements:
- Use React (JSX + a single global styles.css file — no Tailwind)
- Use lucide-react icons where appropriate
- All code should be organized:
  - Pages in /src/pages
  - Components in /src/components
  - All styles in one single file: styles.css
- Common layout:
  - App.js includes a shared Navbar and Footer component across all pages
  - The entire app is rendered on a single page (Home.js)
  - Navbar should be a responsive hamburger menu with a logo on the right
  - Footer should be simple and clean

🚫 Do NOT use Tailwind utilities, even if Tailwind is installed

🧾 Output the final project as JSON in the format below:

{
  "title": "Project title",
  "description": "Brief description of what this project is and does",
  "features": ["Feature 1", "Feature 2", "..."],
  "files": [
    {
      "path": "App.js",
      "description": "Combines Navbar, Footer and Home page",
      "code": "// Full code of App.js",
      "features": ["Shared layout", "Responsive design"]
    },
    {
      "path": "styles.css",
      "description": "All global styles in one file",
      "code": "/* All styles here */",
      "features": ["Single CSS file"]
    },
    {
      "path": "/src/pages/Home.js",
      "description": "Single-page layout for the web app",
      "code": "// Full code of Home.js",
      "features": ["Single page app"]
    },
    {
      "path": "/src/components/Navbar.js",
      "description": "Responsive navbar with hamburger menu and logo on right",
      "code": "// Full code of Navbar",
      "features": ["Responsive navbar", "Hamburger menu"]
    },
    {
      "path": "/src/components/Footer.js",
      "description": "Simple footer component for the app",
      "code": "// Full code of Footer",
      "features": ["Sticky footer"]
    }
  ],
  "mainColorTheme": "#hex",
  "secondaryColorTheme": "#hex",
  "chatSummary": "Short summary of the entire project",
  
  MAKE THE CODE LIKE MODERN STYLING NOT BASIC AND USE SAMPLE DATA TO SHOWCASE. Don't use any kind of icons, use emojis only ->
    - all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.
- Use stock photos from unsplash where appropriate, only valid URLs you know exist. Do not download the images, only link to them in image tags.
 

-->-> For placeholder images, please use a https://archive.org/download/placeholder-image/placeholder-image.jpg

  "Code": [
    {
      "name": "App.js",
      "content": "import React from 'react';
import Navbar from './src/components/Navbar';
import Footer from './src/components/Footer';
import Home from './src/pages/Home';
import './styles.css';

function App() {
  return (
    <>
      <Navbar />
      <Home />
      <Footer />
    </>
  );
}

export default App;
"
    },
    {
      "name": "styles.css",
      "content": "/* All styles here */"
    },
    {
      "name": "/src/pages/Home.js",
      "content": "// Full code of Home.js"
    },
    {
      "name": "/src/components/Navbar.js",
      "content": "// Full code of Navbar"
    },
    {
      "name": "/src/components/Footer.js",
      "content": "// Full code of Footer"
    }
  ]
}`;

        const projectResult = await model.generateContent(projectPrompt);
        const responseText = projectResult.response.text();
        const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || [, responseText];
        const cleanedResponse = jsonMatch[1]?.trim() || responseText.trim();

        let projectData = {
          owner: userId,
          title: 'React Project',
          description: 'A new React application',
          features: [],
          files: [],
          mainColorTheme: '#ffffff',
          secondaryColorTheme: '#000000',
          Code: [],
        };

        try {
          projectData = JSON.parse(cleanedResponse);
        } catch (err) {
          console.error('Error parsing project JSON:', err, cleanedResponse);
        }

        const chatSummary = projectData.chatSummary || `Created ${projectData.title} with React`;
        delete projectData.chatSummary;

        // Map files to Code array if not provided
        if (!projectData.Code || projectData.Code.length === 0) {
          projectData.Code = projectData.files.map(file => ({
            name: file.path,
            content: file.code,
          }));
        }

        // Use existing project if provided, otherwise create new
        const project = existingEmptyProject
          ? await Project.findOne({ conversationId })
          : new Project({ conversationId });

        Object.assign(project, {
          type: 1,
          owner: userId,
          ...projectData,
          chatHistory: [
            ...(existingEmptyProject ? existingEmptyProject.chatHistory : chatHistory),
            { role: 'model', content: chatSummary },
          ],
        });

        await project.save();
        console.log('Project Saved:', { conversationId, title: project.title });

        // Update User model
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            $push: {
              projects: {
                conversationId: project.conversationId,
                title: project.title || 'New Project',
                createdAt: project.createdAt,
              },
            },
          },
          { new: true }
        );

        if (!updatedUser) {
          console.error('Failed to update user projects for userId:', userId);
          throw new Error('Failed to associate project with user');
        }

        console.log('User Updated:', { userId, projectTitle: project.title });

        return {
          type: 1,
          response: chatSummary,
          chatHistory: project.chatHistory,
          projectDetails: {
            title: projectData.title,
            description: projectData.description,
            features: projectData.features,
            filePaths: projectData.files.map(f => f.path),
            mainColorTheme: projectData.mainColorTheme,
            secondaryColorTheme: projectData.secondaryColorTheme,
            Code: projectData.Code,
          },
        };
      } catch (err) {
        console.error('Error in handleType1Creation:', err);
        throw err;
      }
    };

    // Check if user is trying to create a project (Type 1)
    const intentPrompt = `Analyze this message for web app creation intent. Respond ONLY with "1" (create app) or "0" (general chat): "${lastUserMessage}"`;
    const intentResult = await model.generateContent(intentPrompt);
    const isCreateIntent = intentResult.response.text().trim() === '1';

    // Scenario 1: Existing project found
    if (existingProject) {
      if (isCreateIntent && isProjectEmpty(existingProject)) {
        const responseData = await handleType1Creation(lastUserMessage, existingProject);
        return res.status(200).json({ success: true, data: responseData });
      }

      const responseData = await handleType0Response(existingProject, lastUserMessage);
      return res.status(200).json({ success: true, data: responseData });
    }

    // Scenario 2: New conversation with Type 1 intent
    if (isCreateIntent) {
      const responseData = await handleType1Creation(lastUserMessage);
      return res.status(200).json({ success: true, data: responseData });
    }

    // Scenario 3: New conversation with Type 0 (chat only)
    const newProject = new Project({
      conversationId,
      type: 0,
      owner: userId,
      chatHistory: [
        ...chatHistory,
      ],
    });

    const chat = model.startChat({
      history: chatHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(lastUserMessage);
    const responseText = result.response.text();
    newProject.chatHistory.push({ role: 'model', content: responseText });

    await newProject.save();
    console.log('New Type 0 Project Saved:', { conversationId });

    // Update User model for Type 0 project
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          projects: {
            conversationId: newProject.conversationId,
            title: 'New Chat',
            createdAt: newProject.createdAt,
          },
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      console.error('Failed to update user projects for userId:', userId);
      throw new Error('Failed to associate project with user');
    }

    console.log('User Updated for Type 0:', { userId, projectTitle: 'New Chat' });

    return res.status(200).json({
      success: true,
      data: {
        type: 0,
        response: responseText,
        chatHistory: newProject.chatHistory,
      },
    });

  } catch (error) {
    console.error('AI Response Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating AI response',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = { getAIChatResponse };