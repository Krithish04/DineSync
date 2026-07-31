# ==========================================
# DineSync AI Backend Production Dockerfile
# ==========================================

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app ./

EXPOSE 5000

USER node

CMD ["node", "src/server.js"]
