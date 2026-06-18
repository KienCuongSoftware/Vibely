# Environments

## 1. Overview

| Env | Branch | Data | CDN |
|-----|--------|------|-----|
| Local | feature | Docker PG, optional Redis | dev presign URLs |
| Staging | main | anonymized snapshot | staging CF |
| Production | release tag | RDS prod | prod CF |

## 2. Configuration matrix

| Variable | Local | Prod |
|----------|-------|------|
| `app.redis.enabled` | true (recommended) | true |
| `app.antibot.kafka-enabled` | false | true |
| `spring.jpa.show-sql` | true | false |
| JWT secret | dev | Secrets Manager |
| `OPENAI_API_KEY` | `application-local.yaml` or env | Secrets Manager |
| `DISCOVERY_OPENAI_ENABLED` | `true` | `true` |

## 3. Current VPS Reality

The current VPS deployment is intentionally simpler than the target blue/green model:

- Systemd service: `vibely.service`
- JAR path: `/opt/vibely/backend/vibely-backend.jar`
- Main env file: `/opt/vibely/vibely.env`
- Imported config: `/opt/vibely/config/application-local.yaml`
- Active profile: `dev`
- Public base URL: `https://vibely.sbs`

Important VPS env values:

| Variable | Purpose |
|----------|---------|
| `SPRING_PROFILES_ACTIVE=dev` | Current active Spring profile |
| `SPRING_CONFIG_IMPORT=optional:file:/opt/vibely/config/application-local.yaml` | Imports local secret YAML |
| `OAUTH_PUBLIC_BASE_URL=https://vibely.sbs` | OAuth redirect base |
| `FRONTEND_BASE_URL=https://vibely.sbs` | OAuth success/failure frontend base |
| `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_ID` | Direct Spring Facebook App ID |
| `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_SECRET` | Direct Spring Facebook App Secret |

Keep provider secrets out of git. If secrets were shared in screenshots/chat, rotate them in the provider console and update the VPS env.

## 4–15.

Blue/green: two ASG target groups, flip Nginx upstream. Rollback: previous artifact + Flyway forward-only fixes. Hardening: WAF, shield, rate limits at edge.
