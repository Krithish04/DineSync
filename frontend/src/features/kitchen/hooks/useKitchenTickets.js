import { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@/features/auth/store/auth.store';
import * as kitchenApi from '../api/kitchen.api';

export const STATIONS = ['Main Kitchen', 'Tandoor', 'Bar', 'Dessert', 'Beverage'];

/**
 * Custom hook encapsulating shared logic for fetching, filtering, and real-time Socket.IO
 * updates for Kitchen Display System (KDS) tickets and statistics.
 */
export function useKitchenTickets() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [selectedStation, setSelectedStation] = useState('Main Kitchen');
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load KDS Tickets & Stats
  const loadKDSData = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError('');
    try {
      const [ticketsResult, statsResult] = await Promise.all([
        kitchenApi.listTickets(restaurantId, { station: selectedStation }),
        kitchenApi.getKitchenStats(restaurantId),
      ]);

      setTickets(ticketsResult || []);
      setStats(statsResult);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load KDS dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, selectedStation]);

  useEffect(() => {
    if (restaurantId) {
      loadKDSData();
    }
  }, [restaurantId, selectedStation, loadKDSData]);

  // Real-time Socket.IO Connection for KDS Ticket Updates
  useEffect(() => {
    if (!restaurantId) return;

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    const socketURL = baseURL.replace('/api/v1', '');

    const socket = io(socketURL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join:restaurant', restaurantId);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('kitchen:tickets_created', (newTickets) => {
      const matched = newTickets.filter((t) => t.station === selectedStation);

      if (matched.length > 0) {
        setTickets((prev) => {
          const filterNew = matched.filter((m) => !prev.some((p) => p._id === m._id));
          return [...prev, ...filterNew];
        });

        kitchenApi.getKitchenStats(restaurantId).then(setStats).catch(() => {});
      }
    });

    socket.on('kitchen:ticket_updated', (updatedTicket) => {
      const isCorrectStation = updatedTicket.station === selectedStation;

      setTickets((prev) => {
        const exists = prev.some((t) => t._id === updatedTicket._id);

        if (exists) {
          if (['Served'].includes(updatedTicket.status) || !isCorrectStation) {
            return prev.filter((t) => t._id !== updatedTicket._id);
          } else {
            return prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t));
          }
        } else if (['Pending', 'Preparing', 'Ready', 'Delayed'].includes(updatedTicket.status) && isCorrectStation) {
          return [...prev, updatedTicket];
        }
        return prev;
      });

      kitchenApi.getKitchenStats(restaurantId).then(setStats).catch(() => {});
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId, selectedStation]);

  // Full Screen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Status transitions
  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const updated = await kitchenApi.updateTicketStatus(restaurantId, ticketId, newStatus);
      if (newStatus === 'Served') {
        setTickets((prev) => prev.filter((t) => t._id !== ticketId));
      } else {
        setTickets((prev) => prev.map((t) => (t._id === ticketId ? updated : t)));
      }

      const newStats = await kitchenApi.getKitchenStats(restaurantId);
      setStats(newStats);
    } catch {
      // Non-fatal
    }
  };

  const handleTicketDrop = async (ticketId, targetStatus) => {
    await handleStatusChange(ticketId, targetStatus);
  };

  const handleItemStatusChange = async (ticketId, itemId, itemStatus) => {
    try {
      const updated = await kitchenApi.updateTicketItemStatus(restaurantId, ticketId, itemId, itemStatus);
      setTickets((prev) => prev.map((t) => (t._id === ticketId ? updated : t)));
    } catch {
      // Non-fatal
    }
  };

  // Separate tickets into Kanban lanes
  const lanes = useMemo(() => {
    return {
      pending: tickets.filter((t) => t.status === 'Pending'),
      preparing: tickets.filter((t) => ['Preparing', 'Delayed'].includes(t.status)),
      ready: tickets.filter((t) => t.status === 'Ready'),
    };
  }, [tickets]);

  return {
    selectedStation,
    setSelectedStation,
    stats,
    tickets,
    lanes,
    isLoading,
    error,
    socketConnected,
    isFullscreen,
    toggleFullscreen,
    handleStatusChange,
    handleTicketDrop,
    handleItemStatusChange,
    refreshData: loadKDSData,
  };
}
