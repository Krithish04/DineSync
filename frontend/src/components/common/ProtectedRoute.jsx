import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '@/features/auth/store/auth.store';

/**
 * Guards nested routes behind authentication, and optionally behind a
 * whitelist of allowed roles for RBAC-restricted sections of the app.
 *
 * @param {{ allowedRoles?: string[] }} props
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Safeguard: Redirect chef role users to dedicated /kds console
  if (user?.role === 'chef' && location.pathname !== '/kds') {
    return <Navigate to="/kds" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
