FROM node:20-slim AS base

# Install native build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (including dev) for the build
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production dependencies only
FROM base AS proddeps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Production
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# better-sqlite3 native addon requires libstdc++ at runtime
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application with production-only node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/drizzle ./drizzle

# Create data directory for SQLite
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs

# SQLite database stored in /data for persistence
ENV DATABASE_URL=/data/clawchess.db

EXPOSE 3000

CMD ["node", "server.mjs"]
