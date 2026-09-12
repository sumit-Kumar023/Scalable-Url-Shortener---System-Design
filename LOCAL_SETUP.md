# Local Setup Guide (Windows 10/11, PowerShell, VS Code, Docker Desktop)

This guide reflects the **actual** files in this repository - ports,
script names, service names, and environment variables below were taken
directly from `docker-compose.yml`, `server/package.json`,
`client/package.json`, and `.env.example`.

## 1. Prerequisites

| Tool | Purpose | Recommended version | Verify |
|---|---|---|---|
| Git | Clone/manage the repo | 2.4x+ | `git --version` |
| Node.js + npm | Run the backend/frontend outside Docker if desired | Node 20.x LTS | `node --version` / `npm --version` |
| Docker Desktop | Runs MongoDB, Redis, backend, frontend, Nginx | Latest | `docker --version` |
| Docker Compose | Bundled with Docker Desktop | v2 (the `docker compose` subcommand) | `docker compose version` |
| k6 | Performance testing | Latest | `k6 version` |

**You do NOT need to install MongoDB or Redis separately** - Docker
Compose provides both as containers (`mongodb:7`, `redis:7-alpine`).
Only install Node.js locally if you want to run `npm run dev` outside
Docker for faster iteration; it's not required to run the full stack.

### Installing on Windows

- **Git**: `winget install --id Git.Git -e`
- **Node.js**: `winget install OpenJS.NodeJS.LTS`
- **Docker Desktop**: `winget install Docker.DockerDesktop`, then launch
  it once from the Start menu and wait for "Docker Desktop is running."
- **k6**: `winget install k6.k6` (or `choco install k6` if you use Chocolatey)

## 2. Environment Variables

Every variable below is read in `server/src/config/env.ts` (see
`.env.example` for the authoritative list with comments).

