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

## 3–15.

Blue/green: two ASG target groups, flip Nginx upstream. Rollback: previous artifact + Flyway forward-only fixes. Hardening: WAF, shield, rate limits at edge.
