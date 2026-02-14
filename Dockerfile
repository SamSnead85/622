# ============================================
# Stage 1: Build
# ============================================
FROM node:18-slim AS builder

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# Copy dependency files first for better caching
COPY apps/server/package*.json ./
COPY apps/server/prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY apps/server/ ./
RUN npm run build

# ============================================
# Stage 2: Production Runtime
# ============================================
FROM node:18-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app/server

# Copy only production dependencies
COPY apps/server/package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/server/prisma ./prisma/
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma/
COPY --from=builder /app/server/node_modules/@prisma ./node_modules/@prisma/

# Copy built application
COPY --from=builder /app/server/dist ./dist/

# Create required directories with proper ownership
RUN mkdir -p logs uploads && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check — generous start period for migration + cold start
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

EXPOSE 8080

# Start server first (so health checks pass), then run migration in background
CMD sh -c "node dist/index.js & SERVER_PID=\$! && sleep 5 && (npx prisma migrate deploy 2>/dev/null || true) && wait \$SERVER_PID"
