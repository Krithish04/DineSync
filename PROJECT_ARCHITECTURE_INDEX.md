# DineSync AI — Comprehensive System Architecture Index

> **Developer & Agent Reference Guide**: Read this file to instantly understand all 11 modules, database schemas, feature locations, API contracts, routing patterns, and conventions across `backend`, `frontend`, and `ai-service`.

---

## Workspace Structure & Multi-Tenancy

```
dinesync-ai/
├── backend/          Node.js + Express + MongoDB (Clean architecture, feature-based)
├── frontend/         React + Vite + Tailwind + Lucide Icons + Recharts
└── ai-service/       Python FastAPI microservice (Pydantic models, prediction services)
```

- **Multi-Tenancy**: Tenant = `Restaurant`. Every request from authenticated users carries JWT with `{ id, role, restaurantId }`. Headers contain `x-tenant-slug`.
- **RBAC Roles**: `super_admin` (platform level), `owner`, `manager`, `staff`, `customer`.
- **Tenant Middleware**: `protect`, `enforceTenantIsolation`, `authorize(...)`.

---

## 11 Completed System Modules

| # | Module | Key Capabilities | Backend Feature Dir | Frontend Route Prefix |
|---|---|---|---|---|
| 1 | Auth & Tenant | Multi-tenant auth, OTP verify, password reset | `backend/src/features/auth`, `tenant` | `/login`, `/register`, `/restaurant/*` |
| 3 | Menu Management | Categories, items, modifiers, spice/dietary tags | `backend/src/features/category`, `menu` | `/restaurant/categories`, `/menu` |
| 4 | Table Management | Seating layout, statuses, dynamic QR ordering | `backend/src/features/table` | `/restaurant/tables` |
| 5 | Reservation Mgmt | Seating caps, overlap check, grid/calendar view | `backend/src/features/reservation` | `/restaurant/reservations/*` |
| 6 | Order Management | POS register, bill split/merge, Socket.IO sync | `backend/src/features/order` | `/restaurant/orders/*` |
| 7 | Kitchen (KDS) | Station routing, prep ticking timers, Kanban | `backend/src/features/kitchen` | `/restaurant/kitchen` |
| 8 | Inventory Mgmt | Recipe mapping, auto consumption, stock audit | `backend/src/features/inventory` | `/restaurant/inventory/*` |
| 9 | Customer CRM | Loyalty tiers, points accrual/redemption, referrals | `backend/src/features/customer` | `/restaurant/customers/*` |
| 10 | Billing & Payments | GST calculations, payment methods, thermal print | `backend/src/features/billing` | `/restaurant/billing/*` |
| 11 | Employee & Staff | Roster shifts, clock-in/out timers, payroll | `backend/src/features/employee` | `/restaurant/employees/*` |
| 12 | Reports & Analytics| MongoDB aggregation pipelines, PDF/Excel/CSV | `backend/src/features/reports` | `/restaurant/reports/*` |
| 13 | AI & Predictive Intel| FastAPI microservice, forecasts, recommendations | `ai-service`, `backend/src/features/ai` | `/restaurant/ai/*` |
| 14 | Customer Experience | Public QR ordering, digital menu, Socket.IO tracking | `backend/src/features/customerExperience` | `/menu/*`, `/customer/*` |
| 15 | Notifications & Cron| Multi-channel dispatch (Email, SMS, WhatsApp, Push, In-App), cron jobs, Alert Center | `backend/src/features/notification` | `/restaurant/notifications/*` |
| 16 | Super Admin & SaaS  | Multi-tenant SaaS management, plans, tenant approvals, feature flags, audit logs, health | `backend/src/features/superAdmin` | `/super-admin/*` |

---

## FastAPI Microservice (`ai-service/`)

- **Root & Docs**: `http://localhost:8000/docs`
- **Prefix**: `/api/v1`
- **Models Directory**: `ai-service/app/models/` (`sales.py`, `demand.py`, `inventory.py`, `recommendations.py`, `smart_menu.py`, `wait_time.py`, `waste.py`, `sentiment.py`)
- **Services Directory**: `ai-service/app/services/` (`sales_service.py`, `demand_service.py`, `inventory_service.py`, `recommendation_service.py`, `smart_menu_service.py`, `wait_time_service.py`, `waste_service.py`, `sentiment_service.py`)
- **Endpoints Directory**: `ai-service/app/api/v1/endpoints/`

---

## Node.js Backend (`backend/`)

- **Entry**: `src/server.js` -> `src/app.js` -> `src/routes/index.routes.js`
- **Port**: `5000` (default)
- **Response Format**: `ApiResponse(statusCode, data, message)`
- **Error Format**: `ApiError(statusCode, message, errors)`
- **AI Microservice Bridge**: `backend/src/features/ai/ai.service.js` (axios client to FastAPI with timeout + 2x retry + Node fallback heuristics).

---

## React Frontend (`frontend/`)

- **State Management**: Zustand store (`useAuthStore`) persisted in `localStorage`.
- **HTTP Client**: `src/lib/axios.js` (attaches Bearer token & `x-tenant-slug`).
- **Layout Shell**: `src/features/restaurant/components/RestaurantLayout.jsx` with shared tab strip.
- **Chart Library**: Recharts (`ChartWidget.jsx`).
- **Export Utility**: `ExportToolbar.jsx` (CSV, Excel xlsx, PDF jspdf, Print).

---

## Quick Reference for Adding New Features
1. Backend: Add Mongoose model (if needed), service logic, controller with `asyncHandler` & `ApiResponse`, router with `protect` & `enforceTenantIsolation`, register in `index.routes.js`.
2. Frontend: Add API calls in `features/<name>/api/<name>.api.js`, components in `components/`, pages in `pages/`, register routes in `router.jsx`, add tab to `RestaurantLayout.jsx` if in management section.
