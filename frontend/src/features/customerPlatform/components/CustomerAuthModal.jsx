import { useState } from 'react';
import { User, Phone, ShieldCheck, ArrowRight, Lock, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import * as customerApi from '../api/customerPlatform.api';

/**
 * Customer Table Session Login & OTP Verification Modal.
 * Authenticates diner with Name, Phone & OTP to claim Table Host rights.
 */
export default function CustomerAuthModal({ isOpen, onClose }) {
  const { loginTableHost, tableNumber, tableId, restaurantId = '66aa11112222333344445555', activeTableSessions } = useCartStore();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  // Check if table is currently active with another host
  const existingSession = tableId ? activeTableSessions[tableId] : null;

  const handleSendOtp = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    // Generate 6-digit mock OTP for dev
    const code = '123456';
    setGeneratedOtp(code);
    setOtp(code); // Pre-fill for smooth UX
    setStep('otp');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      if (otp !== generatedOtp && otp !== '123456') {
        setError('Invalid OTP code. Please enter 123456');
        setIsVerifying(false);
        return;
      }

      // 1. Claim table host on backend (updates table status to 'Occupied' in DB and broadcasts socket event to Manager dashboard)
      if (tableId && restaurantId) {
        await customerApi.claimTableHost(restaurantId, {
          tableId,
          hostName: name,
          hostPhone: phone,
        }).catch(() => null);
      }

      // 2. Complete local store login & claim table host session
      loginTableHost({ name, phone });
      setIsVerifying(false);
      onClose();
    } catch {
      setError('Failed to complete verification.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <ShieldCheck size={30} />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold font-display text-foreground">
            {tableNumber ? `Table #${tableNumber} Sign In` : 'Customer Sign In'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Enter your Name & Phone Number with OTP verification to start ordering at your table.
          </p>
        </div>

        {/* Existing Session Alert */}
        {existingSession && existingSession.hostPhone !== phone && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Lock size={14} />
              <span>Table Session Active</span>
            </div>
            <p className="text-[11px] leading-tight">
              Table #{tableNumber} is currently claimed by <strong>{existingSession.hostName}</strong>. If you log in with another phone, you will browse in View-Only mode.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* STEP 1: Enter Name & Phone */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="Your Full Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="relative">
                <Phone size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="tel"
                  required
                  placeholder="10-Digit Mobile Number *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 text-xs font-semibold">
              <span>Send Verification OTP</span>
              <ArrowRight size={15} />
            </Button>
          </form>
        )}

        {/* STEP 2: Enter 6-Digit OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-muted/40 p-3 rounded-xl text-xs space-y-1 text-center">
              <p className="text-muted-foreground">OTP code sent to <strong>{phone}</strong></p>
              <p className="text-[11px] text-primary font-semibold">Use OTP Code: 123456</p>
            </div>

            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Enter 6-Digit OTP *"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-center tracking-widest text-sm font-mono border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('phone')}
                className="w-1/3 text-xs"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isVerifying}
                className="w-2/3 text-xs gap-1.5 font-semibold"
              >
                <CheckCircle2 size={15} />
                <span>{isVerifying ? 'Verifying...' : 'Verify & Start'}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
