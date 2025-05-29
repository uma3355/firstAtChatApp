const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb+srv://kmahesh3355:root@cluster0.kborkna.mongodb.net/';

async function connectToDatabase() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB using Mongoose');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

async function closeDatabase() {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
}

module.exports = {
  connectToDatabase,
  closeDatabase
}; 