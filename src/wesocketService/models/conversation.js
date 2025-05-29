const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  last_message_at: {
    type: Date,
    default: Date.now
  },
  last_message_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unread_counts: {
    type: Map,
    of: Number,
    default: new Map()
  },
  last_delivered: {
    type: Map,
    of: Date,
    default: new Map()
  }
});

// Ensure participants are always sorted
conversationSchema.pre('save', function(next) {
  this.participants.sort();
  next();
});

// Update last message and unread counts
conversationSchema.methods.updateLastMessage = async function(messageId, senderId) {
  this.last_message_at = new Date();
  this.last_message_id = messageId;
  
  // Increment unread count for all participants except sender
  for (const participantId of this.participants) {
    if (participantId.toString() !== senderId) {
      const currentCount = this.unread_counts.get(participantId.toString()) || 0;
      this.unread_counts.set(participantId.toString(), currentCount + 1);
    }
  }
  
  return this.save();
};

// Mark conversation as read for a user
conversationSchema.methods.markAsRead = async function(userId) {
  this.unread_counts.set(userId.toString(), 0);
  this.last_delivered.set(userId.toString(), new Date());
  return this.save();
};

// Get messages since last delivery
conversationSchema.methods.getUndeliveredMessages = async function(userId) {
  const lastDelivered = this.last_delivered.get(userId.toString()) || new Date(0);
  
  const messages = await mongoose.model('Message').find({
    conversation_id: this._id,
    timestamp: { $gt: lastDelivered }
  }).sort({ timestamp: 1 });

  // Update last delivered time
  this.last_delivered.set(userId.toString(), new Date());
  await this.save();

  return messages;
};

// Create indexes
// conversationSchema.index({ participants: 1 });/
// conversationSchema.index({ last_message_at: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation; 