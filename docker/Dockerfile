# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production Environment
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from builder
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application files
COPY site/package.json ./
COPY backend/ ./backend/
COPY site/ ./site/

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["node", "backend/server.js"]