import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/features/auth/components/AuthLayout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import * as authApi from '@/features/auth/api/auth.api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authApi.forgotPassword({
        email,
        ...(restaurantSlug ? { restaurantSlug } : {}),
      });
      navigate('/reset-password', { state: { email, restaurantSlug }, replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter your email and we'll send you a reset code."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="restaurantSlug">Restaurant ID (optional)</Label>
          <Input
            id="restaurantSlug"
            name="restaurantSlug"
            placeholder="e.g. pizza-hub"
            value={restaurantSlug}
            onChange={(e) => setRestaurantSlug(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@restaurant.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send reset code
        </Button>
      </form>
    </AuthLayout>
  );
}
