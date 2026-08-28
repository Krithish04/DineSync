import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu as MenuIcon, User, Star, Lock, LogOut, CheckCircle2, ChevronRight, UserCheck, ShieldCheck, Receipt, Award, Bell, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import useCustomerAuthStore from '../store/customerAuth.store';
import useSocketStore from '@/store/socket.store';
import StickyCartBar from './StickyCartBar';
import CustomerAuthModal from './CustomerAuthModal';
import TablePaymentModal from './TablePaymentModal';
import NoOrderExitModal from './NoOrderExitModal';
import DineSyncAssistantModal from './DineSyncAssistantModal';
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
  const [isNoOrderExitModalOpen, setIsNoOrderExitModalOpen] = useState(false);
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

  const [pendingItemForAuth, setPendingItemForAuth] = useState(null);
  const [incomingAccessRequest, setIncomingAccessRequest] = useState(null);
  const [accessRequestStatus, setAccessRequestStatus] = useState(null); // null | 'pending' | 'approved' | 'denied'
  const [accessRequestMessage, setAccessRequestMessage] = useState('');

  const isCoOrderer = useCartStore((s) => s.isCoOrderer);

  // Listen for custom event 'open-customer-auth' from menu item cards
  useEffect(() => {
    const handleOpenAuth = (e) => {
      if (e.detail?.pendingItem) {
        setPendingItemForAuth(e.detail.pendingItem);
      }
      setIsAuthModalOpen(true);
    };
    document.addEventListener('open-customer-auth', handleOpenAuth);
    return () => document.removeEventListener('open-customer-auth', handleOpenAuth);
  }, []);

  // Real-time listener for table session start, end, force release & access requests
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

    const handleAccessRequested = (data) => {
      if (String(data?.tableId) === String(tableId)) {
        const myPhone = customer?.phoneNumber || tableHost?.phone;
        // Only host gets the approval banner prompt
        if (tableHost && (!data.requesterPhone || data.requesterPhone !== myPhone)) {
          setIncomingAccessRequest(data);
        }
      }
    };

    const handleAccessResponded = (data) => {
      if (String(data?.tableId) === String(tableId)) {
        const myPhone = customer?.phoneNumber || tableHost?.phone;
        if (data.requesterPhone && data.requesterPhone === myPhone) {
          if (data.approved) {
            useCartStore.getState().setCoOrdererStatus('approved', true);
            setAccessRequestStatus('approved');
            setAccessRequestMessage('Request approved! You now have ordering access for this table session.');
          } else {
            useCartStore.getState().setCoOrdererStatus('denied', false);
            setAccessRequestStatus('denied');
            setAccessRequestMessage('Request declined — you can still view the menu and order status.');
          }
        }
      }
    };

    const handleHostPromoted = (data) => {
      if (String(data?.tableId) === String(tableId)) {
        const myPhone = customer?.phoneNumber || tableHost?.phone;
        if (data.newHostPhone && data.newHostPhone === myPhone) {
          setAccessRequestStatus('approved');
          setAccessRequestMessage('The original host departed. You have been promoted to Table Host!');
        }
      }
    };

    socket.on('table:updated', handleTableUpdate);
    socket.on('table:session-started', handleSessionStarted);
    socket.on('table:session-ended', handleSessionEnded);
    socket.on('access:requested', handleAccessRequested);
    socket.on('access:responded', handleAccessResponded);
    socket.on('table:host-promoted', handleHostPromoted);

    return () => {
      socket.off('table:updated', handleTableUpdate);
      socket.off('table:session-started', handleSessionStarted);
      socket.off('table:session-ended', handleSessionEnded);
      socket.off('access:requested', handleAccessRequested);
      socket.off('access:responded', handleAccessResponded);
      socket.off('table:host-promoted', handleHostPromoted);
    };
  }, [socket, tableId, customer?.phoneNumber, tableHost, setSessionContext, signOutHost, clearCustomerSession]);

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
    if (placedOrders && placedOrders.length > 0) {
      setIsPaymentModalOpen(true);
    } else {
      setIsNoOrderExitModalOpen(true);
    }
  };

  const handleRequestAccessSubmit = async () => {
    const myPhone = customer?.phoneNumber || tableHost?.phone;
    if (!myPhone) {
      setIsAuthModalOpen(true);
      return;
    }
    setAccessRequestStatus('pending');
    setAccessRequestMessage('Request sent to Table Host. Awaiting approval...');
    try {
      await customerApi.requestTableAccess(restaurantId, tableId, {
        requesterPhone: myPhone,
        requesterName: activeName || 'Guest',
      });
    } catch (err) {
      setAccessRequestStatus('denied');
      setAccessRequestMessage(err.response?.data?.message || 'Failed to send access request.');
    }
  };

  const handleApproveRequest = async () => {
    if (!incomingAccessRequest) return;
    try {
      await customerApi.respondTableAccess(restaurantId, tableId, {
        requestId: incomingAccessRequest.requestId,
        requesterPhone: incomingAccessRequest.requesterPhone,
        decision: 'approve',
      });
      setIncomingAccessRequest(null);
    } catch (err) {
      // Graceful error handling
    }
  };

  const handleDenyRequest = async () => {
    if (!incomingAccessRequest) return;
    try {
      await customerApi.respondTableAccess(restaurantId, tableId, {
        requestId: incomingAccessRequest.requestId,
        requesterPhone: incomingAccessRequest.requesterPhone,
        decision: 'deny',
      });
      setIncomingAccessRequest(null);
    } catch (err) {
      // Graceful error handling
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col pb-44 sm:pb-28">
      {/* Mobile Top App Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-3.5 sm:px-4 h-14 flex items-center justify-between shadow-xs w-full max-w-full overflow-hidden">
        <div className="flex flex-col justify-center shrink-0 cursor-pointer" onClick={() => navigate('/menu/browse')}>
          <span className="font-display text-sm sm:text-base font-bold text-primary tracking-tight leading-tight flex items-center gap-1">
            DineSync <span className="text-foreground">AI</span>
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5">
            {tableNumber ? (
              <span className="text-primary font-bold">Table #{tableNumber}</span>
            ) : (
              <span>{orderType || 'Dine-In Storefront'}</span>
            )}

            {/* Role Badge Indicator */}
            {tableHost && tableHost.phone ? (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center gap-0.5">
                <Star size={9} className="fill-amber-500 text-amber-500" /> Host
              </span>
            ) : isCoOrderer ? (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-0.5">
                <UserCheck size={9} /> Co-Orderer
              </span>
            ) : isViewOnly ? (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/15 text-slate-600 border border-slate-500/30 flex items-center gap-0.5">
                <Lock size={9} /> View-Only
              </span>
            ) : null}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 pr-0.5">
          <button
            type="button"
            onClick={handleCallStaff}
            disabled={isCallingStaff}
            className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] rounded-full bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center transition-all active:scale-95 touch-manipulation"
            title="Call Staff / Help"
            aria-label="Call Staff / Help"
          >
            <Bell size={16} className="text-amber-600 animate-pulse shrink-0" />
          </button>

          {activeName ? (
            <button
              type="button"
              onClick={handleSignOutClick}
              className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 flex items-center justify-center transition-all active:scale-95 touch-manipulation"
              title={`Logged in as ${activeName}. Tap to Settle Bill & Exit`}
              aria-label="Account Settings"
            >
              <UserCheck size={16} className="shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 flex items-center justify-center transition-all active:scale-95 touch-manipulation"
              title="Sign In / Guest Account"
              aria-label="Sign In / Guest Account"
            >
              <ShieldCheck size={16} className="shrink-0" />
            </button>
          )}
        </div>
      </header>

      {/* HOST INCOMING ACCESS REQUEST PROMPT (NON-BLOCKING BANNER) */}
      {incomingAccessRequest && (
        <div className="bg-primary/10 border-b border-primary/30 px-3.5 py-2.5 flex items-center justify-between text-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 pr-2">
            <UserCheck size={16} className="text-primary shrink-0 animate-pulse" />
            <p className="text-foreground text-[11px] leading-tight">
              Diner <strong>{incomingAccessRequest.maskedPhone}</strong> requested to join ordering on Table #{tableNumber}.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="xs" onClick={handleApproveRequest} className="h-7 text-[11px] px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              Approve
            </Button>
            <Button size="xs" variant="outline" onClick={handleDenyRequest} className="h-7 text-[11px] px-2 text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg">
              Deny
            </Button>
          </div>
        </div>
      )}

      {/* ACCESS REQUEST STATUS BANNER */}
      {accessRequestMessage && (
        <div className={`px-4 py-2 text-xs flex items-center justify-between font-medium shadow-xs animate-in slide-in-from-top duration-200 ${
          accessRequestStatus === 'approved' ? 'bg-emerald-600 text-white' : accessRequestStatus === 'denied' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
        }`}>
          <span className="text-[11px] font-semibold">{accessRequestMessage}</span>
          <button onClick={() => setAccessRequestMessage('')} className="text-white/80 hover:text-white text-xs font-bold p-1">✕</button>
        </div>
      )}

      {/* VIEW-ONLY MODE INFORMATIONAL BANNER */}
      {isViewOnly && !isCoOrderer && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3.5 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 pr-2">
            <Lock size={15} className="shrink-0 text-amber-600" />
            <p className="text-[11px] leading-tight">
              Table #{tableNumber} is active with Host <strong>{activeSessionHostName || 'another diner'}</strong>. You can view the menu and order status.
            </p>
          </div>
          <Button
            size="xs"
            onClick={handleRequestAccessSubmit}
            disabled={accessRequestStatus === 'pending'}
            className="h-7 text-[11px] px-2.5 font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shrink-0 shadow-xs"
          >
            {accessRequestStatus === 'pending' ? 'Requesting...' : 'Request to Order'}
          </Button>
        </div>
      )}

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
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Lock size={15} className="shrink-0 text-amber-600 animate-pulse" />
            <span>
              Table currently active with <strong>{activeSessionHostName || 'another guest'}</strong>. You are in <strong>View-Only Mode</strong>.
            </span>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setIsAuthModalOpen(true)}
            className="text-[11px] font-bold h-8 border-amber-500/40 text-amber-800 dark:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 rounded-lg shrink-0 touch-manipulation min-h-[36px]"
          >
            Request Host Transfer
          </Button>
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

        {placedOrders && placedOrders.length > 0 && (
          <NavLink
            to={`/menu/orders/${placedOrders[placedOrders.length - 1]._id}/track`}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold flex-1 h-full min-h-[44px] touch-manipulation transition-colors ${
                isActive ? 'text-primary' : 'text-amber-600 dark:text-amber-400 hover:text-foreground font-bold'
              }`
            }
          >
            <Clock size={20} className="animate-pulse" />
            <span>Track ({placedOrders.length})</span>
          </NavLink>
        )}

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
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingItemForAuth(null);
        }}
        pendingItem={pendingItemForAuth}
      />

      {/* Final Table Payment Settlement Modal */}
      <TablePaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />

      {/* Exit Feedback & Thank You Modal when signing out without ordering */}
      <NoOrderExitModal isOpen={isNoOrderExitModalOpen} onClose={() => setIsNoOrderExitModalOpen(false)} />

      {/* AI Assistant Floating Chatbot */}
      <DineSyncAssistantModal />
    </div>
  );
}
