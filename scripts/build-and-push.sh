#!/usr/bin/env bash
#
# Build server + admin images on the Mac and push to Docker Hub.
# Runs the actual app builds on the host (where bun workspaces work
# cleanly), then packages just the artifacts into minimal linux/amd64
# images the droplet can pull.
#
# Usage:
#   ./scripts/build-and-push.sh
#
# Requires DOCKERHUB_USER set in your shell:
#   export DOCKERHUB_USER=yourhandle
# And `docker login` already done once:
#   docker login

set -euo pipefail

if [[ -z "${DOCKERHUB_USER:-}" ]]; then
  echo "ERROR: DOCKERHUB_USER not set."
  echo "       export DOCKERHUB_USER=yourdockerhubhandle"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "==> Installing dependencies (bun)"
bun install

echo "==> Building shared package"
bun run --filter @content-assist/shared build

# Server is no longer compiled for Docker — bun runs TS source directly
# in the container. Skipping `bun run --filter server build` here saves
# ~8s per deploy and eliminates the tsc/tsc-alias/ESM failure modes.
# The build script still exists in apps/server/package.json if someone
# needs a Node-runnable dist/ for another deployment target.

# NEXT_PUBLIC_* env vars are inlined into the Next.js build. Default to
# `/api` — caddy on the droplet routes /api/* to the server container
# on the same origin, so no CORS dance is needed. Override if admin +
# server run on different hosts:
#   export PUBLIC_API_URL=http://api.example.com
PUBLIC_API_URL="${PUBLIC_API_URL:-/api}"

echo "==> Building admin (NEXT_PUBLIC_API_URL=${PUBLIC_API_URL})"
NEXT_PUBLIC_API_URL="${PUBLIC_API_URL}" bun run --filter admin build

TAG="${TAG:-latest}"
SERVER_IMAGE="${DOCKERHUB_USER}/content-assist-server:${TAG}"
ADMIN_IMAGE="${DOCKERHUB_USER}/content-assist-admin:${TAG}"

# buildx creates images for linux/amd64 regardless of your Mac's arch
# (Apple Silicon = arm64). The droplet is amd64, so this matters.
echo "==> Building + pushing server image → ${SERVER_IMAGE}"
docker buildx build \
  --platform=linux/amd64 \
  -f apps/server/Dockerfile \
  -t "${SERVER_IMAGE}" \
  --push .

echo "==> Building + pushing admin image → ${ADMIN_IMAGE}"
docker buildx build \
  --platform=linux/amd64 \
  -f apps/admin/Dockerfile \
  -t "${ADMIN_IMAGE}" \
  --push .

echo ""
echo "✓ Done."
echo "  Server: ${SERVER_IMAGE}"
echo "  Admin:  ${ADMIN_IMAGE}"
echo ""
echo "On the droplet:"
echo "  docker compose -f docker-compose.prod.yml pull"
echo "  docker compose -f docker-compose.prod.yml up -d"
