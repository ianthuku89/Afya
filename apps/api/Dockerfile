# ── AfyaToken Backend API ─────────────────────────────────────────
# Multi-stage build for minimal production image
# Stage 1: install + build
FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy workspace root package files for hoisted deps
COPY package.json package-lock.json ./
# Copy API-specific package.json
COPY apps/api/package.json apps/api/package.json
# Copy shared types package
COPY packages/ packages/

RUN npm install --workspace=apps/api --include-workspace-root
# Copy Prisma schema and generate client
COPY apps/api/prisma apps/api/prisma
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Copy API source and compile
COPY apps/api/ apps/api/
WORKDIR /app/apps/api
RUN npx tsc --project tsconfig.json || true

# Stage 2: production image
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl curl dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S afyaTokenapi -u 1001

# Copy compiled output + node_modules + prisma
COPY --from=builder --chown=afyaTokenapi:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=afyaTokenapi:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=afyaTokenapi:nodejs /app/apps/api/package.json ./package.json
COPY --from=builder --chown=afyaTokenapi:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=afyaTokenapi:nodejs /app/apps/api/node_modules ./api_modules

ENV NODE_ENV=production
ENV PORT=3001

USER afyaTokenapi
EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# dumb-init handles PID 1 signal forwarding (graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
