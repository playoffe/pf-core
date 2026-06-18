# @pickleball/workers — ECS Fargate container
# Multi-stage build: install → build → production image

FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY workers/package.json ./workers/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/rating/package.json ./packages/rating/

# Install all workspace deps (devDeps included — tsc needed for build)
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY workers/ ./workers/
COPY packages/ ./packages/
COPY tsconfig.base.json ./
# Restore node_modules after source copy (source copy would overwrite them)
COPY --from=deps /app/workers/node_modules ./workers/node_modules

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
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/workers/node_modules ./node_modules
COPY --from=builder /app/workers/package.json ./package.json

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker
USER worker

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
