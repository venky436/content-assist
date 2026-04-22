# syntax=docker/dockerfile:1.7
#
# Server runtime — Bun, running TS directly.
#
# Why bun instead of Node:
#   - tsconfig path aliases (`@server/*`) resolve natively
#   - ESM imports don't need explicit `.js` extensions
#   - No tsc compile step, no dist/ to manage, no tsc-alias dance
#   - Same resolver as `bun install` so workspace linking stays consistent
#
# Build the image locally on your Mac with scripts/build-and-push.sh —
# it handles buildx for linux/amd64 and pushes to Docker Hub.

FROM oven/bun:1-alpine
WORKDIR /app

# ffmpeg + ffprobe for video compose.
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV SERVER_PORT=3000

# Workspace node_modules (hoisted) + everything the server imports at runtime.
# `packages/config` is copied whole because shared's tsconfig extends it and
# bun reads tsconfig at runtime to resolve path aliases.
COPY node_modules ./node_modules
COPY package.json ./package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/server/src ./apps/server/src
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/dist ./packages/shared/dist
COPY packages/config ./packages/config
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/src ./packages/db/src
COPY packages/db/migrations ./packages/db/migrations
COPY packages/db/drizzle.config.ts ./packages/db/drizzle.config.ts

EXPOSE 3000
WORKDIR /app/apps/server
CMD ["bun", "run", "src/index.ts"]
