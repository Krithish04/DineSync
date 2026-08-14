import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu as MenuIcon, User, Star, Lock, LogOut, CheckCircle2, ChevronRight, UserCheck, ShieldCheck, Receipt, Award, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import useCustomerAuthStore from '../store/customerAuth.store';
import useSocketStore from '@/store/socket.store';
import StickyCartBar from './StickyCartBar';
import CustomerAuthModal from './CustomerAuthModal';
import TablePaymentModal from './TablePaymentModal';
import * as customerApi from '../api/customerPlatform.api';

/**
 * Storefront layout shell supporting Table Host Auth, Single Active Host Lock,
 * Continuous Ordering Loop, Table Payment Settlement on Sign Out, and Force Logout sync.
 */
export default function CustomerLayout({ title, children }) {
  const navigate = useNavigate();

  const {
    itemCount = 0,
    tableNumber,
    tableId,
    restaurantId,
    orderType,
    tableHost,
    isViewOnly,
    placedOrders = [],
    signOutHost,
    activeTableSessions,
    setSessionContext,
    setSessionId,
    setPlacedOrders,
    hostToken,
    setSessionOrderSummary,
    sessionOrderSummary = [],
  } = useCartStore();

  const connectSocket = useSocketStore((state) => state.connect);
  const socket = useSocketStore((state) => state.socket);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCallingStaff, setIsCallingStaff] = useState(false);
  const [callStaffSuccess, setCallStaffSuccess] = useState('');

  const { customer, clearCustomerSession } = useCustomerAuthStore();
  const [showSignOutToast, setShowSignOutToast] = useState(false);

  const activeSessionHostName = tableId && activeTableSessions[tableId]?.hostName;
  const activeName = customer?.fullName || tableHost?.name || null;
  const hasOrdersToReview = (placedOrders && placedOrders.length > 0) || (sessionOrderSummary && sessionOrderSummary.length > 0);

  // Auto-connect to Socket.IO restaurant tenant room
  useEffect(() => {
    if (restaurantId) {
      connectSocket(restaurantId);
    }
  }, [restaurantId, connectSocket]);

  // Fetch real active table session from backend on load
  useEffect(() => {
    if (!tableId || !restaurantId) return;

    customerApi.getActiveTableSession(restaurantId, tableId)
      .then((res) => {
        if (res && res.session) {
          const session = res.session;
          if (res.orderSummary) {
            setSessionOrderSummary(res.orderSummary);
          }

          const myPhone = customer?.phoneNumber || tableHost?.phone;
          const isHost = Boolean(hostToken || (myPhone && session.hostPhone && session.hostPhone === myPhone));

          if (isHost) {
            setSessionId(session._id || session.sessionId);
            if (res.orders && res.orders.length > 0) {
              setPlacedOrders(res.orders);
            }
            setSessionContext({
              tableId,
              tableStatus: 'Occupied',
              currentHostName: session.hostName,
              activeSessionId: session._id || session.sessionId,
            });
          } else {
            setSessionContext({
              tableId,
              tableStatus: 'Occupied',
              currentHostName: session.hostName,
              activeSessionId: session._id || session.sessionId,
            });
          }
        } else {
          setSessionOrderSummary([]);
        }
      })
      .catch(() => null);
  }, [tableId, restaurantId, customer?.phoneNumber, tableHost?.phone, hostToken, setSessionId, setPlacedOrders, setSessionContext, setSessionOrderSummary]);

  // Real-time listener for table session start, end & force release
  useEffect(() => {
    if (!socket || !tableId) return;

    const handleTableUpdate = (data) => {
      if (String(data?.tableId) === String(tableId)) {
        if (data?.status === 'Available' || data?.forceLogout) {
          signOutHost();
          clearCustomerSession();
        }
      }
    };

    const handleSessionStarted = (data) => {
      if (String(data?.tableId) === String(tableId)) {
        const myPhone = customer?.phoneNumber || tableHost?.phone;
        if (data.hostPhone && data.hostPhone !== myPhone) {
          setSessionContext({
            tableId,
            tableStatus: 'Occupied',
            currentHostName: data.hostName,
            activeSessionId: data.sessionId,
          });
        }
      }
    };

    const handleSessionEnded = (data) => {
      if (String(data?.tableId) === String(tableId)) {
        signOutHost();
        clearCustomerSession();
      }
    };

    socket.on('table:updated', handleTableUpdate);
    socket.on('table:session-started', handleSessionStarted);
    socket.on('table:session-ended', handleSessionEnded);

    return () => {
      socket.off('table:updated', handleTableUpdate);
      socket.off('table:session-started', handleSessionStarted);
      socket.off('table:session-ended', handleSessionEnded);
    };
  }, [socket, tableId, customer?.phoneNumber, tableHost?.phone, setSessionContext, signOutHost, clearCustomerSession]);

  const handleCallStaff = async () => {
    if (isCallingStaff) return;
    setIsCallingStaff(true);
    setCallStaffSuccess('');
    try {
      await customerApi.requestAssistance(restaurantId, {
        tableId,
        note: tableNumber ? `Table #${tableNumber} requested staff assistance.` : 'Guest requested staff assistance.',
      });
      setCallStaffSuccess('Staff alerted! A waiter will assist you shortly.');
      setTimeout(() => setCallStaffSuccess(''), 4000);
    } catch (err) {
      // Graceful fallback
    } finally {
      setIsCallingStaff(false);
    }
  };

  const handleSignOutClick = async () => {
    const { sessionId } = useCartStore.getState();
    if (placedOrders && placedOrders.length > 0) {
      // SCENARIO A: Food was ordered -> Open Payment Settlement modal!
      setIsPaymentModalOpen(true);
    } else {
      // SCENARIO B: Logged in & logged out WITHOUT ordering -> Immediately release table & end session!
      if (tableId && restaurantId) {
        if (sessionId) {
          await customerApi.releaseTableSession(restaurantId, sessionId, { tableId }).catch(() => null);
        } else {
          await customerApi.releaseTableHost(restaurantId, { tableId }).catch(() => null);
        }
      }
      signOutHost();
      clearCustomerSession();
      setShowSignOutToast(true);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col pb-36 sm:pb-24">
      {/* Mobile Top App Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 h-14 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/menu/browse')}>
          <span className="font-display text-lg font-bold text-primary">
            DineSync <span className="text-foreground">AI</span>
          </span>
          {tableNumber ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Table #{tableNumber}
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {orderType || 'Dine-In'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {tableNumber && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCallStaff}
              disabled={isCallingStaff}
              className="text-xs gap-1 h-9 text-amber-700 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 rounded-full font-semibold px-3 touch-manipulation min-h-[44px] sm:min-h-[36px]"
              title="Call Waiter / Staff to Table"
            >
              <Bell size={14} className="text-amber-600 animate-pulse" />
              <span>{isCallingStaff ? 'Notifying...' : 'Call Staff'}</span>
            </Button>
          )}

          {activeName ? (
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
              <UserCheck size={14} />
              <span className="max-w-[90px] truncate">{activeName}</span>
              <button
                onClick={handleSignOutClick}
                className="ml-1 text-muted-foreground hover:text-destructive p-1 min-w-[28px] min-h-[28px] flex items-center justify-center"
                title="Sign Out & Settle Table Bill"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs gap-1 h-9 min-h-[44px] sm:min-h-[36px] text-primary border-primary/30 px-3.5 touch-manipulation font-semibold"
            >
              <ShieldCheck size={14} />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </header>

      {/* CALL STAFF CONFIRMATION BANNER */}
      {callStaffSuccess && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs flex items-center justify-between font-semibold shadow-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <Bell size={15} className="animate-bounce" />
            <span>{callStaffSuccess}</span>
          </div>
          <button onClick={() => setCallStaffSuccess('')} className="text-amber-100 hover:text-white text-xs font-bold p-1">
            ✕
          </button>
        </div>
      )}

      {/* SIGN OUT FEEDBACK BANNER FOR CUSTOMER */}
      {showSignOutToast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-white" />
            <div>
              <p className="font-bold">Signed out successfully!</p>
              <p className="text-[11px] text-emerald-100">Thank you for dining with us. Share your experience to help us improve!</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => {
                setShowSignOutToast(false);
                navigate('/menu/feedback');
              }}
              className="h-8 text-[11px] font-bold bg-white text-emerald-800 hover:bg-emerald-50 px-2.5 rounded-lg shadow-xs min-h-[36px]"
            >
              Rate Experience
            </Button>
            <button
              onClick={() => setShowSignOutToast(false)}
              className="text-emerald-200 hover:text-white font-bold text-sm px-1.5 py-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* VIEW-ONLY MODE ALERT BANNER */}
      {isViewOnly && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={15} className="shrink-0" />
            <span>
              Table currently active with <strong>{activeSessionHostName || 'another guest'}</strong>. You are in <strong>View-Only Mode</strong>.
            </span>
          </div>
        </div>
      )}

      {/* VIEW-ONLY CURRENT TABLE ORDER SUMMARY */}
      {isViewOnly && sessionOrderSummary && sessionOrderSummary.length > 0 && (
        <div className="bg-card border-b border-border px-4 py-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground flex items-center gap-1.5 font-display">
              <Receipt size={15} className="text-primary" /> Current Table Order Summary
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold px-2 py-0.5 rounded-full">
              {sessionOrderSummary.reduce((acc, o) => acc + (o.items?.length || 0), 0)} Dish(es)
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {sessionOrderSummary.map((ord, oIdx) => (
              <div key={oIdx} className="bg-muted/40 border border-border/60 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                  <span>Order #{ord.orderNumber}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                    {ord.orderStatus}
                  </span>
                </div>
                <div className="space-y-1 pl-1 pt-0.5">
                  {(ord.items || []).map((it, iIdx) => (
                    <div key={iIdx} className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground font-medium">{it.quantity}x {it.name}</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                        {it.kitchenStatus || 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTINUOUS ORDERING LOOP & BILL SETTLEMENT BANNER */}
      {placedOrders.length > 0 && !isViewOnly && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 text-xs text-emerald-700 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600 animate-pulse" />
            <div>
              <p className="font-bold text-foreground">
                {placedOrders.length} Order{placedOrders.length > 1 ? 's' : ''} Sent to Kitchen
              </p>
              <p className="text-[10px] text-muted-foreground">Keep adding items or settle bill when finished</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/menu/orders/${placedOrders[placedOrders.length - 1]._id}/track`)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center p-1"
            >
              Track <ChevronRight size={12} />
            </button>
            <Button
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              className="h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-lg shadow-xs gap-1 min-h-[36px]"
            >
              <Receipt size={12} /> Settle Bill
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 container max-w-2xl py-4 px-4">{children}</main>

      {/* Persistent Swiggy/Zomato Style Sticky Cart Bar */}
      <StickyCartBar />

      {/* Mobile Sticky Bottom Navigation Bar (Consolidated 4-tab bar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border flex items-center justify-around h-16 sm:hidden shadow-lg">
        <NavLink
          to="/menu/browse"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold flex-1 h-full min-h-[44px] touch-manipulation transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          <MenuIcon size={20} />
          <span>Menu</span>
        </NavLink>

        <NavLink
          to="/customer/loyalty"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold flex-1 h-full min-h-[44px] touch-manipulation transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          <Award size={20} />
          <span>Loyalty</span>
        </NavLink>

        {hasOrdersToReview && (
          <NavLink
            to="/menu/feedback"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold flex-1 h-full min-h-[44px] touch-manipulation transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Star size={20} />
            <span>Review</span>
          </NavLink>
        )}

        <NavLink
          to="/customer/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold flex-1 h-full min-h-[44px] touch-manipulation transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          <User size={20} />
          <span>Account</span>
        </NavLink>
      </nav>

      {/* Customer OTP Login Modal */}
      <CustomerAuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Final Table Payment Settlement Modal */}
      <TablePaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />
    </div>
  );
}
