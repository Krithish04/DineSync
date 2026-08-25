import React, { useState, useEffect } from 'react';
import { Lock, Phone, Clock, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * TableReservationLockModal — Renders when a guest attempts to view/order at a table
 * that is currently locked by an upcoming reservation (15-min buffer window).
 * Demands guest's registered mobile number to verify arrival and unlock digital menu.
 */
export default function TableReservationLockModal({
  lockInfo,
  restaurantId,
  tableId,
  onUnlocked,
}) {
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [minsLeft, setMinsLeft] = useState(lockInfo?.minutesUntilCancellation || 15);

  useEffect(() => {
    const timer = setInterval(() => {
      setMinsLeft((prev) => Math.max(0, prev - 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter your 10-digit registered mobile number.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${baseURL}/restaurants/${restaurantId}/tables/${tableId}/verify-reservation-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Mobile number verification failed.');
      }

      setSuccessMsg(data.message || 'Reservation verified! Digital menu unlocked.');
      setTimeout(() => {
        if (onUnlocked) onUnlocked(data.data?.reservation);
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card border-2 border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Lock Icon Banner */}
        <div className="relative mx-auto w-16 h-16 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border-2 border-amber-500/30">
          <Lock className="w-8 h-8 animate-bounce" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold font-display text-foreground flex items-center justify-center gap-2">
            <span>Table {lockInfo?.tableNumber || ''} is Reserved</span>
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This table is locked for an upcoming booking at{' '}
            <strong className="text-foreground font-mono">{lockInfo?.reservationTime || ''}</strong>.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2 text-left text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Arrival Grace Window:
            </span>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-300">{minsLeft} mins left</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Enter your registered mobile number to verify your reservation and unlock digital self-ordering. Unclaimed bookings will be auto-cancelled in {minsLeft} minutes.
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              Registered Mobile Number
            </label>
            <div className="relative">
              <Input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 h-11 text-sm font-mono tracking-wider font-bold"
                disabled={isSubmitting || Boolean(successMsg)}
                autoFocus
              />
              <span className="absolute left-3 top-3 text-muted-foreground text-xs font-bold font-mono">+91</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs font-semibold text-destructive flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 text-xs font-bold gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md"
            disabled={isSubmitting || Boolean(successMsg)}
          >
            <ShieldCheck className="w-4 h-4" />
            {isSubmitting ? 'Verifying Phone...' : 'Verify Phone & Unlock Menu'}
          </Button>
        </form>

        <p className="text-[10px] text-muted-foreground">
          Need assistance? Please notify restaurant reception staff to seat your reservation manually.
        </p>
      </div>
    </div>
  );
}
