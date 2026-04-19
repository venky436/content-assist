# Setup

## Prerequisites
- Node.js >= 20
- pnpm >= 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker + Docker Compose
- Xcode (iOS) / Android Studio (Android) — required after `expo prebuild`

## First-time setup

```bash
# from repo root
pnpm install
cp .env.example .env
```

## Run Postgres

```bash
docker compose up -d postgres
```

## Run each app

```bash
# API (Hono)
pnpm --filter server dev                 # http://localhost:3000

# Admin (Next.js)
pnpm --filter admin dev                  # http://localhost:3001

# Mobile (Expo)
pnpm --filter mobile start
```

## Drizzle

```bash
pnpm db:generate     # create migration from schema diff
pnpm db:migrate      # apply migrations
pnpm db:studio       # web UI
```

## Mobile → bare workflow

The Expo app is prebuild-ready. To generate native `ios/` and `android/` folders (bare):

```bash
pnpm --filter mobile prebuild
```

Then run natively:

```bash
pnpm --filter mobile ios
pnpm --filter mobile android
```

## Docker (full stack)

```bash
pnpm docker:up       # starts postgres + server
pnpm docker:logs
pnpm docker:down
```
