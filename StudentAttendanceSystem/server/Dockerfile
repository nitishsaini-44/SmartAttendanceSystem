# Production Dockerfile for Smart Attendance System - Backend API
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install OpenSSL and libc6-compat (required by Prisma engine on Alpine Linux)
RUN apk add --no-cache openssl libc6-compat

# Copy package manifests and Prisma schema first for layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Ensure Prisma client is generated for Alpine Linux target
RUN npx prisma generate

# Create directory structure for file uploads
RUN mkdir -p uploads/teachers uploads/students

# Expose backend port
EXPOSE 5000

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Start Express server
CMD ["node", "src/app.js"]
