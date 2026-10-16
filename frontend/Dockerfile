# Base image
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies stage - Install deps inside container (never copy host node_modules)
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Builder stage - Copy only source and build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.json next.config.ts postcss.config.mjs* components.json* ./
COPY src ./src
COPY public ./public

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Runner stage - Ultra-lean standalone runtime (Zero heavy dev node_modules)
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 10001 nodejs
RUN adduser --system --uid 10001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

# Only copy Next.js standalone bundle (which only contains runtime dependencies)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
