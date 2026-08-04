import { Link, useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import AuthLayout from '@/features/auth/components/AuthLayout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';

export default function KitchenLoginPage() {
  const navigate = useNavigate();

  const {
    form,
    error,
    needsVerification,
    isLoading,
    handleChange,
    handleSubmit,
  } = useLoginForm({
    onSuccess: () => {
      navigate('/kds', { replace: true });
    },
  });

  return (
    <AuthLayout
      title={
        <div className="flex items-center gap-2">
          <span>Kitchen Display System Sign In</span>
        </div>
      }
      description="Touch-friendly sign in for kitchen staff & chefs"
      footer={
        <div className="space-y-2">
          <div>
            Not a chef?{' '}
            <Link to="/login/restaurant" className="font-medium text-primary hover:underline">
              Sign in as restaurant team
            </Link>
          </div>
          <div>
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              ← Switch to portal selection
            </Link>
          </div>
        </div>
      }
    >
      <div className="mb-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center gap-3">
        <ChefHat className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Kitchen Display Console — Optimized for touchscreen display units.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
            {error}
            {needsVerification && (
              <>
                {' '}
                <Link
                  to="/verify-otp"
                  state={{ email: form.email, restaurantSlug: form.restaurantSlug }}
                  className="font-semibold underline"
                >
                  Verify now
                </Link>
              </>
            )}
          </div>
        )}



        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold text-foreground">
            Chef Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="chef@restaurant.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            className="h-12 text-base px-4"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-base font-semibold text-foreground">
              Password
            </Label>
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
            className="h-12 text-base px-4"
          />
        </div>

        <Button type="submit" className="w-full h-12 text-base font-semibold" isLoading={isLoading}>
          Sign in to KDS
        </Button>
      </form>
    </AuthLayout>
  );
}
