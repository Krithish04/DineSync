import axios from 'axios';

const AUTH_STORAGE_KEY = 'dinesync-auth';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Reads the persisted zustand auth store directly from localStorage.
 * Avoids a circular import between this axios instance and the auth store
 * (the store's API layer imports this file to make requests).
 */
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

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const auth = readPersistedAuth();

  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
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
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
