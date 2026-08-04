import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '@/features/auth/store/auth.store';
import * as authApi from '@/features/auth/api/auth.api';

/**
 * Custom hook to encapsulate common login form logic, API calls, error handling,
 * and post-authentication routing across role-specific login flows.
 *
 * @param {{ defaultRedirect?: string, omitRestaurantSlug?: boolean, onSuccess?: (result: any) => void }} options
 */
export function useLoginForm(options = {}) {
  const { defaultRedirect = '/dashboard', omitRestaurantSlug = false, onSuccess } = options;

  const [form, setForm] = useState({ email: '', password: '', restaurantSlug: '' });
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || defaultRedirect;

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
        ...(!omitRestaurantSlug && form.restaurantSlug ? { restaurantSlug: form.restaurantSlug } : {}),
      };

      const result = await authApi.login(payload);
      setSession(result);

      if (onSuccess) {
        onSuccess(result);
      } else if (result?.user?.role === 'chef') {
        navigate('/kds', { replace: true });
      } else if (result?.user?.role === 'super_admin') {
        navigate('/super-admin/dashboard', { replace: true });
      } else {
        navigate(redirectTo, { replace: true });
      }
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

  return {
    form,
    setForm,
    error,
    setError,
    needsVerification,
    isLoading,
    handleChange,
    handleSubmit,
  };
}
