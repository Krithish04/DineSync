import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global authentication store.
 * Persisted to localStorage under 'dinesync-auth' so the axios instance
 * can read the token/tenant without a circular import, and so sessions
 * survive a page refresh.
 */
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      restaurant: null,
      token: null,
      isAuthenticated: false,

      setSession: ({ user, restaurant, token }) =>
        set({
          user,
          restaurant: restaurant || null,
          token,
          isAuthenticated: true,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : state.user,
        })),

      clearSession: () =>
        set({
          user: null,
          restaurant: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'dinesync-auth',
      partialize: (state) => ({
        user: state.user,
        restaurant: state.restaurant,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
