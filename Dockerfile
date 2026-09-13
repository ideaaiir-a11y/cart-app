# ─────────────────────────────────────────────────────────────
# Cloudflare Container — Next.js standalone server
# Multi-stage build: same base image (oven/bun) for ABI compat
# with native modules (sharp, prisma)
# ─────────────────────────────────────────────────────────────
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN bun install

# Generate Prisma client
COPY prisma/ ./prisma/
RUN bunx prisma generate

# Build Next.js application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Runtime stage — reuse base image for ABI compatibility
FROM base AS runtime
WORKDIR /app

# Copy built standalone application
# (includes server.js, .next/static, public, and pruned node_modules)
COPY --from=builder /app/.next/standalone ./

# Overwrite node_modules with full deps
# (standalone prunes devDeps; we need prisma CLI & z-ai for runtime)
COPY --from=builder /app/node_modules ./node_modules/

# Copy Prisma schema (needed by prisma db push at runtime)
COPY --from=builder /app/prisma ./prisma/

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Ensure node_modules/.bin is in PATH (for z-ai CLI used in imageSearch)
ENV PATH="/app/node_modules/.bin:$PATH"

# Create data directory for SQLite database
RUN mkdir -p /data && chmod 777 /data

# Default environment (override via Worker envVars / secrets)
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/database.sqlite
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
