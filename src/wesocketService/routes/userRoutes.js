const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Store active WebSocket connections
const activeConnections = new Map();

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { username, display_name, password } = req.body;

    // Validate required fields
    if (!username || !display_name || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, display name, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      display_name,
      password // Note: In a real application, you should hash the password
    });

    // Return user data (excluding password)
    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        display_name: user.display_name,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Check password (Note: In a real application, you should compare hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Update last active timestamp
    await user.updateLastActive();

    // Return user data
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        display_name: user.display_name,
        last_active: user.last_active
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all users endpoint
router.get('/users', async (req, res) => {
  try {
    // Find all users and exclude sensitive information like password
    const users = await User.find({}, {
      password: 0, // Exclude password field
      __v: 0 // Exclude version field
    });

    res.json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        display_name: user.display_name,
        last_active: user.last_active,
        created_at: user.created_at
      }))
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function to get WebSocket connection for a user
function getUserConnection(userId) {
  return activeConnections.get(userId);
}

module.exports = {
  router,
  getUserConnection
}; 