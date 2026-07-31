import { create } from 'zustand';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  activeRestaurantId: null,

  connect: (restaurantId) => {
    let currentSocket = get().socket;

    if (!currentSocket) {
      currentSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      currentSocket.on('connect', () => {
        set({ isConnected: true });
        const resId = get().activeRestaurantId;
        if (resId && currentSocket) {
          currentSocket.emit('join:restaurant', resId);
          currentSocket.emit('join:tenant', resId);
        }
      });

      currentSocket.on('disconnect', () => set({ isConnected: false }));

      set({ socket: currentSocket });
    }

    if (restaurantId) {
      set({ activeRestaurantId: restaurantId });
      if (currentSocket && currentSocket.connected) {
        currentSocket.emit('join:restaurant', restaurantId);
        currentSocket.emit('join:tenant', restaurantId);
      }
    }

    return currentSocket;
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, activeRestaurantId: null });
    }
  },
}));

export default useSocketStore;
