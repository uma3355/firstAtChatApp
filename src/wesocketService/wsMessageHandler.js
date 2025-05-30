const WebSocket = require('ws');
const User = require('./models/user');
const Conversation = require('./models/conversation');
const Message = require('./models/message');

// Store active WebSocket connections
const activeConnections = new Map();

// WebSocket message handlers
const messageHandlers = {
  // Chat message handler
  chat_message: async (ws, data, wss) => {
    try {
      const { sender_id, recipient_id, content } = data;

      // Find or create conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [sender_id, recipient_id] }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [sender_id, recipient_id]
        });
      }

      // Create message
      const message = await Message.create({
        conversation_id: conversation._id,
        sender_id: sender_id,
        content: content
      });

      // Update conversation's last message
      await conversation.updateLastMessage(message._id, sender_id);

      const messageData = {
        type: 'message',
        conversation_id: conversation._id,
        message: {
          id: message._id,
          sender_id: message.sender_id,
          content: message.content,
          timestamp: message.timestamp
        }
      };

      // Send message to recipient if online
      const recipientWs = activeConnections.get(recipient_id);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify(messageData));
        //once it sends the message then update the last_delivered of the recipientId in conversation
        await conversation.last_delivered.set(recipient_id, new Date());
        await conversation.save();
      }

      // Send confirmation to sender
      ws.send(JSON.stringify({
        type: 'status',
        conversation_id: conversation._id,
        message: {
          id: message._id,
          sender_id: message.sender_id,
          content: message.content,
          timestamp: message.timestamp
        },
        status: 'sent'
      }));

    } catch (error) {
      console.error('Chat message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to send message'
      }));
    }
  }
};

// Setup WebSocket server
function setupWebSocketHandlers(wss) {
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection attempt');

    // Handle initial connection setup
    ws.on('message', async (message) => {
      console.log('Raw message received:', message.toString());
      try {
        const data = JSON.parse(message);
        console.log('Parsed WebSocket message:', data);

        // Only handle connection setup if it's the first message with user_id
        if (data.type === 'init' && data.user_id && !ws.userId) {
          console.log('Processing init message for user:', data.user_id);
          ws.userId = data.user_id;
          activeConnections.set(data.user_id, ws);
          console.log('Active connections after adding:', Array.from(activeConnections.keys()));

          // Get all conversations for the user
          const conversations = await Conversation.find({
            participants: { $in: [data.user_id] }
          });
          console.log('Found conversations:', conversations.length);

          // For each conversation, get undelivered messages
          for (const conversation of conversations) {
            const undeliveredMessages = await conversation.getUndeliveredMessages(data.user_id);
            console.log('Undelivered messages for conversation:', conversation._id, ':', undeliveredMessages.length);
            
            if (undeliveredMessages.length > 0) {
              // Send undelivered messages to the user
              ws.send(JSON.stringify({
                type: 'undelivered_messages',
                conversation_id: conversation._id,
                messages: undeliveredMessages.map(msg => ({
                  id: msg._id,
                  sender_id: msg.sender_id,
                  content: msg.content,
                  timestamp: msg.timestamp
                }))
              }));
            }
          }
          return;
        }

        // Route the message to the appropriate handler
        const handler = messageHandlers[data.type];
        if (handler) {
          console.log('Found handler for message type:', data.type);
          await handler(ws, data, wss);
        } else {
          console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    });

    ws.on('close', async () => {
      console.log('WebSocket connection closing');
      if (ws.userId) {
        try {
          const user = await User.findById(ws.userId);
          if (user) {
            await user.updateLastActive();
          }
          activeConnections.delete(ws.userId);
          console.log(`Client ${ws.userId} disconnected. Active connections:`, Array.from(activeConnections.keys()));
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

// Helper function to get WebSocket connection for a user
function getUserConnection(userId) {
  return activeConnections.get(userId);
}

module.exports = {
  setupWebSocketHandlers,
  getUserConnection
}; 