import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import NotFound from '@/components/common/NotFound';
import Unauthorized from '@/components/common/Unauthorized';
import Loader from '@/components/common/Loader';

const lazyLoad = (importFn) => {
  const Component = lazy(importFn);
  return (props) => (
    <Suspense fallback={<Loader />}>
      <Component {...props} />
    </Suspense>
  );
};

const LoginChooserPage = lazyLoad(() => import('@/features/auth/pages/LoginChooserPage'));
const RestaurantLoginPage = lazyLoad(() => import('@/features/auth/pages/RestaurantLoginPage'));
const KitchenLoginPage = lazyLoad(() => import('@/features/auth/pages/KitchenLoginPage'));
const AdminLoginPage = lazyLoad(() => import('@/features/auth/pages/AdminLoginPage'));
const RegisterPage = lazyLoad(() => import('@/features/auth/pages/RegisterPage'));
const VerifyOtpPage = lazyLoad(() => import('@/features/auth/pages/VerifyOtpPage'));
const ForgotPasswordPage = lazyLoad(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazyLoad(() => import('@/features/auth/pages/ResetPasswordPage'));
const DashboardPage = lazyLoad(() => import('@/features/dashboard/pages/DashboardPage'));
const RestaurantProfilePage = lazyLoad(() => import('@/features/restaurant/pages/RestaurantProfilePage'));
const RestaurantSettingsPage = lazyLoad(() => import('@/features/restaurant/pages/RestaurantSettingsPage'));
const GstSettingsPage = lazyLoad(() => import('@/features/restaurant/pages/GstSettingsPage'));
const OpeningHoursPage = lazyLoad(() => import('@/features/restaurant/pages/OpeningHoursPage'));
const CategoryListPage = lazyLoad(() => import('@/features/category/pages/CategoryListPage'));
const MenuListPage = lazyLoad(() => import('@/features/menu/pages/MenuListPage'));
const TableListPage = lazyLoad(() => import('@/features/table/pages/TableListPage'));
const TableFormPage = lazyLoad(() => import('@/features/table/pages/TableFormPage'));
const ReservationDashboardPage = lazyLoad(() => import('@/features/reservation/pages/ReservationDashboardPage'));
const ReservationListPage = lazyLoad(() => import('@/features/reservation/pages/ReservationListPage'));
const ReservationCalendarPage = lazyLoad(() => import('@/features/reservation/pages/ReservationCalendarPage'));
const ReservationFormPage = lazyLoad(() => import('@/features/reservation/pages/ReservationFormPage'));
const OrderDashboardPage = lazyLoad(() => import('@/features/order/pages/OrderDashboardPage'));
const StaffOrderBoardPage = lazyLoad(() => import('@/features/order/pages/StaffOrderBoardPage'));
const NewOrderPage = lazyLoad(() => import('@/features/order/pages/NewOrderPage'));
const ActiveOrdersPage = lazyLoad(() => import('@/features/order/pages/ActiveOrdersPage'));
const OrderDetailsPage = lazyLoad(() => import('@/features/order/pages/OrderDetailsPage'));
const OrderHistoryPage = lazyLoad(() => import('@/features/order/pages/OrderHistoryPage'));
const KitchenDashboardPage = lazyLoad(() => import('@/features/kitchen/pages/KitchenDashboardPage'));
const KdsPage = lazyLoad(() => import('@/features/kitchen/pages/KdsPage'));
const InventoryDashboardPage = lazyLoad(() => import('@/features/inventory/pages/InventoryDashboardPage'));
const IngredientListPage = lazyLoad(() => import('@/features/inventory/pages/IngredientListPage'));
const SupplierListPage = lazyLoad(() => import('@/features/inventory/pages/SupplierListPage'));
const PurchaseEntryPage = lazyLoad(() => import('@/features/inventory/pages/PurchaseEntryPage'));
const StockHistoryPage = lazyLoad(() => import('@/features/inventory/pages/StockHistoryPage'));
const CustomerDashboardPage = lazyLoad(() => import('@/features/customer/pages/CustomerDashboardPage'));
const CustomerListPage = lazyLoad(() => import('@/features/customer/pages/CustomerListPage'));
const CustomerProfilePage = lazyLoad(() => import('@/features/customer/pages/CustomerProfilePage'));
const LoyaltyDashboardPage = lazyLoad(() => import('@/features/customer/pages/LoyaltyDashboardPage'));
const FeedbackManagementPage = lazyLoad(() => import('@/features/customer/pages/FeedbackManagementPage'));
const FeedbackInsightsPage = lazyLoad(() => import('@/features/customer/pages/FeedbackInsightsPage'));
const BillingDashboardPage = lazyLoad(() => import('@/features/billing/pages/BillingDashboardPage'));
const InvoiceListPage = lazyLoad(() => import('@/features/billing/pages/InvoiceListPage'));
const InvoiceDetailsPage = lazyLoad(() => import('@/features/billing/pages/InvoiceDetailsPage'));
const PaymentScreenPage = lazyLoad(() => import('@/features/billing/pages/PaymentScreenPage'));
const EmployeeDashboardPage = lazyLoad(() => import('@/features/employee/pages/EmployeeDashboardPage'));
const EmployeeListPage = lazyLoad(() => import('@/features/employee/pages/EmployeeListPage'));
const EmployeeProfilePage = lazyLoad(() => import('@/features/employee/pages/EmployeeProfilePage'));
const AttendanceDashboardPage = lazyLoad(() => import('@/features/employee/pages/AttendanceDashboardPage'));
const ShiftManagementPage = lazyLoad(() => import('@/features/employee/pages/ShiftManagementPage'));
const LeaveManagementPage = lazyLoad(() => import('@/features/employee/pages/LeaveManagementPage'));
const ExecutiveDashboardPage = lazyLoad(() => import('@/features/reports/pages/ExecutiveDashboardPage'));
const SalesReportPage = lazyLoad(() => import('@/features/reports/pages/SalesReportPage'));
const CustomerReportPage = lazyLoad(() => import('@/features/reports/pages/CustomerReportPage'));
const InventoryReportPage = lazyLoad(() => import('@/features/reports/pages/InventoryReportPage'));
const EmployeeReportPage = lazyLoad(() => import('@/features/reports/pages/EmployeeReportPage'));
const FinancialReportPage = lazyLoad(() => import('@/features/reports/pages/FinancialReportPage'));
const ScheduledReportsPage = lazyLoad(() => import('@/features/reports/pages/ScheduledReportsPage'));
const AiDashboardPage = lazyLoad(() => import('@/features/ai/pages/AiDashboardPage'));
const SalesForecastPage = lazyLoad(() => import('@/features/ai/pages/SalesForecastPage'));
const InventoryForecastPage = lazyLoad(() => import('@/features/ai/pages/InventoryForecastPage'));
const CustomerInsightsPage = lazyLoad(() => import('@/features/ai/pages/CustomerInsightsPage'));
const DemandPredictionPage = lazyLoad(() => import('@/features/ai/pages/DemandPredictionPage'));
const AiRecommendationsPage = lazyLoad(() => import('@/features/ai/pages/AiRecommendationsPage'));
const SentimentDashboardPage = lazyLoad(() => import('@/features/ai/pages/SentimentDashboardPage'));
const ChatbotAdminSettingsPage = lazyLoad(() => import('@/features/menu/pages/ChatbotAdminSettingsPage'));
const QrLandingPage = lazyLoad(() => import('@/features/customerPlatform/pages/QrLandingPage'));
const DigitalMenuPage = lazyLoad(() => import('@/features/customerPlatform/pages/DigitalMenuPage'));
const CartPage = lazyLoad(() => import('@/features/customerPlatform/pages/CartPage'));
const CheckoutPage = lazyLoad(() => import('@/features/customerPlatform/pages/CheckoutPage'));
const LiveOrderTrackingPage = lazyLoad(() => import('@/features/customerPlatform/pages/LiveOrderTrackingPage'));
const CustomerPortalDashboardPage = lazyLoad(() => import('@/features/customerPlatform/pages/CustomerDashboardPage'));
const CustomerLoyaltyDashboardPage = lazyLoad(() => import('@/features/customerPlatform/pages/CustomerLoyaltyDashboardPage'));
const FeedbackPage = lazyLoad(() => import('@/features/customerPlatform/pages/FeedbackPage'));
const ReservationBookingPage = lazyLoad(() => import('@/features/customerPlatform/pages/ReservationBookingPage'));
const CategoryGridPage = lazyLoad(() => import('@/features/customerPlatform/pages/CategoryGridPage'));
const NotificationCenterPage = lazyLoad(() => import('@/features/notification/pages/NotificationCenterPage'));
const NotificationSettingsPage = lazyLoad(() => import('@/features/notification/pages/NotificationSettingsPage'));
const AlertDashboardPage = lazyLoad(() => import('@/features/notification/pages/AlertDashboardPage'));
const SuperAdminDashboardPage = lazyLoad(() => import('@/features/superAdmin/pages/SuperAdminDashboardPage'));
const TenantListPage = lazyLoad(() => import('@/features/superAdmin/pages/TenantListPage'));
const TenantDetailsPage = lazyLoad(() => import('@/features/superAdmin/pages/TenantDetailsPage'));
const SubscriptionPlansPage = lazyLoad(() => import('@/features/superAdmin/pages/SubscriptionPlansPage'));
const FeatureFlagsPage = lazyLoad(() => import('@/features/superAdmin/pages/FeatureFlagsPage'));
const AuditLogsPage = lazyLoad(() => import('@/features/superAdmin/pages/AuditLogsPage'));
const PlatformAnalyticsPage = lazyLoad(() => import('@/features/superAdmin/pages/PlatformAnalyticsPage'));
const MonitoringDashboardPage = lazyLoad(() => import('@/features/superAdmin/pages/MonitoringDashboardPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginChooserPage />,
  },
  {
    path: '/login/restaurant',
    element: <RestaurantLoginPage />,
  },
  {
    path: '/login/kitchen',
    element: <KitchenLoginPage />,
  },
  {
    path: '/login/admin',
    element: <AdminLoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/verify-otp',
    element: <VerifyOtpPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },
  {
    element: <ProtectedRoute allowedRoles={['chef', 'manager', 'owner', 'super_admin']} />,
    children: [
      {
        path: '/kds',
        element: <KdsPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
    ],
  },
  {
    /* Staff Accessible Operations: Staff Order Board, Reservations, Categories, Menu */
    element: <ProtectedRoute allowedRoles={['super_admin', 'manager', 'staff']} />,
    children: [
      {
        path: '/restaurant/staff-orders',
        element: <StaffOrderBoardPage />,
      },
      {
        path: '/restaurant/categories',
        element: <CategoryListPage />,
      },
      {
        path: '/restaurant/menu',
        element: <MenuListPage />,
      },
      {
        path: '/restaurant/reservations/dashboard',
        element: <ReservationDashboardPage />,
      },
      {
        path: '/restaurant/reservations/list',
        element: <ReservationListPage />,
      },
      {
        path: '/restaurant/reservations/calendar',
        element: <ReservationCalendarPage />,
      },
      {
        path: '/restaurant/reservations/new',
        element: <ReservationFormPage />,
      },
      {
        path: '/restaurant/reservations/:reservationId/edit',
        element: <ReservationFormPage />,
      },
    ],
  },
  {
    /* Manager Operations: Tables, Orders & POS, Inventory, Billing, Settings, Reports, Notifications */
    element: <ProtectedRoute allowedRoles={['super_admin', 'manager']} />,
    children: [
      {
        path: '/restaurant/tables',
        element: <TableListPage />,
      },
      {
        path: '/restaurant/tables/new',
        element: <TableFormPage />,
      },
      {
        path: '/restaurant/tables/:tableId/edit',
        element: <TableFormPage />,
      },
      {
        path: '/restaurant/orders/history',
        element: <OrderHistoryPage />,
      },
      {
        path: '/restaurant/orders/:orderId',
        element: <OrderDetailsPage />,
      },
      {
        path: '/restaurant/inventory/dashboard',
        element: <InventoryDashboardPage />,
      },
      {
        path: '/restaurant/inventory/ingredients',
        element: <IngredientListPage />,
      },
      {
        path: '/restaurant/inventory/suppliers',
        element: <SupplierListPage />,
      },
      {
        path: '/restaurant/inventory/purchases',
        element: <PurchaseEntryPage />,
      },
      {
        path: '/restaurant/inventory/history',
        element: <StockHistoryPage />,
      },
      {
        path: '/restaurant/feedback/manage',
        element: <FeedbackManagementPage />,
      },
      {
        path: '/restaurant/billing/dashboard',
        element: <BillingDashboardPage />,
      },
      {
        path: '/restaurant/orders/active',
        element: <ActiveOrdersPage />,
      },
      {
        path: '/restaurant/billing/invoices',
        element: <InvoiceListPage />,
      },
      {
        path: '/restaurant/billing/invoices/:invoiceId',
        element: <InvoiceDetailsPage />,
      },
      {
        path: '/restaurant/billing/:invoiceId',
        element: <InvoiceDetailsPage />,
      },
      {
        path: '/restaurant/billing/checkout/:orderId',
        element: <PaymentScreenPage />,
      },
      {
        path: '/restaurant/settings',
        element: <RestaurantSettingsPage />,
      },
      {
        path: '/restaurant/opening-hours',
        element: <OpeningHoursPage />,
      },
      {
        path: '/restaurant/reports/sales',
        element: <SalesReportPage />,
      },
      {
        path: '/restaurant/reports/inventory',
        element: <InventoryReportPage />,
      },
      {
        path: '/restaurant/reports/employees',
        element: <EmployeeReportPage />,
      },
      {
        path: '/restaurant/reports/financial',
        element: <FinancialReportPage />,
      },
      {
        path: '/restaurant/reports/scheduled',
        element: <ScheduledReportsPage />,
      },
      {
        path: '/restaurant/notifications/center',
        element: <NotificationCenterPage />,
      },
      {
        path: '/restaurant/notifications/settings',
        element: <NotificationSettingsPage />,
      },
    ],
  },
  {
    /* Owner & Manager Shared Operations: Employees/Payroll, Executive BI, Feedback Insights, Alert Center */
    element: <ProtectedRoute allowedRoles={['super_admin', 'owner', 'manager']} />,
    children: [
      {
        path: '/restaurant/employees/dashboard',
        element: <EmployeeDashboardPage />,
      },
      {
        path: '/restaurant/employees/list',
        element: <EmployeeListPage />,
      },
      {
        path: '/restaurant/employees/:employeeId/profile',
        element: <EmployeeProfilePage />,
      },
      {
        path: '/restaurant/employees/attendance',
        element: <AttendanceDashboardPage />,
      },
      {
        path: '/restaurant/employees/shifts',
        element: <ShiftManagementPage />,
      },
      {
        path: '/restaurant/employees/leaves',
        element: <LeaveManagementPage />,
      },
      {
        path: '/restaurant/notifications/alerts',
        element: <AlertDashboardPage />,
      },
    ],
  },
  {
    /* Owner Oversight: Executive BI, Feedback Insights, Customers & CRM, Restaurant Profile, GST Config, AI Intelligence */
    element: <ProtectedRoute allowedRoles={['super_admin', 'owner']} />,
    children: [
      {
        path: '/restaurant/reports/executive',
        element: <ExecutiveDashboardPage />,
      },
      {
        path: '/restaurant/feedback/insights',
        element: <FeedbackInsightsPage />,
      },
      {
        path: '/restaurant/customers/dashboard',
        element: <CustomerDashboardPage />,
      },
      {
        path: '/restaurant/customers/list',
        element: <CustomerListPage />,
      },
      {
        path: '/restaurant/customers/:customerId/profile',
        element: <CustomerProfilePage />,
      },
      {
        path: '/restaurant/customers/:customerId',
        element: <CustomerProfilePage />,
      },
      {
        path: '/restaurant/customers/loyalty',
        element: <LoyaltyDashboardPage />,
      },
      {
        path: '/restaurant/profile',
        element: <RestaurantProfilePage />,
      },
      {
        path: '/restaurant/gst',
        element: <GstSettingsPage />,
      },
      {
        path: '/restaurant/ai/dashboard',
        element: <AiDashboardPage />,
      },
      {
        path: '/restaurant/ai/sales-forecast',
        element: <SalesForecastPage />,
      },
      {
        path: '/restaurant/ai/inventory-forecast',
        element: <InventoryForecastPage />,
      },
      {
        path: '/restaurant/ai/customer-insights',
        element: <CustomerInsightsPage />,
      },
      {
        path: '/restaurant/ai/demand-prediction',
        element: <DemandPredictionPage />,
      },
      {
        path: '/restaurant/ai/smart-menu',
        element: <AiRecommendationsPage />,
      },
      {
        path: '/restaurant/ai/sentiment',
        element: <SentimentDashboardPage />,
      },
      {
        path: '/restaurant/ai/chatbot-settings',
        element: <ChatbotAdminSettingsPage />,
      },
    ],
  },
  {
    /* Kitchen Monitor & Operations (Manager, Chef, Staff, Owner & Super Admin) */
    element: <ProtectedRoute allowedRoles={['super_admin', 'owner', 'manager', 'chef', 'staff']} />,
    children: [
      {
        path: '/restaurant/kitchen',
        element: <KitchenDashboardPage />,
      },
    ],
  },
  {
    /* Super Admin Console & Legacy Order Creation Routes */
    element: <ProtectedRoute allowedRoles={['super_admin']} />,
    children: [
      {
        path: '/restaurant/orders/dashboard',
        element: <OrderDashboardPage />,
      },
      {
        path: '/restaurant/orders/new',
        element: <NewOrderPage />,
      },
      {
        path: '/restaurant/orders/active',
        element: <ActiveOrdersPage />,
      },
      {
        path: '/super-admin/dashboard',
        element: <SuperAdminDashboardPage />,
      },
      {
        path: '/super-admin/tenants',
        element: <TenantListPage />,
      },
      {
        path: '/super-admin/tenants/:tenantId',
        element: <TenantDetailsPage />,
      },
      {
        path: '/super-admin/subscriptions',
        element: <SubscriptionPlansPage />,
      },
      {
        path: '/super-admin/feature-flags',
        element: <FeatureFlagsPage />,
      },
      {
        path: '/super-admin/audit-logs',
        element: <AuditLogsPage />,
      },
      {
        path: '/super-admin/analytics',
        element: <PlatformAnalyticsPage />,
      },
      {
        path: '/super-admin/monitoring',
        element: <MonitoringDashboardPage />,
      },
    ],
  },
  {
    path: '/menu',
    element: <QrLandingPage />,
  },
  {
    path: '/t/:tableId',
    element: <QrLandingPage />,
  },
  {
    path: '/menu/categories',
    element: <CategoryGridPage />,
  },
  {
    path: '/menu/browse',
    element: <DigitalMenuPage />,
  },
  {
    path: '/menu/cart',
    element: <CartPage />,
  },
  {
    path: '/menu/checkout',
    element: <CheckoutPage />,
  },
  {
    path: '/menu/orders/:orderId/track',
    element: <LiveOrderTrackingPage />,
  },
  {
    path: '/menu/feedback',
    element: <FeedbackPage />,
  },
  {
    path: '/menu/reservations',
    element: <ReservationBookingPage />,
  },
  {
    path: '/book/:restaurantId',
    element: <ReservationBookingPage />,
  },
  {
    path: '/book',
    element: <ReservationBookingPage />,
  },
  {
    path: '/customer/dashboard',
    element: <CustomerPortalDashboardPage />,
  },
  {
    path: '/customer/loyalty',
    element: <CustomerLoyaltyDashboardPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

export default router;