| Variable | Meaning | Secret? | Dev value |
|---|---|---|---|
| `NODE_ENV` | `development` / `production` / `test` | No | `development` |
| `PORT` | Backend HTTP port | No | `4000` |
| `MONGO_URI` | MongoDB connection string | No (but don't expose publicly) | `mongodb://localhost:27017/url-shortener` (Docker overrides this to `mongodb://mongodb:27017/url-shortener` automatically) |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection | No | `localhost` / `6379` (Docker overrides to `redis` / `6379`) |
| `JWT_SECRET` | Signs/verifies auth tokens | **Yes** | any long random string for local dev |
| `JWT_EXPIRES_IN` | Token lifetime | No | `7d` |
| `BASE_URL` | Used to build `shortUrl` values returned by the API | No | `http://localhost` |
| `CORS_ORIGIN` | Allowed frontend origin (only matters if frontend/backend run outside Docker on different ports) | No | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_SECONDS` | Rate-limit window | No | `60` |
| `RATE_LIMIT_REGISTER_MAX` / `_LOGIN_MAX` / `_CREATE_URL_MAX` / `_REDIRECT_MAX` | Per-route limits | No | `5` / `5` / `10` / `100` |
| `DISABLE_REDIS_CACHE` | Bypasses Redis entirely (used for the Redis-vs-MongoDB benchmark) | No | `false` |

**Which `.env` files you need:**

- **Docker Compose (recommended path):** copy `.env.example` to `.env`
  at the **project root**. `docker-compose.yml` reads it via `env_file`.
- **Running the backend outside Docker** (`cd server; npm run dev`):
  copy `.env.example` to `server/.env` instead - `dotenv` (via
  `config/env.ts`) loads `.env` relative to the backend's own working
  directory.

## 3. Installation

```powershell
# Clone (or open the folder you already have)
git clone <your-repo-url> url-shortener
cd url-shortener

# Environment file for Docker Compose
Copy-Item .env.example .env

# (Optional, only if you plan to run outside Docker)
cd server; npm install; cd ..
cd client; npm install; cd ..
```

## 4. Docker Execution

| Service | Image/build | Port (host) | Notes |
|---|---|---|---|
| `mongodb` | `mongo:7` | `27017` | Published for local GUI tools (Compass); not required by the app |
| `redis` | `redis:7-alpine` | `6379` | Published for `redis-cli`; not required by the app |
| `backend` | `./server/Dockerfile` | *(none published)* | Only reachable through Nginx - this is what makes `--scale` safe |
| `frontend` | `./client/Dockerfile` | *(none published)* | Static build served by an internal Nginx, itself proxied by the main Nginx |
| `nginx` | `nginx:1.27-alpine` | `80` | The single entry point: `http://localhost` |

```powershell
docker compose up --build
```

Leave that terminal open (or add `-d` to run in the background), then in
a second terminal:

```powershell
docker compose ps
docker compose logs -f backend      # backend logs
docker compose logs -f nginx        # nginx access/error logs
docker compose logs -f mongodb
docker compose logs -f redis
```

## 5. First Run

1. Install prerequisites (Section 1).
2. Start Docker Desktop and wait for it to say "running."
3. Open PowerShell.
4. `cd` into the project folder.
5. `Copy-Item .env.example .env`
6. `docker compose up --build -d`
7. `docker compose ps` - all five services should show `running`/`healthy`.
8. Check the API: `Invoke-RestMethod http://localhost/health` - expect `data.status: "ok"`.
9. Open `http://localhost` in a browser - the Snapr landing page should load.
10. Register a user via the "Sign up" page.
11. Log in (you're redirected here automatically after registering).
12. Create a short URL from the Dashboard.
13. Click the generated short link (or open it in a new tab) - it should redirect to the original URL.
14. Open "Analytics" on that link from the dashboard - click count should show `1`.

## 6. Manual Testing Checklist

| # | Test | Steps | Expected |
|---|---|---|---|
| 1 | Registration | Sign up with a new email | Redirected to Dashboard, logged in |
| 2 | Login | Log out, log back in | Redirected to Dashboard |
| 3 | URL creation | Create a URL with no alias/expiration | Short URL shown, copyable |
| 4 | Redirect | Open the generated short URL | 302 to the original URL |
| 5 | Dashboard | View Dashboard after creating a few links | Stats and table update |
| 6 | Analytics | Click a link, then open its Analytics page | `Total Clicks` incremented, `Last Clicked` set |
| 7 | Redis cache HIT | Click the same short URL twice | `docker compose logs backend` shows `"cache":"HIT"` on the 2nd request |
| 8 | Redis cache MISS | Create a brand-new URL, click it once | First request logs `"cache":"MISS"` |
| 9 | Custom alias | Create a URL with `customAlias: my-alias` | `shortUrl` ends in `/my-alias` |
| 10 | Duplicate alias | Try to reuse the same alias | `409 Conflict`, "already taken" |
| 11 | Link expiration | Create a URL with `expiresAt: 1h`, then manually set its expiry to the past via `PATCH` (or wait) | Redirect returns `404` once expired |
| 12 | Rate limiting | Hit `POST /api/auth/login` 6+ times in under a minute with bad credentials | 6th+ request returns `429` |
| 13 | Delete URL | Click "Delete" on a dashboard row | Removed from the table and DB |
| 14 | Health check | `Invoke-RestMethod http://localhost/health` | `200`, `mongo: "up"`, `redis: "up"` |

## 7. Performance Testing Guide

See `performance/README.md` for the full, exact command list (it uses
`http://localhost` as `$env:BASE_URL` and reads the short code and JWT
straight from live API responses via PowerShell's `Invoke-RestMethod`).
Quick pointers:

```powershell
$env:BASE_URL = "http://localhost"
k6 run performance/scripts/redirect-test.js       # needs $env:SHORT_CODE
k6 run performance/scripts/create-url-test.js     # needs $env:AUTH_TOKEN
k6 run performance/scripts/cache-test.js          # needs $env:SHORT_CODES
k6 run performance/scripts/rate-limit-test.js     # needs $env:SHORT_CODE
```

Results land in `performance/results/*.json`. Fill in
`performance/results/report.md` with the real numbers afterward.

## 8. Scaling Guide

```powershell
docker compose up -d --build --scale backend=1
docker compose ps          # confirm 1 backend container
docker stats --no-stream   # CPU/memory snapshot

docker compose up -d --scale backend=2
docker compose ps          # confirm 2 backend containers

docker compose up -d --scale backend=4
docker compose ps          # confirm 4 backend containers
```

Run the same `k6 run performance/scripts/redirect-test.js` command
(with a different `$env:OUTPUT_FILE` each time) at every replica count -
see `performance/README.md` Test 6 for the full sequence.

## 9. Stop / Restart

```powershell
docker compose stop                 # stop containers, keep them and volumes
docker compose down                 # remove containers, keep named volumes (data persists)
docker compose down -v              # ⚠ ALSO deletes the mongo-data/redis-data volumes - your dev DB and cache are gone
```

Rebuild after a code/Dockerfile change:

```powershell
docker compose up --build -d
```

Restart a single service (using its actual `docker-compose.yml` name):

```powershell
docker compose restart backend
docker compose restart frontend
docker compose restart redis
docker compose restart mongodb
```

## 10. Troubleshooting (Windows)

| Symptom | Diagnostic | Likely cause | Solution |
|---|---|---|---|
| `docker compose` hangs or errors immediately | `docker info` | Docker Desktop isn't running | Start Docker Desktop, wait for "running" status |
| `port is already allocated` on `80` | `netstat -ano \| findstr :80` | Something else (IIS, Skype, another proxy) is using port 80 | Stop that process, or change the `nginx` port mapping in `docker-compose.yml` (e.g. `"8080:80"`) |
| Backend can't connect to MongoDB | `docker compose logs backend` | Mongo container not healthy yet, or `MONGO_URI` wrong | `docker compose ps` to check health; wait for `mongodb` to be healthy, or re-check `.env` |
| Backend logs Redis connection errors | `docker compose logs redis` / `docker compose logs backend` | Redis container not up yet | The app degrades gracefully (cache/rate-limit bypassed) but check `docker compose ps` for the `redis` service |
| Backend container keeps restarting | `docker compose logs backend --tail=50` | Uncaught startup error (bad env var, Mongo unreachable) | Read the last log lines; fix `.env` or wait for dependencies |
| Frontend can't reach the API (network errors in browser console) | Browser DevTools → Network tab | Hitting the Vite dev server directly without the proxy, or Nginx not running | If using `npm run dev` outside Docker, ensure the backend is running on port 4000 (Vite proxies `/api` to it); if using Docker, confirm `nginx` is up |
| CORS error in browser console | Browser DevTools → Console | `CORS_ORIGIN` doesn't match the frontend's actual origin (only relevant outside Docker) | Set `CORS_ORIGIN` in `server/.env` to match, e.g. `http://localhost:5173` |
| `Missing required environment variable` on backend startup | `docker compose logs backend` | `.env` missing or not copied | `Copy-Item .env.example .env` at the project root |
| `npm install` fails | Re-run with `npm install --verbose` | Network/proxy issue, or Node version mismatch | Confirm `node --version` is 20.x; check your network/VPN |
| TypeScript build fails (`tsc` errors) | `cd server; npm run build` or `cd client; npm run build` | A real type error was introduced, or `node_modules` is stale | Read the reported file/line; try deleting `node_modules` and `npm install` again |
| Container stuck in a restart loop | `docker compose ps` shows `Restarting` | App crashes on startup (see backend logs) | `docker compose logs <service> --tail=100`, fix the root cause, `docker compose up --build -d` |
| `k6: command not found` | `k6 version` | k6 not installed or not on PATH | `winget install k6.k6`, then open a **new** PowerShell window |
| Login/register returns `401`/`400` unexpectedly | `docker compose logs backend` | Wrong password, malformed JSON body, or expired token | Re-check the request body; log in again for a fresh token |

## 11. Clean Reset

**Safe reset** (keeps your data, just restarts fresh containers):

```powershell
docker compose down
docker compose up --build -d
```

**Destructive reset** (⚠ deletes MongoDB and Redis data permanently):

```powershell
docker compose down -v
docker compose up --build -d
```

`down -v` removes the named volumes `mongo-data` and `redis-data`
defined in `docker-compose.yml` - every user, URL, and cached entry is
gone and MongoDB/Redis start completely empty on the next `up`.

## 12. Daily Development Workflow

1. Start Docker Desktop.
2. `cd url-shortener`
3. `git pull`
4. `docker compose up -d`
5. `Invoke-RestMethod http://localhost/health` to confirm everything's up
6. Develop (edit files under `server/src` or `client/src`)
7. `cd server; npm test` (backend tests don't need Docker - they mock Mongo/Redis)
8. `docker compose stop` when done for the day

## 13. Daily Command Cheat Sheet

```powershell
# Start
docker compose up -d

# Stop
docker compose stop

# Restart one service
docker compose restart backend

# Logs
docker compose logs -f backend

# Rebuild after code changes
docker compose up --build -d

# Backend tests (no Docker needed)
cd server
npm test

# Performance tests (needs the stack running + k6 installed)
k6 run performance/scripts/redirect-test.js
```
