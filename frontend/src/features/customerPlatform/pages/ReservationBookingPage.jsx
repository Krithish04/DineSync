import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, Users, PartyPopper, MessageSquare, CheckCircle2, ChevronRight, AlertCircle, ShieldCheck, Utensils } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Loader from '@/components/common/Loader';
import useCartStore from '../store/cart.store';
import useCustomerAuthStore from '../store/customerAuth.store';
import CustomerAuthModal from '../components/CustomerAuthModal';
import * as customerApi from '../api/customerPlatform.api';

import QrCodeRequiredCard from '../components/QrCodeRequiredCard';

const OCCASIONS = ['Other', 'Birthday', 'Anniversary', 'Business', 'Family'];

export default function ReservationBookingPage() {
  const navigate = useNavigate();
  const { restaurantId: paramRestaurantId } = useParams();

  const setRestaurantIdInCart = useCartStore((s) => s.setRestaurantId);
  const storedRestaurantId = useCartStore((s) => s.restaurantId);
  const restaurantId = paramRestaurantId || storedRestaurantId;

  useEffect(() => {
    if (paramRestaurantId && setRestaurantIdInCart) {
      setRestaurantIdInCart(paramRestaurantId);
    }
  }, [paramRestaurantId, setRestaurantIdInCart]);

  const { customer, token } = useCustomerAuthStore();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Form State
  const todayStr = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    reservationDate: todayStr,
    reservationTime: '19:00',
    numberOfGuests: 2,
    occasion: 'Other',
    specialRequest: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [myReservations, setMyReservations] = useState([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [error, setError] = useState('');

  const loadMyReservations = useCallback(async () => {
    if (!token || !restaurantId) return;
    setIsLoadingReservations(true);
    try {
      const res = await customerApi.getMyReservations(restaurantId);
      setMyReservations(res || []);
    } catch {
      setMyReservations([]);
    } finally {
      setIsLoadingReservations(false);
    }
  }, [token, restaurantId]);

  if (!restaurantId) {
    return (
      <CustomerLayout title="Table Reservation">
        <QrCodeRequiredCard message="Please scan the restaurant or table QR code to book a table reservation." />
      </CustomerLayout>
    );
  }

  useEffect(() => {
    loadMyReservations();
  }, [loadMyReservations]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'numberOfGuests' ? parseInt(value, 10) || 1 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const res = await customerApi.createReservation(restaurantId, form);
      setSubmittedBooking(res.reservation);
      loadMyReservations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit table reservation request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerLayout title="Table Reservation">
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 text-primary font-bold font-display text-base">
            <Calendar className="h-5 w-5" />
            <span>Book a Dining Table</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reserve your table in advance. Your booking request will be sent directly to our staff for table assignment and confirmation.
          </p>
        </div>

        {/* Not Logged In State */}
        {!token && (
          <div className="bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20 rounded-2xl p-6 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-foreground">Login Required to Book</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Please verify your mobile number with OTP to link table reservations and receive confirmation updates.
              </p>
            </div>
            <Button onClick={() => setIsAuthModalOpen(true)} className="w-full text-xs font-bold gap-1.5">
              <span>Sign In with Mobile OTP</span>
              <ChevronRight size={15} />
            </Button>
          </div>
        )}

        {/* Successful Booking Confirmation Card */}
        {submittedBooking && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={28} className="shrink-0 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold font-display">Reservation Request Sent!</h3>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">Ref #{submittedBooking.reservationNumber}</p>
              </div>
            </div>

            <div className="bg-card border border-emerald-500/20 rounded-xl p-4 text-xs space-y-2 text-foreground">
              <div className="grid grid-cols-2 gap-2 border-b border-border/40 pb-2">
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Date &amp; Time</span>
                  <span className="font-bold">{submittedBooking.reservationDate} at {submittedBooking.reservationTime}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Guests</span>
                  <span className="font-bold">{submittedBooking.numberOfGuests} Person(s)</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-muted-foreground">Booking Status:</span>
                <span className="font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  {submittedBooking.reservationStatus} (Awaiting Table Assignment)
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Our restaurant team will review table availability and confirm your reservation shortly. You can check status anytime under <strong className="text-foreground">My Reservations</strong>.
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmittedBooking(null)}
              className="w-full text-xs"
            >
              Book Another Reservation
            </Button>
          </div>
        )}

        {/* Booking Form */}
        {token && !submittedBooking && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-5 shadow-xs">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reservationDate" className="text-xs font-semibold flex items-center gap-1">
                    <Calendar size={13} className="text-primary" /> Date *
                  </Label>
                  <Input
                    id="reservationDate"
                    name="reservationDate"
                    type="date"
                    min={todayStr}
                    value={form.reservationDate}
                    onChange={handleChange}
                    className="text-xs h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reservationTime" className="text-xs font-semibold flex items-center gap-1">
                    <Clock size={13} className="text-primary" /> Time *
                  </Label>
                  <Input
                    id="reservationTime"
                    name="reservationTime"
                    type="time"
                    value={form.reservationTime}
                    onChange={handleChange}
                    className="text-xs h-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="numberOfGuests" className="text-xs font-semibold flex items-center gap-1">
                    <Users size={13} className="text-primary" /> Guests *
                  </Label>
                  <Input
                    id="numberOfGuests"
                    name="numberOfGuests"
                    type="number"
                    min="1"
                    max="20"
                    value={form.numberOfGuests}
                    onChange={handleChange}
                    className="text-xs h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="occasion" className="text-xs font-semibold flex items-center gap-1">
                    <PartyPopper size={13} className="text-primary" /> Occasion
                  </Label>
                  <select
                    id="occasion"
                    name="occasion"
                    value={form.occasion}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1"
                  >
                    {OCCASIONS.map((occ) => (
                      <option key={occ} value={occ}>
                        {occ}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="specialRequest" className="text-xs font-semibold flex items-center gap-1">
                  <MessageSquare size={13} className="text-primary" /> Special Requests (Optional)
                </Label>
                <textarea
                  id="specialRequest"
                  name="specialRequest"
                  value={form.specialRequest}
                  onChange={handleChange}
                  placeholder="e.g. Quiet corner, high chair for baby, dietary preferences..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground min-h-[70px]"
                />
              </div>

              <Button type="submit" className="w-full text-xs font-bold h-10 gap-2" isLoading={isSubmitting}>
                <Utensils size={15} />
                <span>Request Table Booking</span>
              </Button>
            </form>
          </div>
        )}

        {/* Existing Reservations Timeline */}
        {token && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-xs font-bold font-display uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" /> My Table Reservations
              </h4>
              <span className="text-[11px] font-mono text-muted-foreground">{myReservations.length} booking(s)</span>
            </div>

            {isLoadingReservations ? (
              <Loader label="Fetching reservation history..." />
            ) : myReservations.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <p className="text-xs text-muted-foreground">No reservation requests submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myReservations.map((resv) => (
                  <div key={resv._id} className="border border-border/80 rounded-xl p-3.5 space-y-2 text-xs bg-muted/20">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-muted-foreground text-[11px]">{resv.reservationNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        resv.reservationStatus === 'Confirmed' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                        resv.reservationStatus === 'Seated' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' :
                        resv.reservationStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                        resv.reservationStatus === 'Cancelled' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}>
                        {resv.reservationStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Date &amp; Time</span>
                        <span className="font-semibold text-foreground">{resv.reservationDate} @ {resv.reservationTime}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Party &amp; Table</span>
                        <span className="font-semibold text-foreground">
                          {resv.numberOfGuests} Guests • {resv.table?.tableNumber ? `Table #${resv.table.tableNumber}` : 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    {resv.specialRequest && (
                      <p className="text-[11px] text-muted-foreground bg-card p-2 rounded border border-border/40">
                        <strong className="text-foreground">Req:</strong> {resv.specialRequest}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CustomerAuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </CustomerLayout>
  );
}
