# DineSync AI — Production Deployment Guide

This guide provides step-by-step instructions to deploy **DineSync AI** to production across cloud providers (AWS, Azure, Google Cloud), PaaS platforms (Render, Railway), Docker environments, and traditional Linux VPS servers.

---

## 1. Quick Production Docker Compose Deployment

Run the complete multi-container stack (Backend, Frontend Nginx, FastAPI AI Service, MongoDB) locally or on a single VM:

```bash
# 1. Clone repository & configure environment
cp .env.production.example .env

# 2. Build and boot all production containers
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Check running services
docker-compose -f docker-compose.prod.yml ps
```

---

## 2. Platform-Specific Deployment Guides

### A. AWS (Amazon Web Services)
- **Option 1: Elastic Container Service (ECS Fargate)**
  1. Push Docker images to **AWS ECR**:
     ```bash
     aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com
     docker tag dinesync-backend:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/dinesync-backend:latest
     docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/dinesync-backend:latest
     ```
  2. Create an **ECS Fargate Task Definition** for `dinesync-backend` and `dinesync-ai-service`.
  3. Provision an **Application Load Balancer (ALB)** with HTTPS certificate from AWS Certificate Manager (ACM).
- **Option 2: AWS App Runner**
  1. Connect your GitHub repository to AWS App Runner.
  2. Select `backend/Dockerfile` as build configuration.
  3. Set environment variables (`MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`).

---

### B. Microsoft Azure
- **Option 1: Azure App Service (Web App for Containers)**
  1. Push images to **Azure Container Registry (ACR)**:
     ```bash
     az acr login --name dinesyncacr
     docker tag dinesync-backend:latest dinesyncacr.azurecr.io/backend:v1
     docker push dinesyncacr.azurecr.io/backend:v1
     ```
  2. Create Azure Web App for Containers and link image `dinesyncacr.azurecr.io/backend:v1`.
- **Option 2: Azure Container Apps (Microservice deployment)**
  1. Deploy `docker-compose.prod.yml` to Azure Container Apps environment.

---

### C. Google Cloud Platform (GCP)
- **GCP Cloud Run (Serverless Containers)**
  1. Submit build to **Google Artifact Registry**:
     ```bash
     gcloud builds submit --tag gcr.io/<gcp_project_id>/dinesync-backend ./backend
     gcloud builds submit --tag gcr.io/<gcp_project_id>/dinesync-ai ./ai-service
     ```
  2. Deploy service to Cloud Run:
     ```bash
     gcloud run deploy dinesync-backend \
       --image gcr.io/<gcp_project_id>/dinesync-backend \
       --platform managed \
       --set-env-vars MONGO_URI="<mongodb_uri>",JWT_SECRET="<jwt_secret>"
     ```

---

### D. Render PaaS
1. Create a **Web Service** on Render.
2. Repository directory: `./backend`
3. Environment: `Docker`
4. Add environment variables (`MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `AI_SERVICE_URL`).
5. Create a second **Web Service** for `./ai-service`.

---

### E. Railway PaaS
1. Connect repository to Railway.
2. Select `./backend/Dockerfile` for backend service and `./ai-service/Dockerfile` for AI service.
3. Railway automatically provisions SSL certificates and custom domains.

---

### F. Traditional Linux VPS (Ubuntu 22.04 / 24.04 LTS)

#### 1. Node.js & PM2 Process Manager
```bash
# Install Node.js 20 & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone repository & build
cd /var/www/dinesync-ai
cp .env.production.example backend/.env
cd backend && npm ci
cd ../frontend && npm ci && npm run build

# Start PM2 cluster
cd /var/www/dinesync-ai
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 2. Nginx & Let's Encrypt SSL Certbot
```bash
# Install Nginx & Certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy Nginx config
sudo cp nginx.conf /etc/nginx/sites-available/dinesync
sudo ln -s /etc/nginx/sites-available/dinesync /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain free Let's Encrypt SSL certificate
sudo certbot --nginx -d app.dinesync.ai
```

---

## 3. Post-Deployment Verification Checklist

- [ ] `GET /api/v1/health` returns `HTTP 200 OK`
- [ ] User registration and JWT login issuing httpOnly cookie
- [ ] MongoDB Atlas cluster connectivity verified
- [ ] Socket.IO WebSocket real-time order tracking verified over WSS
- [ ] FastAPI microservice AI endpoints responding
- [ ] HTTPS Let's Encrypt SSL certificate valid and auto-renewing
