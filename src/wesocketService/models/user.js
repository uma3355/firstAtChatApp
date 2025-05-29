const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  display_name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_active: {
    type: Date,
    default: Date.now
  }
});

// Update last active timestamp
userSchema.methods.updateLastActive = async function() {
  this.last_active = new Date();
  return this.save();
};

// Create indexes
// userSchema.index({ username: 1 }, { unique: true }); // Removed duplicate index
// userSchema.index({ last_active: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User; 