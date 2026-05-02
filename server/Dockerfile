# ─────────────────────────────────────────────────────────────────────────────
# BUILD STAGE
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# PRODUCTION STAGE
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install language runtimes + security tools
RUN apk add --no-cache \
    curl \
    python3 \
    py3-pip \
    gcc \
    g++ \
    openjdk17-jre \
    libstdc++ \
    && ln -sf python3 /usr/bin/python3 \
    # Remove pip to reduce attack surface (students can't install packages)
    && pip3 uninstall -y pip setuptools 2>/dev/null || true

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser  -S appuser -u 1001 -G appgroup

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Install PM2 globally
RUN npm install -g pm2@latest

# Copy build output and config
COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./

# Create writable runtime directories
RUN mkdir -p /app/logs /app/uploads /app/temp_code_exec && \
    chown -R appuser:appgroup /app/logs /app/uploads /app/temp_code_exec

USER appuser

ENV NODE_ENV=production
ENV PM2_DISABLE_INTERACTION=true
# Limit Node.js heap per worker — 4 workers × 1.5 GB = 6 GB max
ENV NODE_OPTIONS="--max-old-space-size=1536"

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["pm2-runtime", "ecosystem.config.js"]
