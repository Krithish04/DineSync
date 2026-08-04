import { Link } from 'react-router-dom';
import AuthLayout from '@/features/auth/components/AuthLayout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';

export default function RestaurantLoginPage() {
  const {
    form,
    error,
    needsVerification,
    isLoading,
    handleChange,
    handleSubmit,
  } = useLoginForm({ defaultRedirect: '/dashboard' });

  return (
    <AuthLayout
      title="Restaurant Team Sign In"
      description="Sign in to manage your restaurant, orders, and team."
      footer={
        <div className="space-y-2">
          <div>
            Don&apos;t have a restaurant on DineSync yet?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create one
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
          Sign in to Restaurant
        </Button>
      </form>
    </AuthLayout>
  );
}
