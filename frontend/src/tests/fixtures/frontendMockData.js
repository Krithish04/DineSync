/**
 * Centralized Frontend Mock Data Fixtures for Testing Suite
 */

export const mockCustomerCartItem = {
  _id: 'item1',
  itemName: 'Paneer Butter Masala',
  price: 320,
  quantity: 2,
  selectedModifiers: [
    { groupName: 'Spice Level', optionName: 'Medium', price: 0 },
    { groupName: 'Add Extra', optionName: 'Extra Cheese', price: 40 },
  ],
};

export const mockCoupon = {
  code: 'WELCOME50',
  discountPercent: 10,
  maxDiscount: 100,
};

export const mockNotificationAlert = {
  _id: 'notif1',
  title: 'Low Stock Alert: Paneer',
  message: 'Current stock is 1.5 kg (Reorder level: 2 kg)',
  category: 'Inventory',
  priority: 'Warning',
  isRead: false,
  isArchived: false,
  createdAt: new Date().toISOString(),
};
