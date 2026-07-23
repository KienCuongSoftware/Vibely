# Deployment

| File | Description |
|------|-------------|
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | Local, staging, prod |
| [CI_CD.md](CI_CD.md) | Pipeline, rollback |

## Quick start (local)

1. PostgreSQL + `DB_PASSWORD`
2. `docker compose up -d redis`
3. `cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev`
4. `cd frontend && npm run dev`

See root [README.md](../../README.md).

## Current VPS Deployment

The current production-like VPS deployment is a single Spring Boot JAR managed by systemd.

| Item | Value |
|------|-------|
| Host | `72.62.72.93` (`srv1756911`) |
| Service | `vibely.service` |
| JAR | `/opt/vibely/backend/vibely-backend.jar` |
| Environment file | `/opt/vibely/vibely.env` |
| Imported local config | `/opt/vibely/config/application-local.yaml` |
| Public API | `https://vibely.sbs` |

`/opt/vibely/vibely.env` should include:

```bash
SPRING_PROFILES_ACTIVE=dev
SPRING_CONFIG_IMPORT=optional:file:/opt/vibely/config/application-local.yaml
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/vibely
SPRING_DATASOURCE_USERNAME=vibely
DB_PASSWORD=...
JWT_SECRET=...
OAUTH_PUBLIC_BASE_URL=https://vibely.sbs
FRONTEND_BASE_URL=https://vibely.sbs
APP_REDIS_ENABLED=true
APP_S3_ENABLED=true
APP_PROCESSING_WORKER_ENABLED=true
APP_AUTH_COOKIE_SECURE=true
APP_SESSION_COOKIE_SECURE=true

# Description translation (NLLB via FastAPI)
APP_TRANSLATION_ENABLED=true
APP_TRANSLATION_BASE_URL=http://127.0.0.1:8002
APP_TRANSLATION_INTERNAL_TOKEN=vibely-dev-translation-token
APP_TRANSLATION_WORKER_ENABLED=true
```

For native Facebook login, set both generic and direct Spring properties to avoid placeholder/import ambiguity:

```bash
FACEBOOK_APP_ID=2213321186098020
FACEBOOK_APP_SECRET=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_ID=2213321186098020
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_SECRET=...
```

Google/Facebook/LINE browser OAuth and storage/mail secrets may also live in `/opt/vibely/config/application-local.yaml`.

## Deploy Backend JAR

Build on Windows:

```powershell
cd D:\Worksplace\FullStack\Vibely\backend
mvn -DskipTests package
scp target/vibely-backend-*.jar root@72.62.72.93:/opt/vibely/backend/vibely-backend.jar
```

Restart on the VPS:

```bash
systemctl restart vibely
systemctl status vibely
```

Useful checks:

```bash
curl -s http://127.0.0.1:8080/actuator/health
curl -s https://vibely.sbs/api/feed/for-you?size=2
# OAuth must 302 to Google (not return SPA index.html):
curl -sI https://vibely.sbs/api/oauth2/authorization/google | head -5
journalctl -u vibely -n 80 --no-pager
```

If `curl -sI https://vibely.sbs/api/oauth2/authorization/google` returns `200` + `text/html`, nginx is not proxying `/api/` to the backend. OAuth browser flow uses `/api/oauth2/authorization/{provider}` and callback `/api/login/oauth2/code/{provider}` (register both in Google/Facebook console).

## Build and Push Backend Docker Image

Docker Hub repository:

```text
kiencuongsoftware/vibely-backend
```

Build from the backend directory:

```powershell
cd D:\Worksplace\FullStack\Vibely\backend
docker build -t kiencuongsoftware/vibely-backend:latest .
```

Tag an immutable version when preparing a release:

```powershell
docker tag kiencuongsoftware/vibely-backend:latest kiencuongsoftware/vibely-backend:YYYYMMDD-HHMM
```

Push:

```powershell
docker login
docker push kiencuongsoftware/vibely-backend:latest
docker push kiencuongsoftware/vibely-backend:YYYYMMDD-HHMM
```

Run locally with env supplied from a file:

```powershell
docker run --rm -p 8080:8080 --env-file .\vibely.env kiencuongsoftware/vibely-backend:latest
```

For VPS/container deployments, keep secrets in the runtime environment rather than baking them into the image. Required values are the same as `/opt/vibely/vibely.env` (database, JWT, S3, OAuth, Redis, mail).

## Build and Push Frontend Docker Image

