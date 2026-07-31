const { Server } = require('socket.io');
const env = require('./env.config');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join room scoped to a specific restaurant tenant to maintain strict isolation
    const handleJoin = (restaurantId) => {
      if (restaurantId) {
        socket.join(restaurantId.toString());
        // eslint-disable-next-line no-console
        console.log(`[Socket.io] Client ${socket.id} joined room: ${restaurantId}`);
      }
    };

    socket.on('join:restaurant', handleJoin);
    socket.on('join:tenant', handleJoin);

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIo = () => io;

/**
 * Broadcasts a real-time event to clients registered in a restaurant's room.
 * @param {string|ObjectId} restaurantId
 * @param {string} event
 * @param {any} data
 */
const broadcastEvent = (restaurantId, event, data) => {
  if (!io) {
    // eslint-disable-next-line no-console
    console.warn('[Socket.io] Cannot broadcast, socket.io is not initialized.');
    return;
  }
  if (restaurantId) {
    io.to(restaurantId.toString()).emit(event, data);
  } else {
    io.emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIo,
  broadcastEvent,
};
