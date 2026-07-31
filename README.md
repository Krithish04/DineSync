# DineSync AI — Intelligent Restaurant Ecosystem

Project initialization module: a production-ready, multi-tenant foundation covering the **frontend**, **backend**, and **AI service**, independently deployable and wired together for local development.

## Architecture

```
dinesync-ai/
├── backend/        Node.js + Express + MongoDB (Clean Architecture, feature-based)
├── frontend/        React + Vite + Tailwind + shadcn/ui
└── ai-service/     Python FastAPI (independent microservice)
```

Each service is fully independent — it has its own dependency manifest, its own env config, and can be deployed separately. They only communicate over HTTP.

## Multi-tenancy model

- **Restaurant** = tenant. Every restaurant has a unique `slug` (auto-generated from its name) used to scope requests (`x-tenant-slug` header, subdomain, or `restaurantSlug` field).
- **User** roles: `super_admin` (platform-wide), `owner`, `manager`, `staff`, `customer` (all tenant-scoped except `super_admin`).
- A user's `email` is unique **per restaurant** (`{ email, restaurant }` compound index), so the same email can belong to different restaurants as different accounts.
- JWTs embed `{ id, role, restaurantId }` so every authenticated request carries its tenant context.

## Completed Features

### Phase 1: Menu & Catalog Management
- **Categories**: Name, description, image, display order, active status. Modals for CRUD operations, search, filters.
- **Menu Items**: Image cover, cost/sale price, preparation time, dietary type (Veg, Non-Veg, Vegan, Jain), spice levels, featured/recommended switches. Modifiers configuration (e.g. toppings, size variants).

### Phase 2: Table Management
- **Tables Layout**: Table number, table name, seating capacity, placement types (Indoor, Outdoor, VIP, Private), statuses (Available, Occupied, Reserved, Cleaning, Maintenance).
- **QR Codes**: Unique menu order link generated for every table, shown inside an overlay modal with direct copy and PNG file download support.

