# API

Server base URL (dev): `http://localhost:3000`

## Current endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |

## Planned surface

Endpoints will be added as features are implemented. Expected groups:

- `POST /generate` — generate hooks, caption, hashtags, tips for an idea
- `POST /analyze` — analyze reel/post (link or raw caption)
- `GET /ideas` — content ideas by niche
- `GET /hooks` — hook library
- `CRUD /saved` — saved content
- `GET /daily` — daily suggestions
- `POST /images` — image generation
- `POST /auth/*` — auth

All request/response shapes will live in `@content-assist/shared/schemas` (zod).
