# Architecture Documentation

## File structure

```
architecture/
├── README.md
├── SYSTEM_OVERVIEW.md
├── REQUEST_LIFECYCLE.md
├── EVENT_DRIVEN_ARCHITECTURE.md
├── SERVICE_BOUNDARIES.md
├── CDN_AND_MEDIA.md
├── WEBSOCKET_REALTIME.md
├── Vibely-Originality-Detection-TDD.md
├── content-understanding/
│   ├── 00-INDEX.md
│   ├── 01-VISION-AND-PRINCIPLES.md
│   ├── 02-AI-PIPELINE.md
│   └── 03-DATA-WORKERS-API.md
└── content-moderation/
    ├── 00-INDEX.md
    ├── 01-VISION-AND-PLATFORM.md
    ├── 02-PIPELINE-AND-POLICY-ENGINE.md
    ├── 03-DATA-API-DASHBOARD.md
    └── 04-HITL-AND-LEARNING.md
```

Feed platform detail lives under [`docs/feed/`](../feed/) (not duplicated here). Thin moderation pointers: [`docs/moderation/`](../moderation/).

## Reading order

1. [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
2. [REQUEST_LIFECYCLE.md](REQUEST_LIFECYCLE.md)
3. [SERVICE_BOUNDARIES.md](SERVICE_BOUNDARIES.md)
4. Domain: CDN, WebSocket; feed → [`docs/feed/`](../feed/)
5. AI: [content-understanding/00-INDEX.md](content-understanding/00-INDEX.md) · [Originality TDD](Vibely-Originality-Detection-TDD.md) · [content-moderation/00-INDEX.md](content-moderation/00-INDEX.md)