### Phase 3: Reservation Management
- **Reservation Dashboard**: Summary counters (today's/upcoming bookings, available/occupied tables) and today's check-ins.
- **Visual Grid Sheets**: Custom hourly Daily Reservation grid sheet centered on table columns, and a Weekly calendar view.
- **Business Validations**: Overlap check to prevent double bookings, seating guest cap validation, and branch opening hours check.

### Phase 4: Order Management
- **POS Cashier Register**: Menu browse grids, category selectors, search bars, modifier customizer options modal, basket cart sidebar drawer.
- **Billing Calculations**: Automates calculations for subtotal, modifiers additions, menu-item-specific GST tax, 5% service charge, and grand total.
- **Bill Splitting & Merging**: Equal guest split calculator, item-wise split (moves select items to a new order), and merge orders (combines multiple seated tickets).
- **Real-Time Integration**: Integrates Socket.IO to broadcast events (`order:created`, `order:updated`, `order:cancelled`, `order:payment_completed`, `order:kitchen_status`) to cashier displays and kitchen displaying monitors.

### Phase 5: Kitchen Display System (KDS)
- **Ticket Splitting**: Confirmed orders automatically split into station-scoped tickets (Main Kitchen, Tandoor, Bar, Dessert, Beverage), routing items to appropriate kitchen terminals.
- **Elapsed Prep Timers**: Ticking time-indicator on each card counting minutes/seconds since ticket placement.
- **Drag-and-Drop Kanban Board**: Columns representing Pending Confirmation, In Preparation, and Ready for Service.
- **Duration Logging**: Records precise timestamps for each state shift, automatically calculating preparation times in minutes.

### Phase 6: Inventory Management
- **Auto Stock Consumption**: Connects kitchen ticket readiness to item-ingredient recipes, automatically decrementing quantities from current balances.
- **Supplier & Purchase Ledger**: Records wholesale vendor details and generates automated unique purchase invoice receipts.
- **Stock Audit & Adjustments**: Manual stock adjustment interface supporting waste write-offs and quantity corrections.
- **Reorder Limit Alerts**: Real-time warnings when items fall below safety margins.
- **Data Exporting**: Instant client-side CSV downloads of ingredient reports.

### Phase 7: Customer & Loyalty Management
- **Customer Directory**: Registered patron files, emails, dietary preferences, and spent metrics.
- **Loyalty Program**: Automatic tier calculations (Bronze, Silver, Gold, Platinum) with scaled point multiplier ratios.
- **Checkout Accrual & Redemptions**: Collect checkout payments earns points or redeems points (10 points = ₹1) directly at the POS register.
- **Referrals & Birthday Bonus**: Automatic referral point rewards for sign-ups (100 points for referrers, 50 points for sign-up) and birthday adjustments.

### Phase 8: Billing & Payments
- **Tax Invoices Generation**: Auto calculations of CGST (2.5%), SGST (2.5%), service charge (5%), discounts, and loyalty deductions.
- **Auto Rounding Adjustment**: Rounds grand totals to the nearest integer, logging adjustments.
- **Payment Processing**: Single payments or split payments (Cash, Card, UPI), closing parent orders, and freeing seating tables.
- **Refund Processing**: Cancel billing, refund transactions, and reverse customer points.
- **Thermal Print Layouts**: Receipts layouts optimized for thermal printing devices.

### Phase 9: Employee & Staff Management
- **Employee Directory**: Full staff profiles, codes, contact details, designations, departments, salary types, and basic pay rates.
- **Attendance & Shift Timers**: Active clock-in/out logging, break duration tracking, overtime calculation (>8 hours), and daily status summaries.
- **Leave Management**: Leave requests application, manager approval workflows, and status tracking (Pending, Approved, Rejected).
- **Shift Rostering**: Weekly shift schedule creation and employee assignment rosters.
- **Payroll Foundation**: Automated monthly payroll slip generation, net salary calculation (basic + overtime - leave deductions), and payment tracking.

### Phase 10: Reports & Analytics
- **Executive Dashboard**: Real-time business intelligence KPIs (revenue today/month, orders today, active tables, reservations today, staff present, inventory warnings).
- **Sales Reports**: Area chart timelines, sales by branch/category/item, and hourly sales distributions.
- **Customer & Loyalty Reports**: Patron acquisition metrics, returning customer retention, tier breakdown charts, and top customer spent leaderboards.
- **Inventory & Waste Reports**: Stock valuation, low/out-of-stock alerts, purchase spend timelines, ingredient consumption logs, and waste loss analysis.
- **Employee Reports**: Attendance status pie charts, leave request breakdowns, and employee working hours/overtime ledgers.
- **Financial & Tax Reports**: Gross revenue, expenses, net profit margins, payment method distributions (Cash/Card/UPI), and monthly GST audit ledgers (CGST/SGST/IGST).
- **Export & Print**: One-click exporting to CSV, Excel (`.xlsx`), PDF (`.pdf`), and thermal print layouts.
- **Scheduled Automated Reports**: Node-cron background runner dispatching daily, weekly, or monthly report digests via email.

### Phase 11: AI & Predictive Intelligence Platform
- **Sales Forecast**: Predictive modeling for Tomorrow, Next 7 Days, and Next 30 Days revenue with confidence scores and interactive Recharts graphs.
- **Demand Prediction**: Heatmap predictions for peak traffic hours, busy days of week, popular categories, and menu item demand.
- **Inventory Depletion Forecast**: Low-stock date predictions based on daily consumption velocity, auto purchase order recommendations, and cost estimations.
- **Customer Recommendations**: Frequently bought together market basket analysis, cross-sell add-on suggestions, and premium upsell upgrades.
- **Smart Menu**: Category optimization classifying dishes into Best Sellers, Seasonal Favorites, and Underperforming Items with strategy callouts.
- **Wait Time Prediction**: Queueing theory calculations estimating queue wait time, table waiting time, and kitchen delay.
- **Food Waste Risk**: Overstock risk detection, shelf-life expiry predictions, and waste percentage minimization advice.
- **Customer Sentiment Analysis**: NLP sentiment scoring of diner ratings and reviews (Positive/Neutral/Negative & key satisfaction themes).
- **FastAPI Microservice & Resilience**: Node proxy bridge with 5000ms timeout handling, 2x retry logic, and fallback predictive heuristics.

### Phase 12: Customer Experience & QR Ordering Platform
- **QR Code Table & Takeaway Ordering**: Table scanning and takeaway QR resolution with branch/table validation (no login required to browse).
- **Mobile-First Digital Menu**: Category tabs, search bar, dietary filters (Veg, Non-Veg, Vegan, Jain), modifiers customization modal, AI recommendations, and combo meals.
- **Persistent Customer Cart**: Cart drawer with quantity controls, special instructions, promo coupon validator, and loyalty points redemption slider.
- **Dine-In, Takeaway, Delivery Order Placement**: Guest or customer checkout, table auto-linking, and Socket.IO broadcast (`order:created`) to KDS and POS registers.
- **Live Order Status Tracking**: Real-time Socket.IO visual stepper timeline (`Pending` -> `Accepted` -> `Preparing` -> `Ready` -> `Served` -> `Completed`) and estimated prep countdown.
- **Customer Self-Checkout Payments**: Cash, UPI, Card, Wallet, and Split Payment processing with digital thermal receipts.
- **Customer Portal & Loyalty Dashboard**: Diner account management, past order history, favorite items, and loyalty tier status.
- **Feedback & AI Sentiment**: Post-meal reviews and ratings connected to the FastAPI AI Sentiment Analysis engine.

### Phase 13: Notifications, Automation & Background Jobs
- **Centralized Multi-Channel Dispatch**: Reusable notification service supporting Email (Nodemailer), SMS, WhatsApp, Web Push, and In-App alerts with Socket.IO `notification:new` real-time broadcasting.
- **Automated Event Workflows**:
  - **Reservations**: 24h & 1h reminders, auto-canceling expired pending bookings.
  - **Orders**: Customer ready notifications, auto-freeing tables upon payment checkout.
  - **Inventory**: Low-stock alerts, expiry risk warnings, purchase recommendations.
  - **Customers**: Birthday/anniversary wishes, loyalty tier upgrade alerts.
  - **Employees**: Shift reminders & leave request approval notifications.
- **Centralized Node-Cron Background Scheduler**:
  - Daily Sales Summary (07:00 AM)
  - Weekly & Monthly Reports (Mon / 1st of month 07:00 AM)
  - Inventory Stock Audit (Every 6 hours)
  - Reservation Cleanup (Every 15 minutes)
  - AI Forecast Cache Refresh (Daily at 02:00 AM)
  - Database Maintenance & Snapshot Backup (Daily at 03:00 AM)
- **Centralized Alert Center & Header Bell**: Priority filtering (Critical, Warning, Info), Mark Read, Archive, Delete actions, Notification Bell drawer, channel preferences, and cron runner status monitor.

### Phase 14: Super Admin, SaaS & Multi-Tenant Platform
- **Super Admin Executive Portal**: MRR/ARR SaaS revenue metrics, active tenant count, active users, storage usage, and system health status.
- **Tenant Lifecycle Management**: Approval ledger (Pending, Approved, Suspended, Reactivated, Deleted), storage tracking, active branch monitoring, and deep-dive tenant inspection.
- **SaaS Subscription Lifecycle & Plans**: Plan definitions (Starter, Professional, Enterprise), user/branch/storage limits, AI feature tiers, and billing invoice ledger.
- **Granular Per-Tenant Feature Flags**: Toggle AI Features, QR Ordering, Loyalty, Inventory, KDS, and Reports per restaurant workspace.
- **Platform Audit Trail**: Comprehensive logging for user logins, tenant status changes, settings updates, and permission changes.
- **Real-Time Operational Monitoring**: Health monitoring for Node Express API, MongoDB Atlas database ping, FastAPI AI service status, and Node-Cron runner.

---

## Backend — quick start

```bash
cd backend
cp .env.example .env      # then edit MONGO_URI / JWT_SECRET
npm install
npm run dev                # nodemon, http://localhost:5000
```

Key endpoints (all under `/api/v1`):

| Method | Endpoint | Access / Action |
|--------|----------|-----------------|
| GET | `/health` | Public |
| POST | `/auth/register-restaurant` | Public — creates tenant + owner |
| POST | `/auth/register` | Public — joins existing tenant |
| POST | `/auth/login` | Public |
| POST | `/auth/logout` | Authenticated |
| GET | `/auth/me` | Authenticated |
| GET | `/restaurants/public/:slug` | Public |
| GET | `/restaurants/:restaurantId/categories`| List/Search Categories |
| POST | `/restaurants/:restaurantId/categories`| Create Category (Manager+) |
| GET | `/restaurants/:restaurantId/menu-items`| List/Search Menu Items |
| POST | `/restaurants/:restaurantId/menu-items`| Create Menu Item (Manager+) |
| GET | `/restaurants/:restaurantId/tables` | List/Search Tables |
| POST | `/restaurants/:restaurantId/tables` | Create Table (Manager+) |
| GET | `/restaurants/:restaurantId/reservations`| List/Search Bookings |
| GET | `/restaurants/:restaurantId/reservations/stats`| Fetch Booking Dashboard Stats |
| POST | `/restaurants/:restaurantId/reservations`| Create Reservation (Manager+) |
| GET | `/restaurants/:restaurantId/orders` | List/Search Orders |
| POST | `/restaurants/:restaurantId/orders` | Create Order (POS Register) |
| GET | `/restaurants/:restaurantId/orders/:id` | Fetch Order Details |
| PATCH | `/restaurants/:restaurantId/orders/:id/status`| Shift Order Status (Manager+) |
| PATCH | `/restaurants/:restaurantId/orders/:id/payment`| Collect Cash Payment & Checkout |
| POST | `/restaurants/:restaurantId/orders/:id/split`| Perform Bill Split (Items/Equal) |
| POST | `/restaurants/:restaurantId/orders/merge` | Merge Orders (Manager+) |
| GET | `/restaurants/:restaurantId/kitchen` | List KDS Tickets |
| GET | `/restaurants/:restaurantId/kitchen/stats` | Fetch KDS Dashboard Stats |
| PATCH | `/restaurants/:restaurantId/kitchen/:id/status`| Update Entire KDS Ticket Status |
| PATCH | `/restaurants/:restaurantId/kitchen/:id/items/:itemId/status`| Update Individual Ticket Item Status |
| GET | `/restaurants/:restaurantId/inventory/stats` | Fetch Inventory Valuation & Alerts |
| GET | `/restaurants/:restaurantId/inventory/ingredients` | List/Search Active Ingredients |
| POST | `/restaurants/:restaurantId/inventory/ingredients` | Create New Ingredient (Manager+) |
| POST | `/restaurants/:restaurantId/inventory/recipes` | Save MenuItem Ingredient Recipe |
| POST | `/restaurants/:restaurantId/inventory/purchases` | Create Purchase Invoice |
| POST | `/restaurants/:restaurantId/inventory/stock/adjust` | Apply Manual Stock Adjustment |
| GET | `/restaurants/:restaurantId/inventory/stock/transactions` | Fetch Stock Audit Logs History |
| GET | `/restaurants/:restaurantId/customers` | List/Search CRM Customer Registry |
| POST | `/restaurants/:restaurantId/customers` | Register Customer Profile |
| GET | `/restaurants/:restaurantId/customers/:id` | Fetch Customer Spent Profile, Orders, Reservations |
| POST | `/restaurants/:restaurantId/customers/:id/birthday` | Award Birthday Bonus points |
| POST | `/restaurants/:restaurantId/customers/:id/adjust` | Manual CRM Points Balance Correction |
| GET | `/restaurants/:restaurantId/customers/loyalty/transactions` | Fetch Loyalty Points History |
| GET | `/restaurants/:restaurantId/customers/stats` | Fetch Customer Spent Metrics |
| GET | `/restaurants/:restaurantId/customers/reports/analytics` | Fetch CRM Growth Reports |
| POST | `/restaurants/:restaurantId/billing/invoices` | Generate Invoice for Order |
| GET | `/restaurants/:restaurantId/billing/invoices` | List/Search Invoices |
| GET | `/restaurants/:restaurantId/billing/invoices/:invoiceId` | Fetch Invoice details & receipt |
| POST | `/restaurants/:restaurantId/billing/invoices/:invoiceId/refund` | Process Invoice full refund |
| POST | `/restaurants/:restaurantId/billing/payments` | Record payment transaction (Split/Single) |
| GET | `/restaurants/:restaurantId/billing/stats` | Fetch Billing sales stats |
| GET | `/restaurants/:restaurantId/billing/reports/finance` | Fetch Financial reports & refunds timeline |
| GET | `/restaurants/:restaurantId/employees` | List/Search Employee Directory |
| POST | `/restaurants/:restaurantId/employees` | Register New Staff Member (Manager+) |
| POST | `/restaurants/:restaurantId/employees/attendance/clock-in` | Clock In Attendance Timestamp |
| POST | `/restaurants/:restaurantId/employees/:id/clock-out` | Clock Out Attendance Timestamp |
| POST | `/restaurants/:restaurantId/employees/:id/leaves` | Submit Employee Leave Request |
| PATCH | `/restaurants/:restaurantId/employees/leaves/:id/approve` | Approve/Reject Leave Request (Manager+) |
| GET | `/restaurants/:restaurantId/employees/shifts/all` | Fetch Weekly Roster Shifts |
| POST | `/restaurants/:restaurantId/employees/payroll/generate` | Generate Monthly Payroll Ledger (Manager+) |
| GET | `/restaurants/:restaurantId/reports/executive` | Executive Dashboard Aggregations (Manager+) |
| GET | `/restaurants/:restaurantId/reports/sales/summary` | Sales Revenue Timeline & Summary (Manager+) |
| GET | `/restaurants/:restaurantId/reports/sales/by-category` | Sales Breakdown by Menu Category (Manager+) |
| GET | `/restaurants/:restaurantId/reports/sales/by-item` | Top Item Sales Analysis (Manager+) |
| GET | `/restaurants/:restaurantId/reports/customers/summary` | Customer Acquisition & Retention Stats (Manager+) |
| GET | `/restaurants/:restaurantId/reports/inventory/summary` | Stock Valuation & Out-of-Stock Summary (Manager+) |
| GET | `/restaurants/:restaurantId/reports/employees/attendance` | Employee Attendance & Overtime Summary (Manager+) |
| GET | `/restaurants/:restaurantId/reports/financial/summary` | Gross Revenue, Expenses & Net Profit (Manager+) |
| GET | `/restaurants/:restaurantId/reports/financial/gst` | Monthly GST Tax Audit Ledger (Manager+) |
| GET | `/restaurants/:restaurantId/reports/scheduled` | List Configured Email Report Schedules (Manager+) |
| POST | `/restaurants/:restaurantId/reports/scheduled` | Create Automated Email Report Schedule (Manager+) |
| GET | `/restaurants/:restaurantId/notifications` | List Notifications & Unread Count |
| PATCH | `/restaurants/:restaurantId/notifications/read-all` | Mark All Notifications as Read |
| PATCH | `/restaurants/:restaurantId/notifications/:id/read` | Mark Single Notification as Read |
| PATCH | `/restaurants/:restaurantId/notifications/:id/archive` | Archive Notification |
| DELETE | `/restaurants/:restaurantId/notifications/:id` | Delete Notification |
| GET | `/restaurants/:restaurantId/notifications/preferences` | Fetch Notification Channel Preferences |
| PUT | `/restaurants/:restaurantId/notifications/preferences` | Update Notification Channel Preferences |
| GET | `/restaurants/:restaurantId/notifications/jobs` | Fetch Background Cron Jobs Monitor Logs |
| GET | `/super-admin/overview` | Super Admin SaaS MRR/ARR Overview |
| GET | `/super-admin/tenants` | List & Filter All Restaurant Tenants |
| GET | `/super-admin/tenants/:tenantId` | Fetch Tenant Deep-Dive Stats & Billing |
| PATCH | `/super-admin/tenants/:tenantId/status` | Approve, Suspend, Reactivate Tenant |
| GET | `/super-admin/plans` | List SaaS Subscription Plans |
| GET | `/super-admin/tenants/:tenantId/subscription` | Fetch Tenant Active Subscription |
| PATCH | `/super-admin/tenants/:tenantId/subscription` | Update Tenant Subscription Tier |
| GET | `/super-admin/tenants/:tenantId/feature-flags` | Fetch Tenant Feature Flags |
| PUT | `/super-admin/tenants/:tenantId/feature-flags` | Update Tenant Feature Flags |
| GET | `/super-admin/audit-logs` | Fetch Platform Audit Trail |
| GET | `/super-admin/health` | Fetch Infrastructure & Microservice Health |
| GET | `/public/restaurants/:restaurantId/qr-resolve` | Public QR Resolution & Table Detection |
| GET | `/public/restaurants/:restaurantId/menu` | Public Digital Menu (Categories, Items, AI Recs) |
| POST | `/public/restaurants/:restaurantId/orders` | Public Dine-In/Takeaway/Delivery Order Placement |
| GET | `/public/restaurants/:restaurantId/orders/:orderId/track` | Public Socket.IO Live Order Status Tracking |
| POST | `/public/restaurants/:restaurantId/orders/:orderId/pay` | Public Self-Checkout Payment & Receipt |
| POST | `/public/restaurants/:restaurantId/feedback` | Public Feedback Submission & AI Sentiment Scoring |
| GET | `/restaurants/:restaurantId/ai/overview` | Executive AI Overview Dashboard Metrics (Manager+) |
| GET | `/restaurants/:restaurantId/ai/sales-forecast` | AI Sales Revenue Forecast (Manager+) |
| GET | `/restaurants/:restaurantId/ai/demand-forecast` | Peak Traffic & Demand Prediction (Manager+) |
| GET | `/restaurants/:restaurantId/ai/inventory-forecast` | Stock Depletion & Low Stock Date Forecast (Manager+) |
| GET | `/restaurants/:restaurantId/ai/customer-recommendations` | Cross-Sell & Upsell Recommendations (Manager+) |
| GET | `/restaurants/:restaurantId/ai/smart-menu` | Smart Menu Stars & Underperforming Items (Manager+) |
| GET | `/restaurants/:restaurantId/ai/wait-time` | Queue & Kitchen Wait Time Predictions (Manager+) |
| GET | `/restaurants/:restaurantId/ai/food-waste` | Food Waste & Expiry Risk Analysis (Manager+) |
| GET | `/restaurants/:restaurantId/ai/sentiment` | Customer Sentiment & Feedback Scoring (Manager+) |

## Frontend — quick start

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Includes: routing (`react-router-dom`), API layer (`axios`), global state (`zustand`, persisted), shadcn/ui primitives (`Button`, `Input`, `Label`, `Card`), a protected-route guard with role support, and pages for Catalog, Seating, Reservations, Order POS registers, and KDS monitors.

## AI service — quick start

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run.py  || uvicorn app.main:app --reload        # http://localhost:8000, docs at /docs
```

FastAPI skeleton with a versioned router (`/api/v1`) and a `/health` endpoint, ready for AI features (recommendations, waitlist prediction, demand forecasting) to be added as new routers under `app/api/v1/endpoints/`.

## Running everything together

Start MongoDB, then run all three services in separate terminals: `backend` (port 5000), `frontend` (port 5173, proxies `/api` to the backend), and `ai-service` (port 8000). The frontend never talks to the AI service directly in this module — that integration is added when an AI-powered feature is built on top of this foundation.
#   D i n e S y n c  
 