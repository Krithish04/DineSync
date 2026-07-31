import api from '@/lib/axios';

const employeesUrl = (restaurantId) => `/restaurants/${restaurantId}/employees`;

export const createEmployee = async (restaurantId, payload) => {
  const { data } = await api.post(employeesUrl(restaurantId), payload);
  return data.data.employee;
};

export const listEmployees = async (restaurantId, params = {}) => {
  const { data } = await api.get(employeesUrl(restaurantId), { params });
  return data.data.employees;
};

export const getEmployee = async (restaurantId, employeeId) => {
  const { data } = await api.get(`${employeesUrl(restaurantId)}/${employeeId}`);
  return data.data; // contains employee, attendance, leaves, shifts, payroll
};

export const updateEmployee = async (restaurantId, employeeId, payload) => {
  const { data } = await api.patch(`${employeesUrl(restaurantId)}/${employeeId}`, payload);
  return data.data.employee;
};

export const deleteEmployee = async (restaurantId, employeeId) => {
  const { data } = await api.delete(`${employeesUrl(restaurantId)}/${employeeId}`);
  return data.data.employee;
};

export const clockIn = async (restaurantId, payload) => {
  const { data } = await api.post(`${employeesUrl(restaurantId)}/attendance/clock-in`, payload);
  return data.data.attendance;
};

export const clockOut = async (restaurantId, employeeId) => {
  const { data } = await api.post(`${employeesUrl(restaurantId)}/${employeeId}/clock-out`);
  return data.data.attendance;
};

export const toggleBreak = async (restaurantId, employeeId, action) => {
  const { data } = await api.post(`${employeesUrl(restaurantId)}/${employeeId}/break`, { action });
  return data.data.attendance;
};

export const applyLeave = async (restaurantId, employeeId, payload) => {
  const { data } = await api.post(`${employeesUrl(restaurantId)}/${employeeId}/leaves`, payload);
  return data.data.leave;
};

export const listLeaves = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${employeesUrl(restaurantId)}/leaves/all`, { params });
  return data.data.leaves;
};

export const approveLeave = async (restaurantId, leaveId, status) => {
  const { data } = await api.patch(`${employeesUrl(restaurantId)}/leaves/${leaveId}/approve`, { status });
  return data.data.leave;
};

export const createShift = async (restaurantId, branchId, payload) => {
  const { data } = await api.post(`${employeesUrl(restaurantId)}/shifts/all`, payload, { params: { branchId } });
  return data.data.shift;
};

export const listShifts = async (restaurantId, branchId) => {
  const { data } = await api.get(`${employeesUrl(restaurantId)}/shifts/all`, { params: { branchId } });
  return data.data.shifts;
};

export const assignEmployeesToShift = async (restaurantId, shiftId, employeeIds) => {
  const { data } = await api.patch(`${employeesUrl(restaurantId)}/shifts/${shiftId}/assign`, { employeeIds });
  return data.data.shift;
};

export const generatePayroll = async (restaurantId, month) => {
  const { data } = await api.post(`${employeesUrl(restaurantId)}/payroll/generate`, { month });
  return data.data.payrolls;
};

export const listPayroll = async (restaurantId, month) => {
  const { data } = await api.get(`${employeesUrl(restaurantId)}/payroll/all`, { params: { month } });
  return data.data.payrolls;
};

export const paySalary = async (restaurantId, payrollId) => {
  const { data } = await api.patch(`${employeesUrl(restaurantId)}/payroll/${payrollId}/pay`);
  return data.data.payroll;
};

export const getEmployeeStats = async (restaurantId, params = {}) => {
  const { data } = await api.get(`${employeesUrl(restaurantId)}/stats`, { params });
  return data.data.stats;
};
