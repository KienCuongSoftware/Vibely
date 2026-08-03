# Production runbook — AI Enhancement

## What ships in production

| Piece | Role |
|-------|------|
| Backend `enhancement` module | Enqueue, claim, versions, rule eval, lease recovery |
| `video_versions` | STANDARD + AI_ENHANCED playlists (never overwrite FFmpeg HLS) |
| Feed API | Prefer AI master playlist when `APP_ENHANCEMENT_PREFER_AI_PLAYBACK=true` |
| Worker `ai-enhance` | Independent container; poll or Rabbit |

Upload Service and `FfmpegHlsPipelineRunner` stay untouched.

## Backend env (`vibely.env`)

```bash
APP_ENHANCEMENT_ENABLED=true
APP_ENHANCEMENT_INTERNAL_TOKEN=<generate-long-secret>
APP_ENHANCEMENT_PREFER_AI_PLAYBACK=true
APP_ENHANCEMENT_ENQUEUE_ON_READY=false
APP_ENHANCEMENT_RULE_EVAL_ENABLED=true
APP_ENHANCEMENT_LEASE_RECOVERY_ENABLED=true
APP_ENHANCEMENT_RABBITMQ_ENABLED=false
APP_ENHANCEMENT_ENGINE=noop
APP_ENHANCEMENT_LEVEL=MEDIUM
APP_ENHANCEMENT_LEASE_MINUTES=30
```

Set `APP_ENHANCEMENT_ENQUEUE_ON_READY=true` only for small staging — every READY video costs GPU/CPU.

## Enable auto-enhance by views

Default rule `views-100k-native-enhance` is **disabled**. Turn on when ready:

```sql
UPDATE enhancement_rules
SET enabled = TRUE, updated_at = NOW()
WHERE name = 'views-100k-native-enhance';
```

Or lower the threshold:

```sql
UPDATE enhancement_rules
SET enabled = TRUE,
    predicate_json = '{"all":[{"metric":"views","op":">=","value":10000}]}',
    updated_at = NOW()
WHERE name = 'views-100k-native-enhance';
```

## Deploy worker

```bash
cd /opt/vibely
# ensure vibely.env has token + AWS + APP_S3_PUBLIC_URL_BASE
docker compose -f docker-compose.ai-enhance.yml up -d --build
docker logs -f vibely-ai-enhance-worker
```

Point `VIBELY_API_BASE` at the backend the worker can reach (Docker host gateway or internal network).

## Manual enqueue (smoke test)

```bash
curl -X POST https://vibely.sbs/api/admin/enhancement/enqueue \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"videoId":123,"profile":"ENHANCE_NATIVE","level":"MEDIUM"}'
```

Check versions:

```bash
curl https://vibely.sbs/api/videos/123/versions
```

Feed should return `aiEnhanced: true` and AI `masterPlaylistUrl` once COMPLETED.

## Real-ESRGAN (optional GPU)

1. Install `realesrgan-ncnn-vulkan` on the worker image/host.
2. Set `APP_ENHANCEMENT_ENGINE=realesrgan` and `ENHANCE_REALESRGAN_BIN=/path/to/binary`.
3. Rebuild/restart worker. On failure the worker falls back to noop FFmpeg.

## Ops checks

- Lease recovery requeues jobs stuck past `lease_until`.
- Rule evaluator scans latest 50 READY public videos every ~2 minutes.
- Worker refuses jobs if free disk &lt; `ENHANCE_MIN_FREE_GB` (default 5).
- Outputs are labeled **AI Enhanced**, never “native 4K”.
