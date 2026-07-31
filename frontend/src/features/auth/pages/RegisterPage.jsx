import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/features/auth/components/AuthLayout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import * as authApi from '@/features/auth/api/auth.api';

const initialState = {
  restaurantName: '',
  ownerName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  address: '',
};

export default function RegisterPage() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      const result = await authApi.registerRestaurant(payload);
      navigate('/verify-otp', {
        state: { email: payload.email, restaurantSlug: result?.restaurant?.slug || '' },
        replace: true,
      });
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      const message =
        apiErrors?.[0]?.message || err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Bring your restaurant onto DineSync"
      description="Create your restaurant's workspace and owner account in one step."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
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
          <Label htmlFor="restaurantName">Restaurant name</Label>
          <Input
            id="restaurantName"
            name="restaurantName"
            required
            placeholder="Pizza Hub"
            value={form.restaurantName}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerName">Your name</Label>
          <Input
            id="ownerName"
            name="ownerName"
            required
            placeholder="Jordan Lee"
            value={form.ownerName}
            onChange={handleChange}
            autoComplete="name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="owner@restaurant.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Restaurant address</Label>
          <Input
            id="address"
            name="address"
            placeholder="123 Main Street, Springfield"
            value={form.address}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create restaurant workspace
        </Button>
      </form>
    </AuthLayout>
  );
}
