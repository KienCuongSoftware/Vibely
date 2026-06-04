# MVP Roadmap (Current)

## Shipped

- [x] Vertical feed + HLS playback
- [x] Upload + FFmpeg HLS pipeline
- [x] Auth JWT + OAuth (Google, Facebook, LINE)
- [x] Explore categories & search
- [x] Global search API + `/search` results page + watch-page suggest dropdown
- [x] Chat + message requests
- [x] Share short links
- [x] Studio analytics (basic)
- [x] Anti-bot platform Phase 1–2

## Stabilizing (Q2)

- [ ] OpenAPI spec publish
- [ ] Redis required in all non-local envs
- [ ] Processing worker extraction (pilot)
- [ ] E2E Playwright smoke suite
- [ ] Notification inbox v1

## Quality gates

- Feed p95 < 200ms on staging
- Captcha bypass rate < 5% false positive
- Zero-downtime deploy runbook
