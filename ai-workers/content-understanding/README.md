# Content Understanding worker — Phase 1

## What it does

- Consumes analysis jobs from Vibely backend
- Phase 1: metadata/hashtag lexicon → `video_semantic_tags` (+ category projection)
- OCR/CLIP/Whisper arrive in later phases (stubs already in payload)

## Transports

| Mode | Env | Behavior |
|------|-----|----------|
| Poll (default) | `CU_RABBITMQ_ENABLED=false` | `POST /api/internal/content-understanding/claim` |
| RabbitMQ | `CU_RABBITMQ_ENABLED=true` | Consume `cu.analyze` then claim by `jobId` |

## Local run

```bash
# Backend needs Flyway V61 applied and APP_CU_ENABLED=true
cd ai-workers/content-understanding
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt

set VIBELY_API_BASE=http://127.0.0.1:8080
set CU_INTERNAL_TOKEN=vibely-dev-cu-token
set CU_RABBITMQ_ENABLED=false
python -m app
```

## With RabbitMQ (VPS / compose)

```bash
cd deploy/vps
docker compose -f docker-compose.content-understanding.yml up -d --build
```

Backend env (`vibely.env`):

```
APP_CU_ENABLED=true
APP_CU_RABBITMQ_ENABLED=true
APP_CU_INTERNAL_TOKEN=...same as worker...
RABBITMQ_HOST=127.0.0.1
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=vibely
RABBITMQ_PASSWORD=vibely
```

Backend uses `network_mode: host` on VPS → `RABBITMQ_HOST=127.0.0.1`.

## Build image

```bash
cd ai-workers/content-understanding
docker build -t kiencuongsoftware/vibely-cu-worker:latest .
docker push kiencuongsoftware/vibely-cu-worker:latest
```
