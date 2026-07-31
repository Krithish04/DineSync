import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-display text-7xl font-semibold text-destructive">403</p>
      <h1 className="font-display text-2xl font-semibold text-foreground">Access denied</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        You don't have permission to view this page with your current role.
      </p>
      <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
    </div>
  );
}
