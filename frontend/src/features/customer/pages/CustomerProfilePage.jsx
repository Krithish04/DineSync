import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, Sparkles, Plus, Landmark, Coins, Gift, Settings } from 'lucide-react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import LoyaltyCard from '../components/LoyaltyCard';
import CustomerTimeline from '../components/CustomerTimeline';
import useAuthStore from '@/features/auth/store/auth.store';
import * as customerApi from '../api/customer.api';

export default function CustomerProfilePage() {
  const { customerId } = useParams();
  const restaurantId = useAuthStore((state) => state.restaurant?._id);
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loyaltyTx, setLoyaltyTx] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Manual points correction form
  const [adjPoints, setAdjPoints] = useState('');
  const [adjReason, setAdjReason] = useState('');

  // Load customer profile data
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await customerApi.getCustomer(restaurantId, customerId);
      setCustomer(data.customer);
      setOrders(data.orders || []);
      setReservations(data.reservations || []);

      const txHistory = await customerApi.listLoyaltyTransactions(restaurantId, { customer: customerId });
      setLoyaltyTx(txHistory || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer profile details.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, customerId]);

  useEffect(() => {
    if (restaurantId && customerId) {
      loadProfile();
    }
  }, [restaurantId, customerId, loadProfile]);

  // Award Birthday Bonus
  const handleBirthdayBonus = async () => {
    setError('');
    setSuccess('');
    setIsProcessing(true);
    try {
      await customerApi.awardBirthdayReward(restaurantId, customerId);
      setSuccess('Birthday reward points (100 pts) awarded successfully.');
      loadProfile();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to award birthday reward.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Adjust Points manually
  const handlePointsAdjustment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const pts = parseInt(adjPoints, 10);
    if (isNaN(pts) || pts === 0) return setError('Please enter a valid non-zero points adjustment value.');
    if (!adjReason.trim()) return setError('Please enter an adjustment reason.');

    setIsProcessing(true);
    try {
      await customerApi.adjustPoints(restaurantId, customerId, pts, adjReason.trim());
      setSuccess(`Adjusted points by ${pts > 0 ? `+${pts}` : pts} successfully.`);
      setAdjPoints('');
      setAdjReason('');
      loadProfile();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adjust points.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <RestaurantLayout title="Customer Profile">
        <Loader label="Opening customer file..." />
      </RestaurantLayout>
    );
  }

  if (error && !customer) {
    return (
      <RestaurantLayout title="Customer Profile">
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout
      title="Restaurant Management"
      description="Personal information, loyalty tiers, visit timelines, and balance adjusters."
    >
      <div className="space-y-6">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/restaurant/customers/list')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Customers List
        </button>

        {/* Notifications */}
        {error && (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            {success}
          </div>
        )}

        {/* Top grid: Profile Overview & Loyalty Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Metadata Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <User className="h-4.5 w-4.5 text-primary" /> Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Diet Preference</span>
                  <span className="font-semibold text-foreground">{customer.dietaryPreference || 'Non Veg'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Date of birth</span>
                  <span className="font-semibold text-foreground">
                    {customer.dateOfBirth
                      ? new Date(customer.dateOfBirth).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono text-foreground">{customer.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate select-all text-foreground">{customer.email || '-'}</span>
                </div>
              </div>

              {customer.address && (
                <div className="border-t border-border/40 pt-3 flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{customer.address}</span>
                </div>
              )}

              {customer.notes && (
                <div className="border-t border-border/40 pt-3 bg-muted/20 p-2.5 rounded">
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold mb-1">Internal Notes</span>
                  <p className="italic text-muted-foreground text-[11px]">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Premium Loyalty Card */}
          <LoyaltyCard customer={customer} />
        </div>

        {/* Dashboard Split columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: statistics & adjustments */}
          <div className="lg:col-span-1 space-y-6">
            {/* Visit values metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Patron Spent Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-xs border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Total Visits</span>
                  <span className="font-bold text-foreground font-mono">{customer.visitCount || 0} times</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Lifetime Spent</span>
                  <span className="font-bold text-foreground font-mono">₹{customer.totalSpent?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Average Order Value (AOV)</span>
                  <span className="font-bold text-foreground font-mono">₹{customer.averageOrderValue?.toFixed(2) || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Loyalty adjustments tools */}
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Settings className="h-3.5 w-3.5 shrink-0" />
                  CRM Loyalty Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Birthday award */}
                <div className="border-b border-border/40 pb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs gap-1 border-primary/20 hover:bg-primary/5 text-primary"
                    onClick={handleBirthdayBonus}
                    isLoading={isProcessing}
                  >
                    <Gift className="h-4 w-4" /> Award Birthday Reward (+100 pts)
                  </Button>
                </div>

                {/* Adjust Points form */}
                <form onSubmit={handlePointsAdjustment} className="space-y-3">
                  <Label className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Manual Adjustment</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="e.g. +150"
                      value={adjPoints}
                      onChange={(e) => setAdjPoints(e.target.value)}
                      className="col-span-1 text-center text-xs font-mono h-9"
                      required
                    />
                    <Input
                      placeholder="Reason notes..."
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      className="col-span-2 text-xs h-9"
                      required
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full text-xs h-8" isLoading={isProcessing}>
                    Apply Adjustment
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Timeline & Point transactions */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="h-full">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold">Activity logs</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-6">
                  {/* Timeline listing */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Visits Timeline</p>
                    <CustomerTimeline orders={orders} reservations={reservations} />
                  </div>

                  {/* Loyalty Ledger transaction records */}
                  {loyaltyTx.length > 0 && (
                    <div className="border-t border-border/60 pt-6 space-y-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Points Transactions Ledger</p>
                      
                      <div className="overflow-x-auto border rounded bg-card max-h-[220px] overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase">
                              <th className="p-2 font-medium">Type</th>
                              <th className="p-2 font-medium text-center">Points</th>
                              <th className="p-2 font-medium">Description</th>
                              <th className="p-2 font-medium text-center">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loyaltyTx.map((tx) => {
                              const isPos = tx.points > 0;
                              return (
                                <tr key={tx._id} className="border-b border-border/40 last:border-none">
                                  <td className="p-2">
                                    <span className={`inline-flex rounded px-1.5 py-0.1 text-[8px] font-bold uppercase ${
                                      tx.transactionType === 'Earned' ? 'bg-emerald-50 text-emerald-800' :
                                      tx.transactionType === 'Redeemed' ? 'bg-rose-50 text-rose-800' :
                                      'bg-blue-50 text-blue-800'
                                    }`}>
                                      {tx.transactionType}
                                    </span>
                                  </td>
                                  <td className="p-2 text-center font-mono font-bold">
                                    <span className={isPos ? 'text-emerald-600' : 'text-rose-600'}>
                                      {isPos ? `+${tx.points}` : tx.points}
                                    </span>
                                  </td>
                                  <td className="p-2 text-muted-foreground truncate max-w-[150px]">{tx.reason || '-'}</td>
                                  <td className="p-2 text-center text-muted-foreground font-mono">
                                    {new Date(tx.createdAt).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}
