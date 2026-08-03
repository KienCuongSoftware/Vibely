"""Vibely AI Enhancement Worker

Independent GPU/CPU worker for AI Enhancement (Part 4 + Part 5 production).

## Engines

| `ENHANCE_ENGINE` | Behavior |
|------------------|----------|
| `noop` (default) | FFmpeg unsharp + capped upscale + HLS |
| `realesrgan` | `realesrgan-ncnn-vulkan` if installed; else falls back to noop |

## Run locally

```bash
cd ai-workers/ai-enhance
python -m venv .venv
# Windows: .venv\\Scripts\\activate
pip install -r requirements.txt

set VIBELY_API_BASE=http://127.0.0.1:8080
set ENHANCE_INTERNAL_TOKEN=vibely-dev-enhance-token
set AWS_S3_BUCKET=...
set AWS_ACCESS_KEY_ID=...
set AWS_SECRET_ACCESS_KEY=...
set APP_S3_PUBLIC_URL_BASE=https://cdn.example.com

python -m app
```

## Enqueue a job (admin JWT)

```bash
curl -X POST http://127.0.0.1:8080/api/admin/enhancement/enqueue \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"videoId\":123,\"profile\":\"ENHANCE_NATIVE\",\"level\":\"MEDIUM\"}"
```

## Production

See [05-PRODUCTION.md](../../docs/architecture/ai-enhancement/05-PRODUCTION.md).

```bash
cd /opt/vibely
docker compose -f docker-compose.ai-enhance.yml up -d --build
```

Does **not** modify Upload Service or `FfmpegHlsPipelineRunner`.
