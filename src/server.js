require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { connectToDatabase, closeDatabase } = require('./wesocketService/db/mongodb');
const { router: userRoutes } = require('./wesocketService/routes/userRoutes');
const { setupWebSocketHandlers } = require('./wesocketService/wsMessageHandler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server
});
const PORT = process.env.PORT
// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/users', userRoutes);

// Setup WebSocket handlers
setupWebSocketHandlers(wss);

// Start server


async function startServer() {
  try {
    await connectToDatabase();
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server is running on port ${PORT || 8080}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  await closeDatabase();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();