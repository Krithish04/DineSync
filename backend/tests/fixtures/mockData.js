/**
 * Centralized Backend Mock Data Fixtures for Testing Suite
 */

const mockRestaurantId = '66a1b2c3d4e5f67890123456';
const mockUserId = '66a1b2c3d4e5f67890123457';
const mockOrderId = '66a1b2c3d4e5f67890123458';

const mockUser = {
  _id: mockUserId,
  fullName: 'John Doe',
  email: 'john@dinesync.ai',
  password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
  role: 'RESTAURANT_OWNER',
  restaurant: mockRestaurantId,
  isDeleted: false,
};

const mockRestaurant = {
  _id: mockRestaurantId,
  name: 'Spice Garden Fine Dining',
  slug: 'spice-garden-fine-dining',
  email: 'owner@spicegarden.com',
  isActive: true,
  subscriptionPlan: 'pro',
};

const mockMenuItems = [
  { _id: 'item1', itemName: 'Paneer Butter Masala', price: 320, category: 'Main Course' },
  { _id: 'item2', itemName: 'Garlic Naan', price: 60, category: 'Breads' },
];

const mockOrder = {
  _id: mockOrderId,
  restaurant: mockRestaurantId,
  orderNumber: 'ORD-20260728-1001',
  orderType: 'Dine-In',
  orderStatus: 'Pending',
  paymentStatus: 'Pending',
  subtotal: 700,
  taxTotal: 35,
  grandTotal: 735,
  items: [
    { menuItem: 'item1', itemName: 'Paneer Butter Masala', quantity: 2, price: 320, itemSubtotal: 640 },
    { menuItem: 'item2', itemName: 'Garlic Naan', quantity: 1, price: 60, itemSubtotal: 60 },
  ],
};

const mockIngredients = [
  { _id: 'ing1', ingredientName: 'Paneer', currentStock: 5, unit: 'kg', reorderLevel: 2 },
  { _id: 'ing2', ingredientName: 'Butter', currentStock: 0.5, unit: 'kg', reorderLevel: 1 },
];

const mockInvoice = {
  _id: 'inv1',
  invoiceNumber: 'INV-20260728-99',
  restaurant: mockRestaurantId,
  order: mockOrderId,
  grandTotal: 735,
  paidAmount: 735,
  paymentStatus: 'Paid',
};

const mockAiForecast = {
  restaurantId: mockRestaurantId,
  forecastPeriod: 'Next 7 Days',
  predictedTotalRevenue: 145000,
  confidenceScore: 0.94,
  dailyForecasts: [
    { date: '2026-07-28', predictedRevenue: 18000, expectedOrders: 42 },
    { date: '2026-07-29', predictedRevenue: 22000, expectedOrders: 55 },
  ],
};

module.exports = {
  mockRestaurantId,
  mockUserId,
  mockOrderId,
  mockUser,
  mockRestaurant,
  mockMenuItems,
  mockOrder,
  mockIngredients,
  mockInvoice,
  mockAiForecast,
};
