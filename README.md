# content-assist

AI Instagram Content Assistant — monorepo.

## Stack

- **apps/mobile** — Expo React Native (primary user app)
- **apps/admin** — Next.js 14 (admin dashboard, future)
- **apps/server** — Node.js + Hono (API)
- **packages/db** — Drizzle ORM + PostgreSQL
- **packages/shared** — shared types, constants, zod schemas
- **packages/config** — shared tsconfig + eslint
- **Docker** — Postgres + server via `docker compose`

Tooling: pnpm workspaces + Turborepo.

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose
- (Mobile) Xcode / Android Studio for native builds after `expo prebuild`

## Quickstart

```bash
pnpm install
cp .env.example .env

# start postgres
docker compose up -d postgres

# run any of the apps
pnpm --filter server dev
pnpm --filter admin dev
pnpm --filter mobile start
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Run all workspaces in dev mode (turbo) |
| `pnpm build` | Build all workspaces |
| `pnpm typecheck` | Typecheck everything |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm docker:up` | Start Postgres + server containers |

## Structure

```
apps/
  mobile/    Expo React Native
  admin/     Next.js admin dashboard
  server/    Hono API
packages/
  db/        Drizzle schema + client
  shared/    shared types / schemas / constants
  config/    shared tsconfig + eslint
docker/      Postgres init
docs/        living documentation
```

See `docs/` for architecture, API spec, and setup details.
