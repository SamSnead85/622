FROM node:18-slim

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# Copy only server package files first
COPY apps/server/package*.json ./

# Copy Prisma schema (needed for generate)
COPY apps/server/prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy server source code
COPY apps/server/ ./

# Build
RUN npm run build

# Create required directories
RUN mkdir -p logs uploads

# Expose port (Railway will override with $PORT)
EXPOSE 8080

# Start the server — run schema push in background so health check responds immediately
CMD (npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Schema push deferred") & node dist/index.js
