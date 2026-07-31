import api from '@/lib/axios';

/**
 * Registers a brand-new restaurant tenant together with its owner account.
 * The account starts unverified; an OTP is emailed automatically.
 * @param {{ restaurantName: string, ownerName: string, email: string, password: string, phone?: string, address?: string }} payload
 */
export const registerRestaurant = async (payload) => {
  const { data } = await api.post('/auth/register-restaurant', payload);
  return data.data;
};

/**
 * Registers a staff member or customer under an existing restaurant tenant.
 * Also starts unverified and requires OTP confirmation.
 * @param {{ name: string, email: string, password: string, phone?: string, role?: string, restaurantSlug: string }} payload
 */
export const registerUser = async (payload) => {
  const { data } = await api.post('/auth/register', payload);
  return data.data;
};

/**
 * Confirms a registration OTP. On success the backend also logs the user in.
 * @param {{ email: string, restaurantSlug?: string, otp: string }} payload
 */
export const verifyEmail = async (payload) => {
  const { data } = await api.post('/auth/verify-email', payload);
  return data.data;
};

/**
 * Resends an OTP for either 'email_verification' or 'password_reset'.
 * @param {{ email: string, restaurantSlug?: string, purpose: 'email_verification' | 'password_reset' }} payload
 */
export const resendOtp = async (payload) => {
  const { data } = await api.post('/auth/resend-otp', payload);
  return data.data;
};

/**
 * Logs a user in. Omit restaurantSlug for a platform super_admin.
 * @param {{ email: string, password: string, restaurantSlug?: string }} payload
 */
export const login = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data.data;
};

export const logout = async () => {
  const { data } = await api.post('/auth/logout');
  return data.data;
};

/**
 * Starts the forgot-password flow. Always resolves without revealing
 * whether the email actually exists.
 * @param {{ email: string, restaurantSlug?: string }} payload
 */
export const forgotPassword = async (payload) => {
  const { data } = await api.post('/auth/forgot-password', payload);
  return data.data;
};

/**
 * Completes the forgot-password flow with the emailed OTP + a new password.
 * @param {{ email: string, restaurantSlug?: string, otp: string, newPassword: string }} payload
 */
export const resetPassword = async (payload) => {
  const { data } = await api.post('/auth/reset-password', payload);
  return data.data;
};

export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data.data;
};
