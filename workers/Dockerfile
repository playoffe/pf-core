# @pickleball/workers — ECS Fargate container
# Multi-stage build: install → build → production image

FROM node:20-slim AS base
RUN corepack enable pnpm

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY workers/package.json ./workers/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/

# Install only what the workers package needs
RUN pnpm install --frozen-lockfile --filter @pickleball/workers... --ignore-scripts

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/workers/node_modules ./workers/node_modules
COPY workers/ ./workers/
COPY packages/ ./packages/
COPY tsconfig.base.json ./

WORKDIR /app/workers
RUN pnpm build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-slim AS runner

# Sharp requires these native libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips42 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/workers

COPY --from=builder /app/workers/dist ./dist
COPY --from=builder /app/workers/node_modules ./node_modules
COPY --from=builder /app/workers/package.json ./package.json

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker
USER worker

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
