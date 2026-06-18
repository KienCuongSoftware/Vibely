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
journalctl -u vibely -n 80 --no-pager
```

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
