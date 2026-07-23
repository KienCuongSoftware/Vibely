# Vibely Translation Service

FastAPI gateway around **NLLB-200** (`facebook/nllb-200-distilled-600M` by default).

Spring Boot calls this service; React never talks to it directly.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | none |
| POST | `/v1/detect` | `X-Internal-Token` |
| POST | `/v1/translate` | `X-Internal-Token` |

## Env

| Variable | Default |
|----------|---------|
| `TRANSLATION_MODEL` | `facebook/nllb-200-distilled-600M` |
| `TRANSLATION_DEVICE` | `cpu` |
| `TRANSLATION_MOCK` | `false` — set `true` for smoke without HF download |
| `TRANSLATION_INTERNAL_TOKEN` | shared with Spring `APP_TRANSLATION_INTERNAL_TOKEN` |

## Local

```bash
cd ai-workers/translation
pip install -r requirements.txt
TRANSLATION_MOCK=true uvicorn app.main:app --port 8002
```

Compose: `deploy/vps/docker-compose.translation.yml`.
