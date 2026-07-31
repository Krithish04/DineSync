import api from '@/lib/axios';

const billingUrl = (restaurantId) => `/restaurants/${restaurantId}/billing`;

export const generateInvoice = async (restaurantId, payload) => {
  const { data } = await api.post(`${billingUrl(restaurantId)}/invoices`, payload);
  return data.data.invoice;
};

export const listInvoices = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${billingUrl(restaurantId)}/invoices`, { params });
  return data.data.invoices;
};

export const getInvoice = async (restaurantId, invoiceId) => {
  const { data } = await api.get(`${billingUrl(restaurantId)}/invoices/${invoiceId}`);
  return data.data.invoice;
};

export const processPayment = async (restaurantId, payload) => {
  const { data } = await api.post(`${billingUrl(restaurantId)}/payments`, payload);
  return data.data;
};

export const refundInvoice = async (restaurantId, invoiceId) => {
  const { data } = await api.post(`${billingUrl(restaurantId)}/invoices/${invoiceId}/refund`);
  return data.data.invoice;
};

export const getBillingStats = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${billingUrl(restaurantId)}/stats`, { params });
  return data.data.stats;
};

export const getFinanceReports = async (restaurantId) => {
  const { data } = await api.get(`${billingUrl(restaurantId)}/reports/finance`);
  return data.data.reports;
};
