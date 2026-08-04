import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AuthLayout from '@/features/auth/components/AuthLayout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';

export default function AdminLoginPage() {
  const {
    form,
    error,
    isLoading,
    handleChange,
    handleSubmit,
  } = useLoginForm({
    defaultRedirect: '/super-admin/dashboard',
    omitRestaurantSlug: true,
  });

  return (
    <AuthLayout
      title="Platform Admin Sign In"
      description="DineSync AI system management portal"
      footer={
        <div>
          <Link to="/login" className="font-medium text-primary hover:underline">
            ← Back to portal selection
          </Link>
        </div>
      }
    >
      <div className="mb-4 p-3 rounded-lg border border-purple-500/20 bg-purple-500/10 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0" />
        <p className="text-xs font-medium text-purple-700 dark:text-purple-400">
          Restricted Area — Super administrative access only.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Admin Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="admin@dinesync.com"
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

        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" isLoading={isLoading}>
          Sign in as Platform Admin
        </Button>
      </form>
    </AuthLayout>
  );
}
