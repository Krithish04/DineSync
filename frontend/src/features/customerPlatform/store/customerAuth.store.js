import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Separate customer session store to prevent coupling diner phone/token state with staff/admin role permissions and restaurant management session assumptions.
export const useCustomerAuthStore = create(
  persist(
    (set) => ({
      token: null,
      customer: null,
      setCustomerSession: ({ token, customer }) => set({ token, customer }),
      clearCustomerSession: () => set({ token: null, customer: null }),
      updateCustomerProfile: (customerData) =>
        set((state) => ({
          customer: state.customer ? { ...state.customer, ...customerData } : customerData,
        })),
    }),
    {
      name: 'dinesync_customer_auth',
    }
  )
);

export default useCustomerAuthStore;
