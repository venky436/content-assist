# syntax=docker/dockerfile:1.7
#
# Server image — Hono on Node runtime, built with bun.
#
# Bun is used for dependency install (fast, workspace-aware) and to build the
# shared package. The runtime keeps Node so compose + ffmpeg + long-running
# Hono handlers behave exactly like the local dev server.
#
# Multi-stage keeps the final image small:
#   deps    → install workspace node_modules with bun
#   build   → compile shared + server with tsc
#   runtime → Node + ffmpeg + only what the server needs at runtime

FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Copy manifests first so the install layer caches across code changes.
COPY package.json bun.lock* ./
COPY apps/server/package.json apps/server/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json

# --frozen-lockfile is NOT used here: the committed lockfile references
# apps/mobile (excluded from this build's context for image size), so a
# frozen install would fail with "lockfile had changes". Install resolves
# the same versions regardless — the lockfile just gets re-derived inside
# the image and discarded when the layer is done.
#
# We don't use --ignore-scripts because bun conflates that flag with
# workspace symlink creation in some versions. The shared package no
# longer has a `prepare: tsc` hook, so install is safe to run fully.
RUN bun install

# ---- build ----
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Shared first (server imports @content-assist/shared from its dist), then server.
RUN bun run --filter @content-assist/shared build \
 && bun run --filter server build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

# ffmpeg + ffprobe are required for video composition (bgm mixing, Ken Burns
# zoompan, xfade crossfades, probing voice duration).
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV SERVER_PORT=3000

# Copy only what the runtime needs — the compiled server + its node_modules.
# Workspace symlinks resolve correctly because we preserve the node_modules
# tree + the packages/* source (the db package exports source directly,
# shared exports its dist).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/db/package.json ./packages/db/package.json
COPY --from=build /app/packages/db/src ./packages/db/src
COPY --from=build /app/packages/db/drizzle ./packages/db/drizzle

EXPOSE 3000
WORKDIR /app/apps/server
CMD ["node", "dist/index.js"]
