# Originality worker — local run

## Required env

```
VIBELY_API_BASE=http://127.0.0.1:8080
ORIGINALITY_INTERNAL_TOKEN=vibely-dev-originality-token
QDRANT_URL=http://127.0.0.1:6333
QDRANT_ENABLED=true
AWS_S3_BUCKET=...
AWS_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Run stack

```bash
cd deploy/vps
docker compose -f docker-compose.originality.yml up -d qdrant
cd ../../ai-workers/originality
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app
```

## Production compose

```bash
cd /opt/vibely
docker compose -f docker-compose.yml -f docker-compose.originality.yml up -d
```

Set `APP_ORIGINALITY_INTERNAL_TOKEN` in `vibely.env` to the same value as the worker.