Docker Hub repository:

```text
kiencuongsoftware/vibely-frontend
```

Build from the frontend directory:

```powershell
cd D:\Worksplace\FullStack\Vibely\frontend
docker build -t kiencuongsoftware/vibely-frontend:latest .
```

Push:

```powershell
docker login
docker push kiencuongsoftware/vibely-frontend:latest
```

The frontend image serves the Vite build with Nginx. Runtime environment:

| Variable | Default | Purpose |
|----------|---------|---------|
| `BACKEND_UPSTREAM` | `http://backend:8080` | Nginx upstream for `/api`, OAuth callbacks, share redirects, and WebSocket |
| `CLIENT_MAX_BODY_SIZE` | `200m` | Nginx upload body limit |

Example local container run against a host backend:

```powershell
docker run --rm -p 8081:80 `
  -e BACKEND_UPSTREAM=http://host.docker.internal:8080 `
  kiencuongsoftware/vibely-frontend:latest
```

## Deploy Frontend Static Files to VPS

Host nginx serves the SPA from `/var/www/vibely`. **`docker compose pull` alone does not update that folder** unless you sync or point nginx at the frontend container (`127.0.0.1:8081`).

After pushing a new frontend image:

```bash
cd /opt/vibely
bash deploy/vps/sync-frontend-static.sh
# or from repo root on VPS:
bash /path/to/Vibely/deploy/vps/sync-frontend-static.sh
```

Verify the bundle uses `/api/oauth2/authorization/` (not bare `/oauth2/`):

```bash
grep -o 'oauth2/authorization[^`"]*' /var/www/vibely/assets/LoginPage-*.js | head -1
# expected: /api/oauth2/authorization/
```

## Fix OAuth “jumps to /foryou” (no Google/Facebook picker)

**Symptom:** Click Google/Facebook on `https://vibely.sbs` → back to `/foryou` without account picker. Local works.

**Cause:** Stale SPA in `/var/www/vibely` calls `/oauth2/authorization/{provider}`. If host nginx has no rule for `/oauth2/`, nginx returns `index.html`, React catch-all sends you to `/foryou`. Direct API works: `curl -sI https://vibely.sbs/api/oauth2/authorization/google` → `302`.

**Fix (pick one or both):**

1. **Nginx legacy redirect** — add to `/etc/nginx/sites-available/vibely` (see `deploy/nginx/vibely.conf`):

```nginx
location /oauth2/ {
    return 307 /api$request_uri;
}
location /login/oauth2/ {
    return 307 /api$request_uri;
}
```

Then `nginx -t && systemctl reload nginx`. Smoke test:

```bash
curl -sI https://vibely.sbs/oauth2/authorization/google | grep -i '^HTTP\|^Location'
# expect 307 → /api/oauth2/authorization/google, then 302 to accounts.google.com
```

2. **Sync new frontend** — run `deploy/vps/sync-frontend-static.sh` so the bundle calls `/api/oauth2/authorization/` directly and includes OAuth callback fixes.

Reference compose for VPS: `deploy/vps/docker-compose.yml`.

## Deploy Translation API (NLLB)

CPU-first FastAPI service (description translation only in v1):

```bash
cd /opt/vibely
# Optional smoke without downloading the model:
# TRANSLATION_MOCK=true
docker compose -f docker-compose.translation.yml up -d --build
curl -s http://127.0.0.1:8002/health
```

Backend must have `APP_TRANSLATION_ENABLED=true` and `APP_TRANSLATION_BASE_URL=http://127.0.0.1:8002` (host network). Swap GPU/model later by changing only this compose — Spring/React contracts stay the same.

## OAuth Smoke Tests

Validate Facebook app credentials directly against Meta:

```bash
curl -s "https://graph.facebook.com/v19.0/debug_token?input_token=test&access_token=2213321186098020|YOUR_APP_SECRET"
```

Expected with a fake token and valid app secret: a JSON `data` object with `is_valid: false`.

Validate backend config:

```bash
curl -X POST http://127.0.0.1:8080/api/auth/oauth/native \
  -H "Content-Type: application/json" \
  -H "X-Vibely-Client: mobile" \
  -d '{"provider":"facebook","accessToken":"test"}'
```

Expected with a fake token and valid backend config: Facebook's invalid token message, for example `Invalid OAuth access token - Cannot parse access token`. A generic `Không xác minh được token Facebook` means the running JAR/config still cannot call the provider correctly.
