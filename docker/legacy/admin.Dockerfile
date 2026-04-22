# syntax=docker/dockerfile:1.7
#
# Admin image — Next.js 14 running `next start` behind nginx.
#
# Bun is used for install + build (fast, workspace-aware). Runtime uses
# the Next CLI on Node for parity with local dev.
#
# NEXT_PUBLIC_* values are baked in at BUILD time. Default is "/api" which
# pairs with nginx routing /api/* on the same origin to the server
# container. Override via Docker build arg if deploying admin on a
# separate domain from server.

FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock* ./
COPY apps/server/package.json apps/server/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json

# --frozen-lockfile omitted: committed lockfile references apps/mobile
# which is .dockerignore'd for image size. Install resolves the same
# versions regardless.
RUN bun install

# ---- build ----
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Shared dist first so the admin build can import @content-assist/shared.
RUN bun run --filter @content-assist/shared build

ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN bun run --filter admin build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# We ship the full traced workspace rather than relying on standalone
# output — simpler and guaranteed to resolve monorepo-hoisted deps the
# same way local dev does.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/admin ./apps/admin
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/config ./packages/config

EXPOSE 3001
WORKDIR /app/apps/admin
# `next` is hoisted to the workspace root's node_modules/.bin by bun
# install (Next has no reason to live inside apps/admin's local tree in a
# monorepo). Reference the hoisted binary explicitly.
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-p", "3001"]
