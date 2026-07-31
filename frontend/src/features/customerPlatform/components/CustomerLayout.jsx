import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu as MenuIcon, User, Star, Lock, LogOut, CheckCircle2, ChevronRight, UserCheck, ShieldCheck, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import useSocketStore from '@/store/socket.store';
import CartDrawer from './CartDrawer';
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
    restaurantId = '66aa11112222333344445555',
    orderType,
    tableHost,
    isViewOnly,
    placedOrders = [],
    signOutHost,
    activeTableSessions,
  } = useCartStore();

  const connectSocket = useSocketStore((state) => state.connect);
  const socket = useSocketStore((state) => state.socket);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const activeSessionHostName = tableId && activeTableSessions[tableId]?.hostName;

  // Auto-connect to Socket.IO restaurant tenant room
  useEffect(() => {
    if (restaurantId) {
      connectSocket(restaurantId);
    }
  }, [restaurantId, connectSocket]);

  // Real-time listener for Force Logout / Table Release from Manager Dashboard
  useEffect(() => {
    if (!socket || !tableId) return;

    const handleTableUpdate = (data) => {
      if (String(data?.tableId) === String(tableId) && data?.status === 'Available') {
        signOutHost();
      }
    };

    socket.on('table:updated', handleTableUpdate);
    return () => socket.off('table:updated', handleTableUpdate);
  }, [socket, tableId, signOutHost]);

  const handleSignOutClick = async () => {
    if (placedOrders && placedOrders.length > 0) {
      // SCENARIO A: Food was ordered -> Open Payment Settlement modal!
      setIsPaymentModalOpen(true);
    } else {
      // SCENARIO B: Logged in & logged out WITHOUT ordering -> Immediately release table & end session!
      if (tableId && restaurantId) {
        await customerApi.releaseTableHost(restaurantId, { tableId }).catch(() => null);
      }
      signOutHost();
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col pb-20 sm:pb-0">
      {/* Mobile Top App Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 h-14 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/menu')}>
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
          {tableHost ? (
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold">
              <UserCheck size={14} />
              <span className="max-w-[90px] truncate">{tableHost.name}</span>
              <button
                onClick={handleSignOutClick}
                className="ml-1 text-muted-foreground hover:text-destructive"
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
              className="text-xs gap-1 h-8 text-primary border-primary/30"
            >
              <ShieldCheck size={14} />
              <span>Sign In</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 h-9 w-9"
          >
            <ShoppingBag size={20} className="text-foreground" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* SINGLE ACTIVE HOST LOCK ALERT BANNER */}
      {isViewOnly && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={15} className="shrink-0" />
            <span>
              Table session active with <strong>{activeSessionHostName || 'Table Host'}</strong>. You are in <strong>View-Only Mode</strong>.
            </span>
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
              className="text-[11px] font-semibold text-primary hover:underline flex items-center"
            >
              Track <ChevronRight size={12} />
            </button>
            <Button
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 rounded-lg shadow-xs gap-1"
            >
              <Receipt size={12} /> Settle Bill &amp; Leave
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 container max-w-2xl py-4 px-4">{children}</main>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around h-16 sm:hidden">
        <NavLink
          to="/menu/browse"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`
          }
        >
          <MenuIcon size={18} />
          <span>Menu</span>
        </NavLink>

        <NavLink
          to="/menu/cart"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs font-medium relative ${isActive ? 'text-primary' : 'text-muted-foreground'}`
          }
        >
          <ShoppingBag size={18} />
          <span>Cart</span>
          {itemCount > 0 && (
            <span className="absolute -top-1 right-2 bg-primary text-primary-foreground text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/menu/feedback"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`
          }
        >
          <Star size={18} />
          <span>Review</span>
        </NavLink>

        <NavLink
          to="/customer/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`
          }
        >
          <User size={18} />
          <span>Account</span>
        </NavLink>
      </nav>

      {/* Slide-Over Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Customer OTP Login Modal */}
      <CustomerAuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Final Table Payment Settlement Modal */}
      <TablePaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />
    </div>
  );
}
