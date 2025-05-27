const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store offline messages for each user
const offlineMessages = new Map();

// Serve a simple HTML page for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WebSocket Chat</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        #loginForm { margin-bottom: 20px; }
        #chatForm { display: none; }
        #messages { border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: scroll; }
        #messageInput { width: 200px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>WebSocket Chat</h1>
      
      <div id="loginForm">
        <h2>Login</h2>
        <input type="text" id="userId" placeholder="User ID">
        <input type="password" id="password" placeholder="Password">
        <button onclick="login()">Login</button>
      </div>

      <div id="chatForm">
        <h2>Chat</h2>
        <div id="messages"></div>
        <input type="text" id="recipient" placeholder="Recipient ID">
        <input type="text" id="messageInput" placeholder="Type a message...">
        <button onclick="sendMessage()">Send</button>
      </div>

      <script>
        const ws = new WebSocket('ws://' + window.location.host);
        let currentUserId = '';

        ws.onmessage = (event) => {
          const messages = document.getElementById('messages');
          const message = document.createElement('div');
          message.textContent = event.data;
          messages.appendChild(message);
          messages.scrollTop = messages.scrollHeight;
        };

        function login() {
          const userId = document.getElementById('userId').value;
          const password = document.getElementById('password').value;
          
          if (userId && password) {
            const loginMessage = {
              type: 'login',
              userId: userId,
              password: password
            };
            ws.send(JSON.stringify(loginMessage));
            currentUserId = userId;
            
            // Show chat form after login
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('chatForm').style.display = 'block';
          }
        }

        function sendMessage() {
          const recipient = document.getElementById('recipient').value;
          const message = document.getElementById('messageInput').value;
          
          if (recipient && message) {
            const chatMessage = {
              clientId: currentUserId,
              recipient: recipient,
              message: message
            };
            ws.send(JSON.stringify(chatMessage));
            document.getElementById('messageInput').value = '';
          }
        }
      </script>
    </body>
    </html>
  `);
});

//store user a


// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Combined message handler for both login and chat messages
  ws.on('message', (message) => {
    console.log("Received raw message:", message.toString());
    try {
      const data = JSON.parse(message);
      console.log("Parsed message data:", data);
      
      // Handle login
      if (data.type === 'login') {
        console.log("Login attempt detected");
        ws.clientId = data.userId;
        console.log(`Client logged in as: ${ws.clientId}`);
        
        // Check for offline messages
        if (offlineMessages.has(ws.clientId)) {
          const messages = offlineMessages.get(ws.clientId);
          messages.forEach(msg => {
            ws.send(JSON.stringify(msg));
          });
          offlineMessages.delete(ws.clientId);
          console.log(`Delivered ${messages.length} offline messages to ${ws.clientId}`);
        }
      }
      // Handle chat messages
      else {
        console.log("Chat message detected");
        const { clientId, recipient, message } = data;
        const messageData = {
          clientId,
          recipient,
          message,
          timestamp: new Date().toISOString()
        };

        // Try to find the recipient's connection
        let recipientFound = false;
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client.clientId === recipient) {
            client.send(JSON.stringify(messageData));
            recipientFound = true;
          }
        });

        // If recipient is offline, store the message
        if (!recipientFound) {
          if (!offlineMessages.has(recipient)) {
            offlineMessages.set(recipient, []);
          }
          offlineMessages.get(recipient).push(messageData);
          console.log(`Stored offline message for ${recipient}`);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client ${ws.clientId} disconnected`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error: ${error}`);
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
