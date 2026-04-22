# Deployment Guide — DigitalOcean Droplet

Single-droplet deployment. Ships **postgres + server + admin + caddy** in Docker,
everything behind a single port-80 reverse proxy.

> **Live:** `http://ca-dev.duckdns.org`
> **Cost:** ~$14.40/month (2 GB Premium AMD + weekly backups)
> **Capacity:** comfortable for ~30 dev users

---

## Architecture

```
┌────────────────────────────────────────────────────┐
│  DigitalOcean Droplet (Ubuntu 24.04, BLR1)         │
│                                                    │
│  caddy:80 (public)                                 │
│    ├── /api/*   →  server:3000  (strips /api)      │
│    └── /*       →  admin:3001   (Next.js)          │
│                                                    │
│  postgres:5432  (internal-only)                    │
└────────────────────────────────────────────────────┘

Mac → Docker Hub → pull → droplet
```

**Runtime:** bun (server TS), Node (admin Next.js), alpine linux.
**Images:** pre-built on Mac, pushed to Docker Hub, pulled on droplet.
Nothing compiles on the droplet.

---

## Prerequisites

- DigitalOcean account with a credit card on file
- Docker Hub account (free)
- SSH key pair on your Mac (`~/.ssh/id_ed25519` or similar)
- `bun`, `docker`, `docker compose`, `git` locally

---

## First-time setup (once per droplet)

### 1. Create the droplet

DO dashboard → Droplets → Create:

| Setting | Value |
|---|---|
| Region | BLR1 (Bangalore) or closest to users |
| Image | Ubuntu 24.04 LTS x64 |
| Plan | Basic → Regular → **$12/mo (1 vCPU, 2 GB RAM, 50 GB SSD)** |
| Backups | ✅ Enable (~$2.40/mo) |
| Authentication | SSH Keys — upload your `~/.ssh/id_ed25519.pub` |
| Monitoring | ✅ Enable (free) |
| Hostname | `content-assist-dev` |

Note the droplet's public IP (e.g. `168.144.94.154`).

### 2. Harden + install Docker

SSH in as root:
```bash
ssh root@YOUR_DROPLET_IP
```

Then paste this whole block (creates non-root `deploy` user, sets passwordless
sudo, copies SSH key, enables firewall, disables root SSH):

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy

mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable

sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Logout + reconnect as `deploy`:
```bash
exit
ssh deploy@YOUR_DROPLET_IP
```

Install Docker:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

### 3. Point a free subdomain at the droplet

https://www.duckdns.org → log in with GitHub/Google → add subdomain →
set `current ip` to your droplet IP → **update ip**.

Verify:
```bash
dig +short your-name.duckdns.org
# → should print droplet IP
```

### 4. Configure AWS S3 bucket CORS

