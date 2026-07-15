# Content Understanding worker — Phase 2

## Capabilities

| Stage | Tech | Output |
|-------|------|--------|
| Metadata | hashtag/keyword lexicon | semantic tags |
| OCR | RapidOCR on sampled frames | `ocrFeatures`, OCR tags |
| Visual | OpenCLIP ViT-B-32 zero-shot | `visualFeatures`, visual tags |
| Speech | faster-whisper Small | `speechFeatures`, speech tags |
| Vectors | Qdrant `vibely_cu_frame` + `vibely_cu_video` | related-video foundation |

Modality failures are **soft-fail** — job still completes with metadata at minimum.

## Env (Phase 2)

| Var | Default | Meaning |
|-----|---------|---------|
| `CU_CLIP_ENABLED` | `true` | OpenCLIP tag priors + embeddings |
| `CU_WHISPER_ENABLED` | `true` | ASR transcript |
| `CU_WHISPER_MODEL` | `small` | faster-whisper model size |
| `CU_WHISPER_MAX_SECONDS` | `120` | Max audio analyzed |
| `CU_QDRANT_ENABLED` | `true` | Upsert frame/video vectors |
| `QDRANT_URL` | `http://127.0.0.1:6333` | Qdrant HTTP API |
| `CU_COMPLETE_TIMEOUT` | `600` | HTTP timeout for `/complete` |
| `CU_CLIP_TAG_THRESHOLD` | `0.12` | Softmax threshold for visual tags |

See Phase 1 env vars (`CU_FRAMES_ENABLED`, `CU_OCR_ENABLED`, `AWS_*`, …) in earlier sections.

## VPS poll worker (recommended)

```bash
docker rm -f vibely-cu-worker-poll 2>/dev/null || true
docker pull kiencuongsoftware/vibely-cu-worker:latest
docker run -d --name vibely-cu-worker-poll --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  -e VIBELY_API_BASE=http://host.docker.internal:8080 \
  -e QDRANT_URL=http://host.docker.internal:6333 \
  -e CU_INTERNAL_TOKEN="$(grep '^APP_CU_INTERNAL_TOKEN=' /opt/vibely/vibely.env | cut -d= -f2-)" \
  -e CU_RABBITMQ_ENABLED=false \
  -e CU_POLL_SECONDS=5 \
  -e CU_COMPLETE_TIMEOUT=600 \
  --env-file /opt/vibely/vibely.env \
  kiencuongsoftware/vibely-cu-worker:latest
```

**Note:** Phase 2 image is large (~torch + whisper). First job on CPU may take 2–5 minutes.

## Build / push

```bash
cd ai-workers/content-understanding
docker build -t kiencuongsoftware/vibely-cu-worker:latest .
docker push kiencuongsoftware/vibely-cu-worker:latest
```

## Smoke (after requeue)

```sql
SELECT status FROM analysis_jobs WHERE video_id = 112;
SELECT slug, confidence, source FROM video_semantic_tags vst
JOIN semantic_tags st ON st.id = vst.tag_id WHERE vst.video_id = 112;
SELECT feature_version, left(visual::text,120), left(speech::text,120)
FROM content_features WHERE video_id = 112;
```

Qdrant: `curl http://127.0.0.1:6333/collections/vibely_cu_video`
