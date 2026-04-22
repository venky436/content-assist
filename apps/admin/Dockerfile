# syntax=docker/dockerfile:1.7
#
# Runtime-only image. Run `bun run --filter admin build` on your Mac
# first — this just packages .next + node_modules into a Node image.
#
# Build with:
#   docker buildx build --platform=linux/amd64 \
#     -f apps/admin/Dockerfile \
#     -t YOUR_DOCKERHUB_USER/content-assist-admin:latest \
#     --push .

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY node_modules ./node_modules
COPY package.json ./package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/admin/.next ./apps/admin/.next
COPY apps/admin/next.config.mjs ./apps/admin/next.config.mjs
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/dist ./packages/shared/dist

EXPOSE 3001
WORKDIR /app/apps/admin
# `next` CLI is hoisted to the workspace root by bun, point directly at it.
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-p", "3001"]