S3 Console → your bucket → **Permissions** tab → **Cross-origin resource sharing (CORS)** → Edit:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
    "AllowedOrigins": [
      "http://your-name.duckdns.org",
      "https://your-name.duckdns.org",
      "http://localhost:3001"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Without this, browser uploads to S3 get CORS-blocked.

### 5. Put env + compose on the droplet

From your Mac:

```bash
cd ~/Desktop/content-assist

# Droplet-specific env (replace values)
cp .env.production.example .env.droplet
# Edit .env.droplet and fill:
#   JWT_SECRET (openssl rand -base64 64)
#   GEMINI_API_KEY, OPENAI_API_KEY, REPLICATE_API_TOKEN
#   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
#   PUBLIC_ORIGIN=http://your-name.duckdns.org
#   DOCKERHUB_USER=yourhandle

scp docker-compose.prod.yml deploy@DROPLET_IP:~/docker-compose.prod.yml
scp .env.droplet deploy@DROPLET_IP:~/.env
ssh deploy@DROPLET_IP "mkdir -p ~/docker/caddy"
scp docker/caddy/Caddyfile deploy@DROPLET_IP:~/docker/caddy/Caddyfile
```

### 6. First deploy

Build + push images from Mac:
```bash
export DOCKERHUB_USER=yourhandle
docker login
./scripts/build-and-push.sh
```

Then on the droplet:
```bash
ssh deploy@DROPLET_IP
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Apply DB migrations (first time only)
docker compose -f docker-compose.prod.yml exec server bun run --filter @content-assist/db migrate
```

Verify:
```bash
curl http://your-name.duckdns.org/api/health
# → {"status":"ok",...}
```

Open `http://your-name.duckdns.org/auth/signup` in browser → create account.

---

## Routine deploy (every code change)

**On your Mac** — build + push:
```bash
export DOCKERHUB_USER=yourhandle   # or in ~/.zshrc
./scripts/build-and-push.sh
```

**On the droplet** — pull + restart:
```bash
ssh deploy@DROPLET_IP
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Takes ~2 min end to end.

---

## When you change the DB schema

After modifying Drizzle schema in `packages/db/src/schema/`:

```bash
# On Mac — generate a new migration file
bun run db:generate

# Commit the generated SQL + meta files
git add packages/db/migrations/
git commit -m "db: add X column to Y"

# Deploy as usual
./scripts/build-and-push.sh

# On droplet — apply the new migration
ssh deploy@DROPLET_IP
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec server bun run --filter @content-assist/db migrate
```

---

## Ops recipes

### Logs
```bash
# Tail everything (live)
docker compose -f docker-compose.prod.yml logs -f

# One service
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f admin
docker compose -f docker-compose.prod.yml logs -f caddy

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 server
```

### Status
```bash
docker compose -f docker-compose.prod.yml ps
```

### Restart a service
```bash
docker compose -f docker-compose.prod.yml restart server
```

### Shell into a container
```bash
docker compose -f docker-compose.prod.yml exec server sh
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d content_assist
```

### Rollback to a previous image
Each deploy tags with `latest` AND the short commit SHA. To revert:

```bash
# On droplet — list available tags
docker pull yourhandle/content-assist-server:latest    # check Docker Hub manually for SHA list

# Edit ~/docker-compose.prod.yml and change the server image tag:
#   image: ${DOCKERHUB_USER}/content-assist-server:abc1234
# (temporarily, or set TAG=abc1234 in .env)

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Database backup
```bash
# Quick snapshot to local file
ssh deploy@DROPLET_IP "docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres content_assist" > backup-$(date +%F).sql

# Restore
ssh deploy@DROPLET_IP "docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d content_assist" < backup-2026-04-22.sql
```

DO weekly backups cover the full droplet disk — that's your real recovery story.

### Stop everything
```bash
docker compose -f docker-compose.prod.yml down          # keeps data
docker compose -f docker-compose.prod.yml down -v       # wipes DB (dangerous)
```

---

## Adding HTTPS (when you're ready)

One-line change in `docker/caddy/Caddyfile`:

```diff
- {
-     auto_https off
- }
-
- :80 {
+ ca-dev.duckdns.org {
      handle /api/* { ... }
      handle { ... }
  }
```

Open 443:
```bash
ssh deploy@DROPLET_IP "sudo ufw allow 443/tcp"
```

Copy the updated Caddyfile up + restart caddy:
```bash
scp docker/caddy/Caddyfile deploy@DROPLET_IP:~/docker/caddy/Caddyfile
ssh deploy@DROPLET_IP "docker compose -f docker-compose.prod.yml restart caddy"
```

Caddy auto-provisions a Let's Encrypt cert on first HTTPS request.
Then `https://your-name.duckdns.org` works with a real padlock.

---

## Troubleshooting — problems we actually hit

### Server exits with `Cannot find module '/app/apps/server/dist/index.js'`
The tsc build emitted nothing because of a stale `.tsbuildinfo` cache.
**Fix is already in the build script** (`rm -rf dist *.tsbuildinfo && tsc ...`).
If it happens again: `rm -rf apps/server/dist apps/server/*.tsbuildinfo` locally
then rebuild.

### Server exits with `ERR_MODULE_NOT_FOUND: Cannot find package '@server/...'`
TypeScript path aliases didn't resolve at runtime.
**Fix: the server Dockerfile now uses bun at runtime**, which handles path
aliases + `.ts` source natively. If you revert to Node, you'd need `tsc-alias`
+ `--resolve-full-paths`.

### Server exits with `EADDRINUSE` immediately on boot
`export default app` in `src/index.ts` triggers bun's auto-serve on port 3000,
colliding with the explicit `serve()` call.
**Fix: remove the `export default app`** (already done).

### Admin shows "Failed to fetch" / CORS error
Admin was built with wrong `NEXT_PUBLIC_API_URL`.
**Fix: the build script now bakes `NEXT_PUBLIC_API_URL=/api`** by default,
which pairs with caddy's same-origin routing.

### `relation "..." does not exist` in server logs
A new Drizzle schema change exists but no migration was generated.
**Fix: `bun run db:generate` on your Mac**, commit the new SQL file, redeploy,
run migrate on the droplet.

### Avatar upload CORS error
S3 bucket's CORS policy doesn't allow the droplet domain.
**Fix: update the bucket's CORS JSON** (see step 4 of first-time setup).

### Can't SSH in as root after hardening
We disabled root SSH on purpose. Use `ssh deploy@IP` instead.
If you locked yourself out completely: DO dashboard → droplet → **Access** →
**Reset Root Password** → check email → Launch Droplet Console.

---

## Secrets checklist

Keep these rotated / secure:

- `JWT_SECRET` — droplet only, never in git
- `GEMINI_API_KEY` — droplet only
- `OPENAI_API_KEY` — droplet only
- `REPLICATE_API_TOKEN` — droplet only
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — droplet only, IAM-scoped to just your bucket
- `POSTGRES_PASSWORD` — internal to the compose network; fine to rotate
  occasionally

Every one of these is loaded from `~/.env` on the droplet. If you ever commit
them to git accidentally: **rotate immediately** — don't just `git rm`.

---

## File map (what lives where)

| File | Purpose |
|---|---|
| `docker-compose.prod.yml` | 4-service stack (postgres/server/admin/caddy) |
| `apps/server/Dockerfile` | Bun runtime, serves TS directly |
| `apps/admin/Dockerfile` | Node + Next.js `next start` |
| `docker/caddy/Caddyfile` | Port-80 reverse proxy config |
| `.env.production.example` | Template for the droplet env |
| `scripts/build-and-push.sh` | Mac-side build + Docker Hub push |
| `.github/workflows/deploy.yml` | CI (push to main → auto-deploy) |

---

## CI/CD (push-to-deploy)

Set up once, then `git push` handles everything:

1. Generate dedicated SSH key: `ssh-keygen -t ed25519 -f ~/.ssh/github_actions_deploy -N ""`
2. Install on droplet: `cat ~/.ssh/github_actions_deploy.pub | ssh deploy@DROPLET_IP "cat >> ~/.ssh/authorized_keys"`
3. Docker Hub → Account Settings → Security → New Access Token (`Read, Write, Delete`)
4. GitHub repo → Settings → Secrets and variables → Actions → add:
   - `DOCKERHUB_USERNAME` — your Docker Hub handle
   - `DOCKERHUB_TOKEN` — token from step 3
   - `DROPLET_HOST` — droplet IP or subdomain
   - `DROPLET_USER` — `deploy`
   - `DROPLET_SSH_KEY` — contents of `~/.ssh/github_actions_deploy` (private key)

From then on, every push to `main` runs `.github/workflows/deploy.yml` — builds,
pushes, pulls, restarts. Watch it in the **Actions** tab.
