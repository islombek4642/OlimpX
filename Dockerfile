# Multi-stage build for production
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm run install:all

# Copy source code
COPY . .

# Generate Prisma client
RUN cd backend && npx prisma generate

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies only
RUN npm install --omit=dev && \
    cd backend && npm install --omit=dev

# Copy built application from builder
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/*.html ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/pages ./pages
COPY --from=builder /app/admin ./admin
COPY --from=builder /app/components ./components
COPY --from=builder /app/styles ./styles

# Create non-root user and uploads directory
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/backend/uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Copy scripts and set permissions
COPY scripts/entrypoint.sh /app/scripts/entrypoint.sh
USER root
RUN chmod +x /app/scripts/entrypoint.sh
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use entrypoint script
ENTRYPOINT ["/app/scripts/entrypoint.sh"]

