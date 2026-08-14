import { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@/features/auth/store/auth.store';
import { playKitchenAlertSound } from '@/utils/soundAlert.util';
import * as kitchenApi from '../api/kitchen.api';

import * as restaurantApi from '@/features/restaurant/api/restaurant.api';

const DEFAULT_STATIONS = ['Main Kitchen', 'Tandoor', 'Bar', 'Dessert', 'Beverage'];

/**
 * Custom hook encapsulating shared logic for fetching, filtering, and real-time Socket.IO
 * updates for Kitchen Display System (KDS) tickets and statistics.
 */
export function useKitchenTickets() {
  const restaurantId = useAuthStore((state) => state.restaurant?._id);

  const [stations, setStations] = useState(DEFAULT_STATIONS);
  const [selectedStation, setSelectedStation] = useState('Main Kitchen');
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load configured stations from restaurant settings
  useEffect(() => {
    if (!restaurantId) return;
    restaurantApi.getSettings(restaurantId)
      .then((settings) => {
        if (settings?.kitchenStations && settings.kitchenStations.length > 0) {
          setStations(settings.kitchenStations);
          setSelectedStation((prev) => (settings.kitchenStations.includes(prev) ? prev : settings.kitchenStations[0]));
        }
      })
      .catch(() => {});
  }, [restaurantId]);

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

    socket.on('restaurant:settings_updated', (updatedSettings) => {
      if (updatedSettings?.kitchenStations && updatedSettings.kitchenStations.length > 0) {
        setStations(updatedSettings.kitchenStations);
        setSelectedStation((prev) => (updatedSettings.kitchenStations.includes(prev) ? prev : updatedSettings.kitchenStations[0]));
      }
    });

    socket.on('kitchen:tickets_created', (newTickets) => {
      playKitchenAlertSound();
      const ticketsArray = Array.isArray(newTickets) ? newTickets : [newTickets];
      const matched = ticketsArray.filter((t) => t.station === selectedStation && t.status !== 'Served');

      if (matched.length > 0) {
        setTickets((prev) => {
          const updated = [...prev];
          matched.forEach((m) => {
            const idx = updated.findIndex((p) => String(p._id) === String(m._id));
            if (idx >= 0) {
              updated[idx] = m;
            } else {
              updated.push(m);
            }
          });
          return updated;
        });

        kitchenApi.getKitchenStats(restaurantId).then(setStats).catch(() => {});
      }
      loadKDSData();
    });

    socket.on('order:created', () => {
      playKitchenAlertSound();
      loadKDSData();
    });

    socket.on('kitchen:ticket_updated', (updatedTicket) => {
      const isCorrectStation = updatedTicket.station === selectedStation;
      const isServed = updatedTicket.status === 'Served';

      setTickets((prev) => {
        const exists = prev.some((t) => String(t._id) === String(updatedTicket._id));

        if (isServed || !isCorrectStation) {
          return prev.filter((t) => String(t._id) !== String(updatedTicket._id));
        }

        if (exists) {
          return prev.map((t) => (String(t._id) === String(updatedTicket._id) ? updatedTicket : t));
        } else if (['Pending', 'Preparing', 'Ready', 'Delayed'].includes(updatedTicket.status)) {
          return [...prev, updatedTicket];
        }
        return prev;
      });

      kitchenApi.getKitchenStats(restaurantId).then(setStats).catch(() => {});
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId, selectedStation, loadKDSData]);

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
        setTickets((prev) => prev.filter((t) => String(t._id) !== String(ticketId)));
      } else {
        setTickets((prev) => prev.map((t) => (String(t._id) === String(ticketId) ? updated : t)));
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
      setTickets((prev) => {
        if (updated.status === 'Served') {
          return prev.filter((t) => String(t._id) !== String(ticketId));
        }
        return prev.map((t) => (String(t._id) === String(ticketId) ? updated : t));
      });

      const newStats = await kitchenApi.getKitchenStats(restaurantId);
      setStats(newStats);
    } catch {
      // Non-fatal
    }
  };

  // Separate tickets into 2 KDS Kanban lanes: Preparing (cooking/delayed) & Ready
  const lanes = useMemo(() => {
    return {
      preparing: tickets.filter((t) => ['Preparing', 'Delayed', 'Pending'].includes(t.status)),
      ready: tickets.filter((t) => t.status === 'Ready'),
    };
  }, [tickets]);

  return {
    stations,
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
