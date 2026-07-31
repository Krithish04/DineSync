# DineSync AI — Comprehensive System Documentation

Welcome to the official, complete technical documentation for **DineSync AI**, an enterprise-grade, multi-tenant AI-powered restaurant management SaaS platform.

---

## 1. System Architecture

DineSync AI is built on a decoupled, multi-tenant microservices-ready architecture:

```mermaid
graph TD
    Client[Web & Mobile Diners / POS / KDS] -->|HTTPS / WSS| Nginx[Nginx Reverse Proxy & Load Balancer]
    Nginx -->|React SPA| Frontend[Frontend - React + Vite + Tailwind CSS]
    Nginx -->|REST / Socket.IO| Backend[Backend - Node.js Express API Engine]
    Backend -->|JSON RPC| AIService[FastAPI AI Microservice - Python 3.11]
    Backend -->|Mongoose Driver| Database[(MongoDB Atlas Database)]
    Backend -->|SMTP| Mailer[Nodemailer / SendGrid Email Gateway]
```

### Core Architecture Components
1. **Frontend**: Single Page Application (SPA) built with React 18, Vite, Tailwind CSS, Zustand state management, and Socket.IO client.
2. **Backend**: Multi-tenant Express RESTful API with tenant isolation middleware (`enforceTenantIsolation`), JWT authentication, and in-memory TTL caching.
3. **AI Microservice**: Python FastAPI service delivering sales forecasts, demand heatmaps, inventory depletion predictions, market basket recommendations, and NLP sentiment analysis.
4. **Real-time Event Engine**: Socket.IO server broadcasting order updates, kitchen ticket status shifts, and desktop alert notifications instantly.
5. **Database**: MongoDB Atlas with compound indexes optimized for multi-tenant data partitioning.

---

## 2. Directory Folder Structure

```
dinesync-ai/
├── backend/
│   ├── src/
│   │   ├── config/              # Environment, DB, Socket.IO configs
│   │   ├── constants/           # Roles, status enums
│   │   ├── features/            # Modular feature domains
│   │   │   ├── ai/              # AI Proxy service & routes
│   │   │   ├── auth/            # JWT authentication & users
│   │   │   ├── billing/         # Invoices & split payments
│   │   │   ├── branch/          # Multi-branch management
│   │   │   ├── category/        # Menu categories
│   │   │   ├── customer/        # Customer registry & CRM
│   │   │   ├── customerExperience/ # Public QR ordering & menu
│   │   │   ├── employee/        # Staff rosters, leaves, payroll
│   │   │   ├── inventory/       # Ingredients, recipes, stock
│   │   │   ├── kitchen/         # Kitchen Display System (KDS)
│   │   │   ├── menu/            # Menu items & modifiers
│   │   │   ├── notification/    # Alerts & cron job scheduler
│   │   │   ├── order/           # POS orders & table auto-freeing
│   │   │   ├── reports/         # Business intelligence & PDF export
│   │   │   ├── reservation/     # Table bookings & calendar
│   │   │   ├── superAdmin/      # Multi-tenant SaaS management
│   │   │   ├── table/           # Dynamic floor plan & tables
│   │   │   └── tenant/          # Restaurant tenant profiles
│   │   ├── middlewares/         # Auth, validation, error handling
│   │   ├── routes/              # Central express router
│   │   ├── utils/               # ApiError, ApiResponse, email, cache
│   │   └── server.js            # Express server entry point
│   ├── tests/                   # Backend unit & integration test suite
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components & Layouts
│   │   ├── features/            # Feature pages & components
│   │   ├── lib/                 # Axios client, utils, formatters
│   │   ├── store/               # Zustand global state stores
│   │   ├── tests/               # Frontend component & store tests
│   │   ├── App.jsx
│   │   ├── router.jsx           # React Router lazy route definitions
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── ai-service/
│   ├── app/                     # FastAPI microservice endpoints
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml           # Development Docker Compose
├── docker-compose.prod.yml      # Production Docker Compose
├── ecosystem.config.js          # PM2 cluster configuration
├── DEPLOYMENT_GUIDE.md          # Multi-cloud deployment guide
├── PROJECT_ARCHITECTURE_INDEX.md
└── README.md
```

