const WebSocket = require('ws');
const { handleLogin, handleChatMessage, handleDisconnect } = require('./wsBusinessLogic');

function setupWebSocketHandler(wss) {
  wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.on('message', async (message) => {
      console.log("Received raw message:", message.toString());
      try {
        const data = JSON.parse(message);
        console.log("Parsed message data:", data);
        
        if (data.type === 'login') {
          await handleLogin(ws, data);
        } else {
          await handleChatMessage(ws, data, wss);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    });

    ws.on('close', async () => {
      await handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error: ${error}`);
    });
  });
}

module.exports = setupWebSocketHandler;
