import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Haversine formula to calculate distance in meters between 2 GPS coordinates
export function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const useCartStore = create(
  persist(
    (set, get) => ({
      restaurantId: null,
      tableId: null,
      tableNumber: null,
      tableStatus: 'Available', // 'Available' | 'Occupied' | 'Reserved'
      orderType: 'Dine-In', // 'Dine-In' | 'Takeaway' | 'Delivery'
      items: [],
      specialInstructions: '',
      appliedCoupon: null, // { code, discountAmount }
      loyaltyPointsRedeemed: 0,

      // Customer Table Host & Session Locking State
      tableHost: null, // { name, phone, verified: true }
      activeTableSessions: {}, // { [tableId]: { hostName, hostPhone, startedAt } }
      isViewOnly: false,
      placedOrders: [], // [{ _id, orderNumber, grandTotal, itemsCount, createdAt }]

      // Geolocation Safety State (In-Restaurant Verification)
      userLocation: {
        lat: null,
        lng: null,
        isVerified: false,
        isOutside: false,
        distanceMeters: null,
      },
      restaurantCoords: { lat: 19.076, lng: 72.8777 }, // Default restaurant location (Mumbai center)
      allowedRadiusMeters: 500, // 500-meter safety geofence radius

      setSessionContext: ({ restaurantId, tableId, tableNumber, tableStatus, orderType }) =>
        set((state) => {
          const nextTableId = tableId !== undefined ? tableId : state.tableId;
          const nextTableNumber = tableNumber !== undefined ? tableNumber : state.tableNumber;
          const nextTableStatus = tableStatus || state.tableStatus;

          // Calculate view-only mode
          let isViewOnly = state.userLocation.isOutside;

          if (!state.userLocation.isOutside) {
            if (state.tableHost) {
              // Current diner IS the logged-in Table Host -> ALWAYS allow ordering loop!
              isViewOnly = false;
            } else if (nextTableId && state.activeTableSessions[nextTableId]) {
              const activeSession = state.activeTableSessions[nextTableId];
              if (state.tableHost?.phone !== activeSession.hostPhone) {
                isViewOnly = true;
              }
            } else if (nextTableStatus === 'Occupied') {
              isViewOnly = true;
            }
          }

          return {
            restaurantId: restaurantId || state.restaurantId,
            tableId: nextTableId,
            tableNumber: nextTableNumber,
            tableStatus: nextTableStatus,
            orderType: orderType || state.orderType,
            isViewOnly,
          };
        }),

      setLocationStatus: ({ lat, lng, isOutside, distanceMeters }) =>
        set((state) => {
          let isViewOnly = isOutside;

          if (!isOutside) {
            if (state.tableHost) {
              isViewOnly = false;
            } else if (state.tableId && state.activeTableSessions[state.tableId]) {
              const activeSession = state.activeTableSessions[state.tableId];
              if (state.tableHost?.phone !== activeSession.hostPhone) {
                isViewOnly = true;
              }
            } else if (state.tableStatus === 'Occupied' && !state.tableHost) {
              isViewOnly = true;
            }
          }

          return {
            userLocation: {
              lat,
              lng,
              isVerified: true,
              isOutside,
              distanceMeters,
            },
            isViewOnly,
          };
        }),

      loginTableHost: ({ name, phone }) =>
        set((state) => {
          const { tableId, userLocation } = state;
          if (userLocation.isOutside) return state;

          const hostData = { name, phone, verified: true, loggedInAt: new Date().toISOString() };

          let activeTableSessions = { ...state.activeTableSessions };
          if (tableId) {
            activeTableSessions[tableId] = {
              hostName: name,
              hostPhone: phone,
              startedAt: new Date().toISOString(),
            };
          }

          return {
            tableHost: hostData,
            tableStatus: 'Occupied',
            activeTableSessions,
            isViewOnly: false, // Verified host can place unlimited continuous orders!
          };
        }),

      signOutHost: () =>
        set((state) => {
          const { tableId } = state;
          let activeTableSessions = { ...state.activeTableSessions };
          if (tableId) {
            delete activeTableSessions[tableId];
          }

          return {
            tableHost: null,
            tableStatus: 'Available',
            items: [],
            specialInstructions: '',
            appliedCoupon: null,
            loyaltyPointsRedeemed: 0,
            placedOrders: [],
            isViewOnly: state.userLocation.isOutside,
            activeTableSessions,
          };
        }),

      addPlacedOrder: (order) =>
        set((state) => ({
          tableStatus: 'Occupied',
          isViewOnly: state.userLocation.isOutside ? true : false, // Keep ordering active for logged in host!
          placedOrders: [
            ...state.placedOrders,
            {
              _id: order._id,
              orderNumber: order.orderNumber || `ORD-${Date.now().toString().slice(-4)}`,
              grandTotal: order.grandTotal || get().getGrandTotal(),
              itemsCount: get().getItemCount(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      addItem: (menuItem, quantity = 1, selectedModifiers = [], instructions = '') =>
        set((state) => {
          if (state.isViewOnly) return state; // Lock ordering for view-only or outside users

          const modifierTotal = selectedModifiers.reduce((s, m) => s + (m.price || 0), 0);
          const unitPrice = menuItem.price + modifierTotal;

          const existingIndex = state.items.findIndex(
            (i) => i.menuItemId === menuItem._id && JSON.stringify(i.modifiers) === JSON.stringify(selectedModifiers)
          );

          let updatedItems;
          if (existingIndex > -1) {
            updatedItems = [...state.items];
            updatedItems[existingIndex].quantity += quantity;
          } else {
            updatedItems = [
              ...state.items,
              {
                menuItemId: menuItem._id,
                name: menuItem.name,
                unitPrice,
                quantity,
                modifiers: selectedModifiers,
                specialInstructions: instructions,
                dietaryType: menuItem.dietaryType,
                imageCover: menuItem.imageCover,
              },
            ];
          }

          return { items: updatedItems };
        }),

      removeItem: (index) =>
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        })),

      updateQuantity: (index, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((_, i) => i !== index) };
          }
          const updatedItems = [...state.items];
          updatedItems[index].quantity = quantity;
          return { items: updatedItems };
        }),

      setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),

      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),

      removeCoupon: () => set({ appliedCoupon: null }),

      setLoyaltyPointsRedeemed: (points) => set({ loyaltyPointsRedeemed: points }),

      clearCart: () =>
        set({
          items: [],
          specialInstructions: '',
          appliedCoupon: null,
          loyaltyPointsRedeemed: 0,
        }),

      // Calculation getters
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      },

      getTax: () => {
        const subtotal = get().getSubtotal();
        return Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
      },

      getServiceCharge: () => {
        const subtotal = get().getSubtotal();
        return Math.round(subtotal * 0.05 * 100) / 100; // 5% Service Charge
      },

      getDiscount: () => {
        const { appliedCoupon, loyaltyPointsRedeemed } = get();
        const couponDiscount = appliedCoupon?.discountAmount || 0;
        const loyaltyDiscount = Math.round((loyaltyPointsRedeemed / 10) * 100) / 100; // 10 pts = ₹1
        return couponDiscount + loyaltyDiscount;
      },

      getGrandTotal: () => {
        const subtotal = get().getSubtotal();
        const tax = get().getTax();
        const serviceCharge = get().getServiceCharge();
        const discount = get().getDiscount();
        return Math.max(0, Math.round(subtotal + tax + serviceCharge - discount));
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'dinesync-customer-cart',
    }
  )
);

export default useCartStore;