---

## 3. Database Schema & ER Diagram

```mermaid
erDiagram
    Restaurant ||--o{ User : employs
    Restaurant ||--o{ Branch : owns
    Restaurant ||--o{ MenuItem : offers
    Restaurant ||--o{ Table : contains
    Restaurant ||--o{ Reservation : receives
    Restaurant ||--o{ Order : processes
    Restaurant ||--o{ Ingredient : tracks
    Restaurant ||--o{ Customer : registers
    Restaurant ||--o{ Notification : logs
    Restaurant ||--|| TenantSubscription : subscribes

    Order ||--o{ KitchenTicket : routes_to
    Order ||--|| Invoice : generates
    User ||--o{ AuditLog : performs
```

---

## 4. API Documentation Endpoint Reference

| Category | Method | Endpoint | Access Level | Description |
|----------|--------|----------|--------------|-------------|
| **Auth** | `POST` | `/api/v1/auth/register-restaurant` | Public | Registers restaurant tenant & owner account |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | Authenticates user and issues JWT cookie |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated | Fetches current user profile |
| **Public QR** | `GET` | `/api/v1/public/restaurants/:id/qr-resolve` | Public | Resolves QR table scanning |
| **Public QR** | `GET` | `/api/v1/public/restaurants/:id/menu` | Public | Fetches digital menu without login |
| **Public QR** | `POST`| `/api/v1/public/restaurants/:id/orders` | Public | Places guest Dine-In/Takeaway/Delivery order |
| **Orders** | `POST` | `/api/v1/restaurants/:id/orders` | POS / Staff | Places order at POS register |
| **Orders** | `PATCH`| `/api/v1/restaurants/:id/orders/:id/status` | Staff | Updates order status (`Pending` -> `Served`) |
| **KDS** | `GET` | `/api/v1/restaurants/:id/kitchen` | Kitchen | Fetches active kitchen station tickets |
| **Inventory**| `POST` | `/api/v1/restaurants/:id/inventory/stock/adjust` | Manager+ | Applies manual stock adjustment |
| **Billing** | `POST` | `/api/v1/restaurants/:id/billing/invoices` | Staff / Manager| Generates invoice for completed order |
| **Reports** | `GET` | `/api/v1/restaurants/:id/reports/executive` | Manager+ | Aggregates executive dashboard metrics |
| **AI** | `GET` | `/api/v1/restaurants/:id/ai/sales-forecast` | Manager+ | Fetches sales revenue forecast |
| **SuperAdmin**| `GET` | `/api/v1/super-admin/overview` | Super Admin | Fetches SaaS MRR/ARR platform analytics |
| **SuperAdmin**| `PATCH`| `/api/v1/super-admin/tenants/:id/status` | Super Admin | Approves, suspends, or reactivates tenant |

---

## 5. Local Setup Guide

### Prerequisites
- Node.js >= 18.0.0
- Python >= 3.10
- MongoDB Atlas account or local MongoDB >= 7.0

### Step-by-Step Local Setup

