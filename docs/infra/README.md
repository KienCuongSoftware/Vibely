# Infrastructure

| File | Description |
|------|-------------|
| [TOPOLOGY.md](TOPOLOGY.md) | Redis, Kafka (optional), Docker, Nginx |

S3 / CDN notes: [media/STORAGE_AND_CDN.md](../media/STORAGE_AND_CDN.md), [architecture/CDN_AND_MEDIA.md](../architecture/CDN_AND_MEDIA.md).

**Production (Hostinger VPS today):** Nginx → Spring (host network) + static SPA; Docker Compose for Redis/Postgres/workers; Qdrant + RabbitMQ for CU/originality. CloudFront is optional if you front S3 with a CDN.
