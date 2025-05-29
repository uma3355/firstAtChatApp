const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read_by: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  is_deleted: {
    type: Boolean,
    default: false
  }
});

// Add sender to read_by when message is created
messageSchema.pre('save', function(next) {
  if (this.isNew) {
    this.read_by.push(this.sender_id);
  }
  next();
});

// Mark message as read by a user
messageSchema.methods.markAsRead = async function(userId) {
  if (!this.read_by.includes(userId)) {
    this.read_by.push(userId);
    return this.save();
  }
  return this;
};

// Soft delete message
messageSchema.methods.softDelete = async function() {
  this.is_deleted = true;
  return this.save();
};

// Create indexes
messageSchema.index({ conversation_id: 1, timestamp: -1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ read_by: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 