1. **Clone & Setup Backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and insert your MONGO_URI and JWT_SECRET
   npm install
   npm run dev
   ```

2. **Setup Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Setup AI Service**:
   ```bash
   cd ai-service
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --port 8000 --reload
   ```

---

## 6. AI Service Documentation

The FastAPI AI microservice (`ai-service/`) runs on Python 3.11 and delivers real-time predictive analytics:

1. **Sales Forecast** (`GET /api/v1/ai/sales-forecast`): Predicts revenue for Tomorrow, Next 7 Days, and Next 30 Days with confidence scores.
2. **Demand Heatmap** (`GET /api/v1/ai/demand-prediction`): Predicts peak traffic hours and busy days of the week.
3. **Inventory Depletion** (`GET /api/v1/ai/inventory-forecast`): Projects low-stock dates based on daily consumption velocity and generates purchase order suggestions.
4. **Market Basket Recommendations** (`GET /api/v1/ai/recommendations`): Identifies frequently bought together items and cross-sell suggestions.
5. **Smart Menu Optimization** (`GET /api/v1/ai/smart-menu`): Classifies menu dishes into Best Sellers, High Margin Stars, and Underperforming Items.
6. **Wait Time Prediction** (`GET /api/v1/ai/wait-time`): Estimates table and kitchen prep waiting times using queueing theory models.
7. **Food Waste Minimization** (`GET /api/v1/ai/food-waste`): Identifies overstock risks and ingredient shelf-life expiry dates.
8. **NLP Customer Sentiment Analysis** (`POST /api/v1/ai/sentiment`): Scores diner reviews into Positive, Neutral, or Negative sentiment.

---

## 7. Environment Variables Reference

| Variable | Description | Example / Default |
|----------|-------------|-------------------|
| `PORT` | Node Express API server port | `5000` |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dinesync` |
| `JWT_SECRET` | Secret key for JWT signing | `super-secret-production-jwt-key` |
| `JWT_EXPIRES_IN` | JWT token validity duration | `7d` |
| `CLIENT_URL` | Frontend origin URL for CORS | `http://localhost:5173` |
| `AI_SERVICE_URL` | FastAPI microservice base URL | `http://localhost:8000/api/v1` |
| `SMTP_HOST` | Email gateway SMTP host | `smtp.sendgrid.net` |
| `SMTP_PORT` | Email gateway SMTP port | `587` |

---

## 8. User Manuals

### A. Customer QR Platform Manual
- **Scan QR Code**: Diners scan table QR code to open the public digital menu (`/menu`).
- **Browse & Filter**: Filter dishes by Veg, Non-Veg, Vegan, Jain, or search by name.
- **Customize & Cart**: Select modifiers (spice levels, extra toppings) and add to cart drawer (`/menu/cart`).
- **Place Order**: Submit Dine-In, Takeaway, or Delivery order with guest checkout (`/menu/checkout`).
- **Track Order**: View real-time Socket.IO visual stepper status (`/menu/orders/:id/track`).

### B. Restaurant Manager Manual
- **POS Register**: Create orders, link tables, and collect cash or digital payments (`/restaurant/orders/dashboard`).
- **KDS Kitchen Monitor**: Manage kitchen station tickets across Grill, Fryer, Assembly, and Beverage (`/restaurant/kitchen`).
- **Inventory & Purchases**: Record ingredient stock entries and monitor low-stock alerts (`/restaurant/inventory/dashboard`).
- **Reports & Analytics**: Access Executive Dashboard, Sales Summary, GST audit ledgers, and automated email reports (`/restaurant/reports/executive`).

### C. Super Admin Manual
- **Executive SaaS Dashboard**: Inspect MRR/ARR metrics, active tenant counts, and total system users (`/super-admin/dashboard`).
- **Tenant Management**: Approve new restaurant registrations, suspend accounts, or reactivate workspaces (`/super-admin/tenants`).
- **Feature Flags**: Toggle AI features, QR ordering, CRM loyalty, or inventory modules per tenant (`/super-admin/feature-flags`).
- **System Monitoring**: Check real-time status of Node API, MongoDB database ping, and background cron runner (`/super-admin/monitoring`).

---

## 9. Troubleshooting Guide

| Issue | Potential Cause | Resolution |
|-------|-----------------|------------|
| **MongoDB Connection Error** | IP Whitelist or invalid URI | Check MongoDB Atlas Network Access IP whitelist and verify `MONGO_URI`. |
| **CORS Request Blocked** | `CLIENT_URL` mismatch | Update `CLIENT_URL` in `.env` to match the exact frontend URL. |
| **Socket.IO Disconnection** | Proxy WebSocket headers missing | Ensure Nginx includes `Upgrade` and `Connection` headers for `/socket.io/`. |
| **FastAPI Microservice Offline** | Python service stopped | Verify `uvicorn` is running on port 8000; Node fallback heuristics will serve basic forecasts automatically. |
