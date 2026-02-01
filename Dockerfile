FROM node:18-alpine

WORKDIR /app/server

# Copy only server package files first
COPY apps/server/package*.json ./

# Install dependencies
RUN npm install

# Copy server source code
COPY apps/server/ ./

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Expose port
EXPOSE 5180

# Start the server
CMD ["node", "dist/index.js"]
