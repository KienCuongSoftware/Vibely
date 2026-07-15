# Content Understanding worker — Phase 2.1

## Capabilities

| Stage | Tech | Output |
|-------|------|--------|
| Metadata | hashtag/keyword lexicon | semantic tags |
| OCR | RapidOCR on sampled frames | `ocrFeatures`, OCR tags |
| Visual | OpenCLIP ViT-B-32 zero-shot | `visualFeatures`, visual tags |
| Objects | YOLOv8n lite | `objectFeatures`, object tags |
| Scene | YOLO indoor/outdoor heuristic | `sceneFeatures`, scene tags |
| Speech | faster-whisper Small | `speechFeatures`, speech tags |
| Fusion | Late weighted evidential (`fusion.py`) | fused `semanticTags` |
| Vectors | Qdrant `vibely_cu_frame` + `vibely_cu_video` | related-video foundation |

Modality failures are **soft-fail** — job still completes with metadata at minimum.

## Env (Phase 2.1)

| Var | Default | Meaning |
|-----|---------|---------|
| `CU_CLIP_ENABLED` | `true` | OpenCLIP tag priors + embeddings |
| `CU_WHISPER_ENABLED` | `true` | ASR transcript |
| `CU_WHISPER_MODEL` | `small` | faster-whisper model size |
| `CU_WHISPER_MAX_SECONDS` | `120` | Max audio analyzed |
| `CU_YOLO_ENABLED` | `true` | YOLOv8n object detection |
| `CU_YOLO_WEIGHTS` | `yolov8n.pt` | Ultralytics weights (auto-download) |
| `CU_YOLO_CONF` | `0.35` | Detection confidence floor |
| `CU_YOLO_MAX_FRAMES` | `6` | Max frames for YOLO |
| `CU_QDRANT_ENABLED` | `true` | Upsert frame/video vectors |
| `QDRANT_URL` | `http://127.0.0.1:6333` | Qdrant HTTP API |
| `CU_COMPLETE_TIMEOUT` | `600` | HTTP timeout for `/complete` |
| `CU_CLIP_TAG_THRESHOLD` | `0.12` | Softmax threshold for visual tags |
| `CU_FUSION_STORE_TAU` | `0.35` | Min fused confidence to keep |
| `CU_FUSION_SOFT_CAP` | `50` | Max tags returned |

See Phase 1 env vars (`CU_FRAMES_ENABLED`, `CU_OCR_ENABLED`, `AWS_*`, …) in earlier sections.

## VPS poll worker (recommended)

```bash
docker rm -f vibely-cu-worker-poll 2>/dev/null || true
docker pull kiencuongsoftware/vibely-cu-worker:latest
docker run -d --name vibely-cu-worker-poll --restart unless-stopped \
  --network vibely_default \
  --add-host=host.docker.internal:host-gateway \
  -e VIBELY_API_BASE=http://host.docker.internal:8080 \
  -e QDRANT_URL=http://qdrant:6333 \
  -e CU_INTERNAL_TOKEN="$(grep '^APP_CU_INTERNAL_TOKEN=' /opt/vibely/vibely.env | cut -d= -f2-)" \
  -e CU_RABBITMQ_ENABLED=false \
  -e CU_POLL_SECONDS=5 \
  -e CU_COMPLETE_TIMEOUT=600 \
  -e CU_YOLO_ENABLED=true \
  --env-file /opt/vibely/vibely.env \
  kiencuongsoftware/vibely-cu-worker:latest
```

**Note:** Image is large (~torch + whisper + yolov8n). First job on CPU may take several minutes; YOLO weights download on first run.

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
SELECT feature_version,
       left(visual::text,80),
       left(object_features::text,80),
       left(scene::text,80)
FROM content_features WHERE video_id = 112;
SELECT c.slug, vc.score FROM video_categories vc
JOIN categories c ON c.id = vc.category_id WHERE vc.video_id = 112;
SELECT c.slug, vcs.score, vcs.source FROM video_category_scores vcs
JOIN categories c ON c.id = vcs.category_id WHERE vcs.video_id = 112;
```

Qdrant: `curl http://127.0.0.1:6333/collections/vibely_cu_video`
