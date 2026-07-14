# Content Understanding worker — Phase 1 / 1.1

## What it does

1. **Phase 1** — metadata/hashtag lexicon → semantic tags (+ category projection)
2. **Phase 1.1** — download video → sample frames (OpenCV) → RapidOCR → lexicon boost + `ocrFeatures`

Reuses the same download / frame / RapidOCR approach as `ai-workers/originality`.

## Env

| Var | Default | Meaning |
|-----|---------|---------|
| `VIBELY_API_BASE` | required | Backend URL |
| `CU_INTERNAL_TOKEN` | required | Internal API token |
| `CU_RABBITMQ_ENABLED` | `false` | Rabbit vs poll |
| `CU_FRAMES_ENABLED` | `true` | Download + sample frames |
| `CU_OCR_ENABLED` | `true` | Run RapidOCR on frames |
| `CU_FRAME_COUNT` | `8` | Frames per video (1–24) |
| `CU_WORK_DIR` | `/tmp/cu-work` | Temp download dir |
| `AWS_S3_BUCKET` / `AWS_*` | optional | Prefer S3 download like originality |

Frame/OCR errors are **non-fatal** for metadata: the worker still completes with OCR note / empty texts.

## Local run

```bash
cd ai-workers/content-understanding
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt

set VIBELY_API_BASE=http://127.0.0.1:8080
set CU_INTERNAL_TOKEN=vibely-dev-cu-token
set CU_RABBITMQ_ENABLED=false
python -m app
```

## Build / push

```bash
cd ai-workers/content-understanding
docker build -t kiencuongsoftware/vibely-cu-worker:latest .
docker push kiencuongsoftware/vibely-cu-worker:latest
```

## VPS poll worker (recommended for smoke)

```bash
docker rm -f vibely-cu-worker-poll 2>/dev/null || true
docker pull kiencuongsoftware/vibely-cu-worker:latest
docker run -d --name vibely-cu-worker-poll --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  -e VIBELY_API_BASE=http://host.docker.internal:8080 \
  -e CU_INTERNAL_TOKEN="$(grep '^APP_CU_INTERNAL_TOKEN=' /opt/vibely/vibely.env | cut -d= -f2-)" \
  -e CU_RABBITMQ_ENABLED=false \
  -e CU_POLL_SECONDS=3 \
  -e CU_FRAMES_ENABLED=true \
  -e CU_OCR_ENABLED=true \
  -e CU_FRAME_COUNT=8 \
  --env-file /opt/vibely/vibely.env \
  kiencuongsoftware/vibely-cu-worker:latest
```

`--env-file` passes `AWS_*` so downloads can use S3 when URLs are private/`uploads/...` keys.
