import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '@/features/auth/components/AuthLayout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import * as authApi from '@/features/auth/api/auth.api';

const initialState = { email: '', password: '', restaurantSlug: '' };

export default function LoginPage() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setNeedsVerification(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setIsLoading(true);

    try {
      const payload = {
        email: form.email,
        password: form.password,
        ...(form.restaurantSlug ? { restaurantSlug: form.restaurantSlug } : {}),
      };
      const result = await authApi.login(payload);
      setSession(result);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to log in. Please try again.';
      setError(message);
      if (err.response?.status === 403 && /verify your email/i.test(message)) {
        setNeedsVerification(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to manage your restaurant, orders, and team."
      footer={
        <>
          Don&apos;t have a restaurant on DineSync yet?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
            {needsVerification && (
              <>
                {' '}
                <Link
                  to="/verify-otp"
                  state={{ email: form.email, restaurantSlug: form.restaurantSlug }}
                  className="font-medium underline"
                >
                  Verify now
                </Link>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="restaurantSlug">Restaurant ID (optional)</Label>
          <Input
            id="restaurantSlug"
            name="restaurantSlug"
            placeholder="e.g. pizza-hub"
            value={form.restaurantSlug}
            onChange={handleChange}
            autoComplete="organization"
          />
          <p className="text-xs text-muted-foreground">
            Leave blank if you're signing in as a DineSync platform admin.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@restaurant.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
