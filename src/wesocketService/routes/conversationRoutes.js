const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user');

// Get all conversations and messages for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get all conversations where user is a participant
        const conversations = await Conversation.find({
            participants: userId
        });

        // Get messages for each conversation
        const conversationsWithMessages = await Promise.all(
            conversations.map(async (conversation) => {
                const messages = await Message.find({
                    conversation_id: conversation._id
                }).sort({ timestamp: 1 });

                // Get recipient ID (the other participant)
                const recipientId = conversation.participants.find(
                    participantId => participantId.toString() !== userId
                );

                return {
                    conversation_id: conversation._id,
                    un_read_count: conversation.unread_counts?.[recipientId] ?? 0,
                    participants: [userId, recipientId],
                    // recipient: recipientId,
                    // last_message: conversation.last_message_id,
                    // last_delivered: conversation.last_delivered.get(recipientId),
                    messages: messages.map(msg => ({
                        id: msg._id,
                        sender_id: msg.sender_id,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        is_read_by: msg.read_by?.includes(userId) ?? false
                    }))
                };
            })
        );

        res.json({
            success: true,
            data: conversationsWithMessages
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversations'
        });
    }
});

module.exports = { router }; 