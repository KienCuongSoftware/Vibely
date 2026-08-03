# 03 — Resource Manager, Workspace, Retry, Logging, Metrics

## 1. Resource Manager

### Goal

Prevent a worker from accepting jobs it cannot finish → protect GPU stability and enable fair multi-job (only if VRAM allows).

### Snapshot

```text
ResourceSnapshot:
  gpu_index: int
  vram_total_mb: int
  vram_used_mb: int
  vram_free_mb: int
  cpu_load_1m: float
  ram_free_mb: int
  disk_free_mb: int          # workspace volume
  active_jobs: int
  max_concurrent_jobs: int   # usually 1 per GPU
```

Sources: `pynvml` / `nvidia-smi`, `psutil`, `shutil.disk_usage`.

### Admit decision

```text
canAdmit(plan) -> AdmitDecision{ ok, reason, estimated_vram_mb }

Reject when:
  active_jobs >= max_concurrent_jobs
  estimated_vram_mb > vram_free_mb - reserve_mb
  disk_free_mb < plan.estimated_workspace_mb + safety_mb
  ram_free_mb < min_ram_mb
  cpu_load_1m > cpu_busy_threshold (optional)
```

`estimated_vram_mb` comes from `engine.capabilities().estimated_vram_mb(...)` using metadata + level.

### Reservation lifecycle

```text
reserve(job_id, plan)  # account soft reservation in-process (+ optional Redis)
heartbeat while running
release(job_id)        # always in finally
```

On reject: Nack message with **delay** (`ai.enhance.delay`) — do not mark job FAILED.

### Multi-GPU node

One OS process per GPU **or** one process with `CUDA_VISIBLE_DEVICES` sharding; ResourceManager keyed by `gpu_index`. Prefer **1 process ↔ 1 GPU** for isolation.

---

## 2. Workspace Manager

### Layout (per job, never shared)

```text
{WORKSPACE_ROOT}/
  {job_id}/
    download/          # original.mp4, normalized.mp4
    audio/             # audio.aac / .m4a
    frames/            # optional
      in/
      out/
    enhanced/          # enhanced.mp4
    hls/               # local ABR before upload
    staging/           # chunk work
    logs/
      download.log
      ffmpeg.log
      enhancement.log
      upload.log
      pipeline.log
    meta/
      metadata.json
      plan.json
```

### API

| Method | Behavior |
|--------|----------|
| `create(job_id)` | mkdir exclusive; fail if exists unless reclaim |
| `paths` | typed accessors |
| `write_meta` | persist metadata/plan for crash debug |
| `purge(job_id, keep_logs)` | delete heavy dirs; optionally tar logs → S3 then delete |
| `list_orphans(max_age)` | dirs without active lease |

### Crash cleanup

- Worker startup: purge orphans older than `workspace_orphan_ttl` if no matching active lease in DB.
- Node drain: best-effort purge.
- **Never** use `/tmp/shared_frames` across jobs.

---

## 3. Retry policy

### Per-category knobs (config)

| Category | max_attempts | base_backoff | max_backoff | timeout |
|----------|--------------|--------------|-------------|---------|
| `NETWORK` | 8 | 2s | 5m | per-op 2–10m |
| `GPU_TRANSIENT` | 5 | 5s | 10m | job-level |
| `FFMPEG_TRANSIENT` | 4 | 2s | 2m | step |
| `UPLOAD` | 8 | 2s | 5m | step |
| `DATABASE` | 6 | 1s | 1m | step |
| `AI_OOM` | 2 | 30s | 2m | then downgrade level once |
| `NON_RETRYABLE` | 1 | — | — | — |

Backoff: `min(max, base * 2^attempt) + jitter`.

### Flow

```text
step fails
  → classify(error) -> RetryClass
  → if NON_RETRYABLE: FAILED or SKIPPED → maybe DEAD
  → if retryable and attempts < max:
        state=RETRYING → delay publish → QUEUED
     else DEAD → DLQ
```

**Idempotency:** same `idempotency_key`; reclaim must not double-upload final prefix (upload to `.../building-{attempt}/` then promote).

---

## 4. Error classification

### Retryable

| Code | Examples |
|------|----------|
| `NETWORK_ERROR` | S3 timeout, connection reset, 503/429 |
| `GPU_BUSY` | admit rejected, CUDA context busy |
| `GPU_TRANSIENT` | CUDA illegal access after peer job, driver reset recoverable |
| `AI_OOM` | out of memory (retry with lower level / smaller tile) |
| `FFMPEG_TRANSIENT` | SIGKILL by OOM killer once; transient disk full if now free |
| `UPLOAD_ERROR` | multipart fail mid-way |
| `DATABASE_TRANSIENT` | serialization failure, failover |
| `LEASE_LOST` | another worker stole; **do not** fight — exit quietly |

