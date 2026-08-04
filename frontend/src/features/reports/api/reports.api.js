import api from '@/lib/axios';

const reportsUrl = (restaurantId) => `/restaurants/${restaurantId}/reports`;

// Executive Dashboard
export const getExecutiveDashboard = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/executive`, { params });
  return data.data;
};

// Sales
export const getSalesSummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/sales/summary`, { params });
  return data.data;
};

export const getSalesByCategory = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/sales/by-category`, { params });
  return data.data.sales;
};

export const getSalesByItem = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/sales/by-item`, { params });
  return data.data.items;
};

export const getHourlySales = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/sales/hourly`, { params });
  return data.data.hourly;
};

// Orders
export const getOrderSummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/orders/summary`, { params });
  return data.data;
};

// Reservations
export const getReservationSummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/reservations/summary`, { params });
  return data.data;
};

// Customers
export const getCustomerSummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/customers/summary`, { params });
  return data.data;
};

export const getCustomerLoyaltySummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/customers/loyalty`, { params });
  return data.data;
};

// Inventory
export const getInventorySummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/inventory/summary`, { params });
  return data.data;
};

export const getPurchaseSummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/inventory/purchases`, { params });
  return data.data.purchases;
};

export const getIngredientConsumption = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/inventory/consumption`, { params });
  return data.data.consumption;
};

export const getWasteAnalysis = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/inventory/waste`, { params });
  return data.data.waste;
};

// Employees
export const getAttendanceSummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/employees/attendance`, { params });
  return data.data;
};

export const getWorkingHoursReport = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/employees/working-hours`, { params });
  return data.data.report;
};

export const getLeaveSummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/employees/leave-summary`, { params });
  return data.data.leaveSummary;
};

// Financial
export const getFinancialSummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/financial/summary`, { params });
  return data.data;
};

export const getGstReport = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/financial/gst`, { params });
  return data.data.gst;
};

export const getPaymentMethodSummary = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/financial/payment-methods`, { params });
  return data.data.paymentMethods;
};

// Scheduled Reports
export const listScheduledReports = async (restaurantId) => {
  const { data } = await api.get(`${reportsUrl(restaurantId)}/scheduled`);
  return data.data.reports;
};

export const createScheduledReport = async (restaurantId, payload) => {
  const { data } = await api.post(`${reportsUrl(restaurantId)}/scheduled`, payload);
  return data.data.report;
};

export const updateScheduledReport = async (restaurantId, reportId, payload) => {
  const { data } = await api.patch(`${reportsUrl(restaurantId)}/scheduled/${reportId}`, payload);
  return data.data.report;
};

export const deleteScheduledReport = async (restaurantId, reportId) => {
  const { data } = await api.delete(`${reportsUrl(restaurantId)}/scheduled/${reportId}`);
  return data.data;
};
