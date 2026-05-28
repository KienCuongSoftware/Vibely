# Scaling Roadmap

## Phase 1 (1M DAU)

- Redis cluster, RDS read replicas
- CloudFront full media path
- API HPA 3–20 pods
- Kafka MSK for telemetry

## Phase 2 (10M DAU)

- Dedicated transcode fleet (GPU)
- Chat service + Redis STOMP relay
- OpenSearch for search
- Feature store for feed

## Phase 3 (50M+ DAU)

- Multi-region active-active
- Edge auth & manifest signing
- Federated recommendation service
- Cold storage for messages/media archive

## Infra milestones

| Milestone | Trigger |
|-----------|---------|
| Split processing worker | CPU > 60% on API from FFmpeg |
| Split chat | WS connections > 50k per region |
| Split anti-bot | Security team independent ship cycle |
