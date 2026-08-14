import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import AuthLayout from '@/features/auth/components/AuthLayout';
import OtpInput from '@/components/ui/otp-input';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import * as authApi from '@/features/auth/api/auth.api';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  const email = location.state?.email || '';
  const restaurantSlug = location.state?.restaurantSlug || '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authApi.verifyEmail({ email, restaurantSlug, otp });
      setSession(result);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = useCallback(async () => {
    setError('');
    setInfo('');
    setIsResending(true);
    try {
      await authApi.resendOtp({ email, restaurantSlug, purpose: 'email_verification' });
      setInfo('A new code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not resend the code. Please try again.';
      const match = msg.match(/Please wait (\d+)s/i);
      if (match && match[1]) {
        setCooldown(parseInt(match[1], 10));
      }
      setError(msg);
    } finally {
      setIsResending(false);
    }
  }, [email, restaurantSlug]);

  return (
    <AuthLayout
      title="Verify your email"
      description={email ? `Enter the 6-digit code we sent to ${email}` : 'Enter your verification code'}
      footer={
        <>
          Wrong email?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Start over
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {info}
          </div>
        )}

        <OtpInput value={otp} onChange={setOtp} disabled={isSubmitting} />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Verify email
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Didn&apos;t get the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {isResending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
