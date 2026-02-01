FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/

# Install dependencies
RUN npm install --workspace=@caravan/server

# Copy server source
COPY apps/server ./apps/server

# Build TypeScript
WORKDIR /app/apps/server
RUN npm run build

# Expose port
EXPOSE 5180

# Start server
CMD ["npm", "run", "start"]
