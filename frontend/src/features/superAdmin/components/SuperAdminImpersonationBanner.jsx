import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/features/auth/store/auth.store';
import * as superAdminApi from '../api/superAdmin.api';

export default function SuperAdminImpersonationBanner() {
  const navigate = useNavigate();
  const { user, restaurant, setSession } = useAuthStore();

  if (!user?.isImpersonating) return null;

  const handleExitImpersonation = async () => {
    try {
      const res = await superAdminApi.exitImpersonation();
      if (res?.token) {
        const decodedUser = { ...user, isImpersonating: false, restaurant: null };
        setSession(decodedUser, null, res.token);
      }
      navigate('/super-admin/tenants', { replace: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to exit impersonation:', err);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md border-b border-purple-500/30 font-medium">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
        <span>
          <strong className="text-purple-300 font-bold uppercase tracking-wide mr-1">Super Admin Impersonation Mode:</strong>
          Viewing tenant workspace <span className="font-bold underline decoration-amber-400">{restaurant?.name || user?.impersonatedRestaurantName || 'Restaurant'}</span>
        </span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleExitImpersonation}
        className="h-7 px-3 text-[11px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold gap-1.5 rounded-lg shrink-0 shadow-xs"
      >
        <LogOut className="h-3.5 w-3.5" />
        Exit Impersonation
      </Button>
    </div>
  );
}
