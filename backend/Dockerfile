# Stage 1: Build TypeScript source code
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests and tsconfig
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source code and build
COPY src ./src
RUN npm run build

# Stage 2: Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Copy package manifests and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy compiled dist from builder
COPY --from=builder /app/dist ./dist

# Ensure upload directories exist
RUN mkdir -p uploads/pod uploads/receipts

EXPOSE 10000

# Start server
CMD ["node", "dist/index.js"]
