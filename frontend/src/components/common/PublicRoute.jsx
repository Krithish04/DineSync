import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '@/features/auth/store/auth.store';

/**
 * PublicRoute prevents logged-in users from accessing login / register pages,
 * keeping their active session URL locked and preventing unnecessary login bounces.
 */
export default function PublicRoute() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from?.pathname;
    if (from && from !== '/login') {
      return <Navigate to={from} replace />;
    }

    if (user?.role === 'chef') {
      return <Navigate to="/kds" replace />;
    }
    if (user?.role === 'staff') {
      return <Navigate to="/restaurant/staff-orders" replace />;
    }
    if (user?.role === 'super_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
