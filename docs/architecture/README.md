# Architecture Documentation

## Recommended file structure

```
architecture/
├── README.md                      # This index
├── SYSTEM_OVERVIEW.md             # High-level platform
├── REQUEST_LIFECYCLE.md           # Edge → API → data
├── EVENT_DRIVEN_ARCHITECTURE.md   # Kafka, async, workers
├── SERVICE_BOUNDARIES.md          # Modular monolith → services
├── CDN_AND_MEDIA.md               # S3, CloudFront, HLS
├── WEBSOCKET_REALTIME.md          # STOMP chat & future signals
└── FEED_PLATFORM.md               # Feed generation topology
```

## Reading order

1. [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
2. [REQUEST_LIFECYCLE.md](REQUEST_LIFECYCLE.md)
3. [SERVICE_BOUNDARIES.md](SERVICE_BOUNDARIES.md)
4. Domain-specific: CDN, WebSocket, Feed
