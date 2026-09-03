import axios from 'axios';

const AUTH_STORAGE_KEY = 'dinesync-auth';
const CUSTOMER_AUTH_STORAGE_KEY = 'dinesync_customer_auth';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Reads the persisted staff auth store directly from localStorage.
 */c
function readPersistedAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state || null;
  } catch {
    return null;
  }
}

/**
 * Reads the persisted customer auth store directly from localStorage.
 */
function readPersistedCustomerAuth() {
  try {
    const raw = localStorage.getItem(CUSTOMER_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state || null;
  } catch {
    return null;
  }
}

/**
 * Reads the persisted customer cart store directly from localStorage.
 */
function readPersistedCart() {
  try {
    const raw = localStorage.getItem('dinesync-customer-cart');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state || null;
  } catch {
    return null;
  }
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const auth = readPersistedAuth();
  const customerAuth = readPersistedCustomerAuth();
  const cart = readPersistedCart();

  const token = auth?.token || customerAuth?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (cart?.hostToken) {
    config.headers['x-host-token'] = cart.hostToken;
  }
  if (auth?.restaurant?.slug) {
    config.headers['x-tenant-slug'] = auth.restaurant.slug;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path.startsWith('/menu') || path.startsWith('/customer')) {
        localStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        if (path && !path.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
