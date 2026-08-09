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
      sessionId: null,
      hostToken: null,
      tableHost: null, // { name, phone, verified: true }
      activeTableSessions: {}, // { [tableId]: { hostName, hostPhone, startedAt, sessionId } }
      isViewOnly: false,
      isInactiveTable: false,
      placedOrders: [], // [{ _id, orderNumber, grandTotal, itemsCount, createdAt }]
      sessionOrderSummary: [], // [{ orderId, orderNumber, orderStatus, createdAt, items }]

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

      setSessionContext: (payload = {}) =>
        set((state) => {
          const { restaurantId, tableId, tableNumber, tableStatus, orderType, isInactive, currentHostName, currentHostPhone, activeSessionId } = payload;
          const nextTableId = tableId !== undefined ? tableId : state.tableId;
          const nextTableNumber = tableNumber !== undefined ? tableNumber : state.tableNumber;
          const nextTableStatus = tableStatus || state.tableStatus;
          const isInactiveTable = nextTableStatus === 'Inactive' || !!isInactive;

          // Check if table is occupied by a different diner host or if diner lacks host token for nextTableId
          const hostPhone = currentHostPhone || (nextTableId ? state.activeTableSessions[nextTableId]?.hostPhone : null);
          const isOccupiedByOther = nextTableStatus === 'Occupied' &&
            (!state.tableHost || (hostPhone && state.tableHost.phone !== hostPhone));
          
          // URL edit check: If diner changed tableId away from their claimed table session, force view-only mode
          const isTamperedTableId = state.tableId && nextTableId && String(state.tableId) !== String(nextTableId) && !state.activeTableSessions[nextTableId];

          // Calculate view-only mode
          let isViewOnly = state.userLocation.isOutside || isInactiveTable || isOccupiedByOther || isTamperedTableId;

          if (!state.userLocation.isOutside && !isInactiveTable && !isOccupiedByOther && !isTamperedTableId) {
            if (state.tableHost) {
              isViewOnly = false;
            }
          }

          return {
            restaurantId: restaurantId || state.restaurantId,
            tableId: nextTableId,
            tableNumber: nextTableNumber,
            tableStatus: nextTableStatus,
            isInactiveTable,
            orderType: orderType || state.orderType,
            isViewOnly,
            sessionId: activeSessionId || state.sessionId,
            activeSessionHostName: currentHostName || (nextTableId ? state.activeTableSessions[nextTableId]?.hostName : null),
          };
        }),

      hasValidContext: () => {
        const { restaurantId, tableId } = get();
        return Boolean(restaurantId && tableId);
      },

      setSessionId: (sessionId) => set({ sessionId }),
      setHostToken: (hostToken) => set({ hostToken }),
      setSessionOrderSummary: (summary = []) => set({ sessionOrderSummary: summary }),

      setPlacedOrders: (orders = []) =>
        set({
          placedOrders: orders.map((o) => ({
            _id: o._id,
            orderNumber: o.orderNumber,
            grandTotal: o.grandTotal,
            itemsCount: o.items ? o.items.length : 1,
            createdAt: o.createdAt,
          })),
        }),

      setLocationStatus: ({ lat, lng, isOutside, distanceMeters }) =>
        set((state) => {
          let isViewOnly = isOutside || state.isInactiveTable;

          if (!isOutside && !state.isInactiveTable) {
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

      loginTableHost: ({ name, phone, sessionId, hostToken }) =>
        set((state) => {
          const { tableId, userLocation, isInactiveTable } = state;
          if (userLocation.isOutside || isInactiveTable) return state;

          const hostData = { name, phone, verified: true, loggedInAt: new Date().toISOString() };

          let activeTableSessions = { ...state.activeTableSessions };
          if (tableId) {
            activeTableSessions[tableId] = {
              sessionId: sessionId || state.sessionId,
              hostName: name,
              hostPhone: phone,
              startedAt: new Date().toISOString(),
            };
          }

          return {
            sessionId: sessionId || state.sessionId,
            hostToken: hostToken || state.hostToken,
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
            sessionId: null,
            hostToken: null,
            tableHost: null,
            tableStatus: 'Available',
            items: [],
            specialInstructions: '',
            appliedCoupon: null,
            loyaltyPointsRedeemed: 0,
            placedOrders: [],
            sessionOrderSummary: [],
            isViewOnly: state.userLocation.isOutside || state.isInactiveTable,
            activeTableSessions,
          };
        }),

      addPlacedOrder: (order) =>
        set((state) => ({
          tableStatus: 'Occupied',
          isViewOnly: state.userLocation.isOutside || state.isInactiveTable ? true : false,
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
          if (state.isViewOnly || state.isInactiveTable || state.userLocation.isOutside) return state; // Lock ordering only for users outside geofence

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
