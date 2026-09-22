import { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@/features/auth/store/auth.store';
import { playKitchenAlertSound } from '@/utils/soundAlert.util';
import * as kitchenApi from '../api/kitchen.api';

import * as restaurantApi from '@/features/restaurant/api/restaurant.api';

import { getApiBaseUrl } from '@/lib/axios';

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
  const [socketRef, setSocketRef] = useState(null);

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

  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('dinesync_kds_muted') === 'true';
  });
  const [hasVisualFlashSignal, setHasVisualFlashSignal] = useState(false);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('dinesync_kds_muted', String(next));
      return next;
    });
  }, []);

  const triggerNewTicketAlert = useCallback((incomingTickets) => {
    // 1. Play audible chime if NOT muted
    if (!isMuted) {
      playKitchenAlertSound();
    }
    // 2. Voice order & table number callout via Web Speech API
    if (!isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const ticket = Array.isArray(incomingTickets) ? incomingTickets[0] : incomingTickets;
        const table = ticket?.table?.tableNumber || ticket?.table?.tableName || ticket?.tableNumber || ticket?.order?.table?.tableNumber || ticket?.table;
        const text = table ? `New order arrived for Table ${table}` : `New kitchen order received`;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Voice callout fallback
      }
    }
    // 3. ALWAYS trigger visual pulse signal equivalent (hearing-impaired staff accessibility signal)
    setHasVisualFlashSignal(true);
    setTimeout(() => setHasVisualFlashSignal(false), 4500);
  }, [isMuted]);

  const [manualPeakOverride, setManualPeakOverride] = useState(null); // null = Auto mode, true = Forced ON, false = Forced OFF
  const [slaCounts, setSlaCounts] = useState({ atRiskCount: 0, lateCount: 0 });

  // Auto-detect Peak Mode if active tickets for selected station > 8 OR if any tickets are SLA at-risk/late
  const isPeakModeAuto = useMemo(() => {
    return tickets.length > 8 || slaCounts.atRiskCount > 0 || slaCounts.lateCount > 0;
  }, [tickets.length, slaCounts.atRiskCount, slaCounts.lateCount]);

  // Peak Mode resolves to manual override if set, otherwise follows auto-detection
  const isPeakMode = manualPeakOverride !== null ? manualPeakOverride : isPeakModeAuto;

  const togglePeakMode = useCallback(() => {
    setManualPeakOverride((prev) => {
      if (prev === null) return !isPeakModeAuto; // cycle to manual opposite of auto
      if (prev === !isPeakModeAuto) return isPeakModeAuto; // cycle to manual same as auto
      return null; // reset back to pure auto mode
    });
  }, [isPeakModeAuto]);

  // Real-time Socket.IO Connection for KDS Ticket Updates
  useEffect(() => {
    if (!restaurantId) return;

    const apiBase = getApiBaseUrl();
    const socketURL = apiBase
      ? apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '')
      : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

    const socket = io(socketURL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
    });

    setSocketRef(socket);

    socket.on('connect', () => {
      setSocketConnected(true);
      setError('');
      socket.emit('join:restaurant', restaurantId);
      socket.emit('join:tenant', restaurantId);
    });

    socket.on('disconnect', (reason) => {
      setSocketConnected(false);
      // eslint-disable-next-line no-console
      console.warn(`[KDS Socket] Disconnected (${reason}).`);
    });

    socket.on('connect_error', (err) => {
      setSocketConnected(false);
      // eslint-disable-next-line no-console
      console.warn(`[KDS Socket Connect Error] ${err.message}`);
    });

    socket.on('reconnect_failed', () => {
      setSocketConnected(false);
      setError('Kitchen Socket Server unreachable after retries. Click Retry to reconnect.');
    });

    socket.on('restaurant:settings_updated', (updatedSettings) => {
      if (updatedSettings?.kitchenStations && updatedSettings.kitchenStations.length > 0) {
        setStations(updatedSettings.kitchenStations);
        setSelectedStation((prev) => (updatedSettings.kitchenStations.includes(prev) ? prev : updatedSettings.kitchenStations[0]));
      }
    });

    socket.on('kitchen:queue_rescored', (rescoredData) => {
      if (rescoredData) {
        setSlaCounts({
          atRiskCount: rescoredData.atRiskCount || 0,
          lateCount: rescoredData.lateCount || 0,
        });

        // Update local ticket state priorityFlags and calculatedPriorityScores
        if (rescoredData.tickets) {
          const scoreMap = {};
          rescoredData.tickets.forEach((st) => {
            scoreMap[st.ticketId] = st;
          });

          setTickets((prev) => {
            const updated = prev.map((t) => {
              const matchedScored = scoreMap[String(t._id)];
              if (matchedScored) {
                return {
                  ...t,
                  priorityFlag: matchedScored.priorityFlag,
                  calculatedPriorityScore: matchedScored.calculatedPriorityScore,
                  targetReadyTime: matchedScored.targetReadyTime,
                  sequenceOrder: matchedScored.sequenceOrder,
                };
              }
              return t;
            });

            // Re-sort by calculatedPriorityScore descending
            updated.sort((a, b) => (b.calculatedPriorityScore || 0) - (a.calculatedPriorityScore || 0));
            return updated;
          });
        }
      }
    });

    socket.on('kitchen:tickets_created', (newTickets) => {
      triggerNewTicketAlert(newTickets);
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
      triggerNewTicketAlert();
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
  }, [restaurantId, selectedStation, loadKDSData, triggerNewTicketAlert]);

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

  const retrySocket = useCallback(() => {
    if (socketRef) {
      socketRef.connect();
    }
    loadKDSData();
  }, [socketRef, loadKDSData]);

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
    isMuted,
    toggleMute,
    hasVisualFlashSignal,
    isPeakMode,
    isPeakModeAuto,
    manualPeakOverride,
    togglePeakMode,
    atRiskCount: slaCounts.atRiskCount,
    lateCount: slaCounts.lateCount,
    refreshData: loadKDSData,
    retrySocket,
  };
}

