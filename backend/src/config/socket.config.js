const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { isAllowedOrigin } = require('./cors.config');
const redisConfig = require('./redis.config');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: isAllowedOrigin,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  // Attach Redis adapter for multi-instance PM2/container scaling if Redis is available
  try {
    const pubClient = redisConfig.createDuplicateClient();
    const subClient = redisConfig.createDuplicateClient();

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        // eslint-disable-next-line no-console
        console.log('[Socket.io] Redis adapter attached successfully.');
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[Socket.io] Redis adapter connect failed, using in-memory adapter:', err.message || err);
      });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Socket.io] Failed to initialize Redis adapter:', err.message || err);
  }

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