### Non-retryable

| Code | Examples |
|------|----------|
| `VIDEO_CORRUPTED` | ffprobe fail, 0 frames |
| `UNSUPPORTED_CODEC` | after normalize attempt still unsupported |
| `POLICY_FORBIDDEN` | upscale ban, duration ban |
| `VIDEO_NOT_FOUND` | deleted from S3/DB |
| `CANCELLED` | admin cancel |
| `MODEL_NOT_CONFIGURED` | missing weights / bad registry |
| `INVALID_JOB_PAYLOAD` | schema error |
| `OUTPUT_INVALID` | enhanced unreadable after N AI retries exhausted |

### Special

| Code | Behavior |
|------|----------|
| `SKIPPED_POLICY` | terminal soft success for ops; no DLQ spam |
| `DOWNGRADE_APPLIED` | internal: OOM → reduce level → retry once |

---

## 5. Logging

### Principles

- One **pipeline logger** + **per-step file** under `workspace/logs/`.
- Correlation: `job_id`, `video_id`, `worker_id`, `attempt`, `engine`, `level`.
- Structured JSON to stdout for cluster log shipper (Loki/ELK).
- On **success:** optional upload `logs/*.log` to `s3://.../enhance-logs/{job_id}/` then purge workspace.
- On **failure:** **keep logs** (local until uploaded to S3 failure prefix); never wipe logs in `CleanupStep` when state ∈ FAILED/DEAD/RETRYING.

### Files

| File | Content |
|------|---------|
| `pipeline.log` | Step start/end, state transitions |
| `download.log` | S3 bytes, retries |
| `ffmpeg.log` | normalize, frames, hls, remux |
| `enhancement.log` | engine stdout/stderr, progress |
| `upload.log` | keys uploaded, etags |

---

## 6. Cleanup policy

| Outcome | Workspace media | Logs | S3 staging | S3 final enhanced |
|---------|-----------------|------|------------|-------------------|
| COMPLETED | Delete | Upload then delete (or retain N days) | Delete | **Keep** |
| FAILED / DEAD | Delete heavy media | **Keep** (+ upload) | Delete after TTL | None / incomplete prefix deleted |
| RETRYING | Delete frames/enhanced optional; keep download to save bandwidth **or** re-download (config) | Keep | Keep until success | — |
| CANCELLED | Full purge after log upload | Keep | Delete | — |

Final HLS lives only under `hls/{author}/{publicId}/enhanced/{profile}/` — never only on local disk.

---

## 7. Metrics (Prometheus-ready)

### Counters

- `enhance_jobs_completed_total{profile,level,engine}`
- `enhance_jobs_failed_total{reason,retryable}`
- `enhance_jobs_skipped_total{reason}`
- `enhance_retries_total{category}`
- `enhance_admitted_total` / `enhance_rejected_total{reason}`

### Histograms / summaries

- `enhance_step_duration_seconds{step}`
- `enhance_ai_duration_seconds{engine,level}`
- `enhance_ai_fps{engine}`
- `enhance_hls_duration_seconds`
- `enhance_upload_duration_seconds`
- `enhance_queue_wait_seconds` (queued_at → started_at)

### Gauges

- `enhance_active_jobs`
- `enhance_gpu_vram_used_mb` / `free_mb`
- `enhance_cpu_ratio` / `enhance_ram_used_mb`
- `enhance_disk_free_mb`

Scrape `/metrics` on worker. Grafana dashboards: success rate, P95 AI time, queue depth (from RabbitMQ exporter), GPU util (DCGM).

---

## 8. Mapping to job states

| Pipeline phase | Job state |
|----------------|-----------|
| Admitted + claimed | `DOWNLOADING` |
| Metadata + validate | still `DOWNLOADING` or `AI_PROCESSING` prep |
| Run AI | `AI_PROCESSING` |
| HLS | `GENERATING_HLS` |
| Upload | `UPLOADING` |
| DB update success | `COMPLETED` |
| Classified failure | `FAILED` → `RETRYING` or `DEAD` |

Heartbeat lease during `AI_PROCESSING` / `GENERATING_HLS` / `UPLOADING`.

---

## 9. Checklist before implementation

1. Scaffold `services/ai-enhance` with ports + NoopEngine.  
2. Implement steps with Noop (copy/re-encode light) end-to-end against staging S3.  
3. Plug Real-ESRGAN behind factory.  
4. Add ResourceManager + reject path.  
5. Wire Prometheus + log shipping.  
6. Load test concurrency=1 per GPU; then KEDA scale.

**Still forbidden:** edits to Upload Service or existing FFmpeg Worker package.
