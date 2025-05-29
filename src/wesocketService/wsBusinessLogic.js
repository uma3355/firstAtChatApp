const WebSocket = require('ws');
const User = require('./models/user');
const Conversation = require('./models/conversation');
const Message = require('./models/message');

async function handleLogin(ws, data) {
  console.log("Login attempt detected");
  
  try {
    let user = await User.findOne({ username: data.username });
    
    if (!user) {
      // Create new user if doesn't exist
      user = await User.create({
        username: data.username,
        display_name: data.display_name || data.username
      });
    }

    // Update last active timestamp
    await user.updateLastActive();

    // Send login response
    const loginResponse = {
      type: 'login_response',
      success: true,
      user: {
        id: user._id,
        username: user.username,
        display_name: user.display_name
      }
    };
    ws.send(JSON.stringify(loginResponse));
    
    ws.clientId = user._id.toString();
    console.log(`Client logged in as: ${ws.clientId}`);

    // Get user's conversations with populated data
    const conversations = await Conversation.find({ participants: user._id })
      .sort({ last_message_at: -1 })
      .populate('participants', 'username display_name')
      .populate('last_message_id');

    // Send conversations to client
    ws.send(JSON.stringify({
      type: 'conversations',
      conversations: conversations
    }));

  } catch (error) {
    console.error('Login error:', error);
    ws.send(JSON.stringify({
      type: 'login_response',
      success: false,
      error: 'Login failed'
    }));
  }
}

async function handleChatMessage(ws, data, wss) {
  console.log("Chat message detected");
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
    let recipientFound = false;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.clientId === recipient_id) {
        client.send(JSON.stringify(messageData));
        recipientFound = true;
      }
    });

    // Send confirmation to sender
    ws.send(JSON.stringify({
      ...messageData,
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

async function handleDisconnect(ws) {
  if (ws.clientId) {
    try {
      const user = await User.findById(ws.clientId);
      if (user) {
        await user.updateLastActive();
      }
      console.log(`Client ${ws.clientId} disconnected`);
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }
}

module.exports = {
  handleLogin,
  handleChatMessage,
  handleDisconnect
}; 