# Architecture

## Monorepo

```
content-assist/
├── apps/
│   ├── mobile/     Expo React Native (primary user app)
│   ├── admin/      Next.js 14 admin dashboard
│   └── server/     Hono API (Node.js)
├── packages/
│   ├── db/         Drizzle ORM + Postgres schema
│   ├── shared/     shared types, zod schemas, constants
│   └── config/     shared tsconfig + eslint
└── docker/         postgres init
```

Tooling: pnpm workspaces + Turborepo.

## Runtime topology

```
Mobile (Expo) ──┐
                ├──► Hono server ──► Postgres (Drizzle)
Admin (Next)  ──┘         │
                          ├──► Gemini (primary)
                          ├──► OpenAI (fallback)
                          └──► Image gen provider
```

Mobile and admin call the Hono server over HTTP. The server talks to the database via the `@content-assist/db` workspace package and to AI providers via `src/services/ai`.

## Shared types

All API payloads, content types (`Reel | Image | Story`), tones, and zod schemas live in `@content-assist/shared`. Server, admin, and mobile import from the same source so contracts stay aligned.
