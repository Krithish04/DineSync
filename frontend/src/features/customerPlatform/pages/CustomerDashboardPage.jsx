import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ShoppingBag, Award, ChevronRight, Utensils, ShieldCheck, Clock, LogOut, Calendar } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import NoOrderExitModal from '../components/NoOrderExitModal';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import useCartStore from '../store/cart.store';
import useCustomerAuthStore from '../store/customerAuth.store';
import * as customerApi from '../api/customerPlatform.api';

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const restaurantId = useCartStore((state) => state.restaurantId);
  const { customer, token, setCustomerSession, clearCustomerSession } = useCustomerAuthStore();

  const [profile, setProfile] = useState(customer);
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const handleSignOut = () => {
    setIsExitModalOpen(true);
  };

  const loadCustomerData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const [profileRes, ordersRes, resvRes] = await Promise.allSettled([
        customerApi.getCustomerProfile(restaurantId),
        customerApi.getCustomerOrders(restaurantId),
        customerApi.getMyReservations(restaurantId),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setProfile(profileRes.value);
        setCustomerSession({ token, customer: profileRes.value });
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value) {
        setOrders(ordersRes.value.orders || []);
      }

      if (resvRes.status === 'fulfilled' && resvRes.value) {
        setReservations(resvRes.value || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer profile.');
    } finally {
      setIsLoading(false);
    }
  }, [token, restaurantId, setCustomerSession]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  if (!token && !profile) {
    return (
      <CustomerLayout title="Diner Profile & Orders">
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <ShieldCheck size={30} />
          </div>
          <div>
            <h3 className="text-base font-bold font-display text-foreground">Sign In to View Orders &amp; Reservations</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Verify your mobile number to view active orders, table bookings, track loyalty points, and redeem rewards.
            </p>
          </div>
          <Button onClick={() => navigate('/menu')} className="w-full text-xs font-semibold gap-2">
            <span>Browse Digital Menu</span>
            <ChevronRight size={15} />
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const fullName = profile?.fullName || 'Guest Diner';
  const phone = profile?.phoneNumber || '—';
  const tier = profile?.membershipTier || 'Bronze';
  const points = profile?.loyaltyPoints ?? 0;
  const visitCount = profile?.visitCount ?? orders.length;

  return (
    <CustomerLayout title="Diner Profile & Orders">
      <div className="space-y-4">
        {/* User Profile Banner */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-base font-display shrink-0">
              {fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold font-display text-foreground truncate">{fullName}</h3>
              <p className="text-xs text-muted-foreground truncate">{phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              {tier} Member
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
              title="Sign Out Account"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Quick Action Banners */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div
            onClick={() => navigate('/menu/reservations')}
            className="bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer rounded-xl p-3.5 space-y-1 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1 font-medium">
                <Calendar size={14} className="text-primary" /> Book a Table
              </span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xs font-bold text-foreground font-display">Reserve Table</p>
          </div>

          <div
            onClick={() => navigate('/customer/loyalty')}
            className="bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer rounded-xl p-3.5 space-y-1 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1 font-medium">
                <Award size={14} className="text-amber-500" /> Loyalty Points
              </span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-primary font-display">{points} Pts</p>
          </div>
        </div>

        {/* Dedicated Loyalty Dashboard Banner Card */}
        <div
          onClick={() => navigate('/customer/loyalty')}
          className="bg-gradient-to-r from-amber-500/10 via-primary/10 to-purple-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-colors shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600">
              <Award size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">DineSync Loyalty Rewards</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">View membership tier perks &amp; point redemption options</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* My Reservations Card */}
        {reservations.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" /> My Table Bookings
              </h4>
              <span className="text-[11px] font-mono text-muted-foreground">{reservations.length} booking(s)</span>
            </div>

            <div className="space-y-2">
              {reservations.slice(0, 3).map((resv) => (
                <div key={resv._id} className="border border-border/70 rounded-xl p-3 space-y-1 text-xs bg-muted/10">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="font-mono text-muted-foreground text-[10px]">{resv.reservationNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      resv.reservationStatus === 'Confirmed' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                      resv.reservationStatus === 'Seated' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' :
                      resv.reservationStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                      'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {resv.reservationStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-foreground">
                    <span>{resv.reservationDate} @ {resv.reservationTime}</span>
                    <span className="font-semibold">{resv.numberOfGuests} Guests • {resv.table?.tableNumber ? `Table #${resv.table.tableNumber}` : 'Unassigned'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real Past Order History */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-primary" /> Recent Order History
            </h4>
            <span className="text-[11px] font-mono text-muted-foreground">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          </div>

          {isLoading ? (
            <Loader label="Fetching order history..." />
          ) : orders.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Utensils className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-xs font-semibold text-foreground">No past orders found</p>
              <p className="text-[11px] text-muted-foreground">Orders placed with your logged-in phone will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.map((ord) => {
                const itemsSummary = (ord.items || [])
                  .map((i) => `${i.quantity}x ${i.itemName}`)
                  .join(', ');
                const orderDate = ord.createdAt
                  ? new Date(ord.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <div key={ord._id} className="border border-border rounded-xl p-3.5 space-y-1.5 text-xs bg-muted/20 hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="font-mono text-foreground">#{ord.orderNumber || ord._id?.slice(-6)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.orderStatus === 'Completed' || ord.orderStatus === 'Served'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {ord.orderStatus}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-[11px] line-clamp-2">{itemsSummary || 'Dine-In Order'}</p>

                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-border/40 text-muted-foreground">
                      <span>{orderDate}</span>
                      <span className="font-bold text-foreground font-display text-xs">₹{Number(ord.grandTotal || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <NoOrderExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onCompleteSignOut={() => navigate('/menu')}
      />
    </CustomerLayout>
  );
}
