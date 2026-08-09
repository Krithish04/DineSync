import { useState } from 'react';
import { User, Phone, ShieldCheck, ArrowRight, Lock, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '../store/cart.store';
import useCustomerAuthStore from '../store/customerAuth.store';
import * as customerApi from '../api/customerPlatform.api';

/**
 * Customer Table Session Login & Real Phone OTP Verification Modal.
 * Authenticates diner with Phone & OTP for profile, order history, and loyalty tracking.
 */
export default function CustomerAuthModal({ isOpen, onClose, onSuccess }) {
  const { loginTableHost, tableNumber, tableId, restaurantId, activeTableSessions } = useCartStore();
  const setCustomerSession = useCustomerAuthStore((state) => state.setCustomerSession);

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  // Check if table is currently active with another host
  const existingSession = tableId ? activeTableSessions[tableId] : null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSending(true);
    try {
      const res = await customerApi.sendCustomerOtp(restaurantId, { phone: cleanPhone });
      if (res?.devOtp) {
        setDevOtpHint(res.devOtp);
        setOtp(res.devOtp); // Pre-fill in dev mode for smooth testing
      } else {
        setDevOtpHint('');
      }
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    const cleanPhone = phone.replace(/\D/g, '');
    try {
      const res = await customerApi.verifyCustomerOtp(restaurantId, {
        phone: cleanPhone,
        code: otp,
        fullName: name.trim() || undefined,
      });

      // 1. Save real customer session token & profile
      if (res?.token && res?.customer) {
        setCustomerSession({ token: res.token, customer: res.customer });
      }

      let claimedSession = null;
      let hostToken = null;
      // 2. Optionally claim table host session if tableId is present
      if (tableId && restaurantId) {
        try {
          const claimRes = await customerApi.claimTableHost(restaurantId, {
            tableId,
            hostName: name.trim() || res.customer?.fullName || 'Guest',
            hostPhone: cleanPhone,
          });
          if (claimRes?.session) {
            claimedSession = claimRes.session;
          }
          if (claimRes?.hostToken) {
            hostToken = claimRes.hostToken;
          }
        } catch (claimErr) {
          if (claimErr.response?.status === 409) {
            setError(claimErr.response?.data?.message || 'Table is currently occupied by another diner. You are in View-Only mode.');
            setIsVerifying(false);
            return;
          }
        }
      }

      const hostPayload = {
        name: name.trim() || res.customer?.fullName || 'Guest',
        phone: cleanPhone,
        sessionId: claimedSession?._id || claimedSession?.sessionId,
        hostToken,
      };

      loginTableHost(hostPayload);
      setIsVerifying(false);
      onClose();

      if (typeof onSuccess === 'function') {
        onSuccess(hostPayload);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete verification. Please check the code.');
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
            Sign in with your phone & OTP to place your order and start table session.
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

        {/* STEP 1: Enter Phone & Name */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-3">
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

              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Your Full Name (Optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <Button type="submit" disabled={isSending} className="w-full gap-2 text-xs font-semibold">
              <span>{isSending ? 'Sending OTP...' : 'Send Verification OTP'}</span>
              <ArrowRight size={15} />
            </Button>
          </form>
        )}

        {/* STEP 2: Enter 6-Digit OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-muted/40 p-3 rounded-xl text-xs space-y-1 text-center">
              <p className="text-muted-foreground">OTP code sent to <strong>{phone}</strong></p>
              {devOtpHint && (
                <p className="text-[11px] text-primary font-semibold">Dev OTP Code: {devOtpHint}</p>
              )}
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
                <span>{isVerifying ? 'Verifying...' : 'Verify & Sign In'}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
