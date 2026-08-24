# Root Dockerfile for Back4app Containers
FROM node:22-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
COPY backend/tsconfig.json ./

RUN npm ci --legacy-peer-deps

COPY backend/src ./src
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

COPY backend/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads/pod uploads/receipts

EXPOSE 10000

CMD ["node", "dist/index.js"]
