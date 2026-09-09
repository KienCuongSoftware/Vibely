# Performance Engineering

| File | Description |
|------|-------------|
| [MEASUREMENT.md](MEASUREMENT.md) | Actuator + k6 + DB/Redis measurement (start here) |
| [baseline.md](baseline.md) | Fill after each local load run |
| [OPTIMIZATION_GUIDE.md](OPTIMIZATION_GUIDE.md) | Full-stack checklist (after you have a baseline) |
| [../perf/k6](../../perf/k6) | k6 scripts |

## Targets (SLO)

| Surface | Target |
|---------|--------|
| Feed API p95 | < 200ms |
| Video start | < 2s on 4G |
| Chat send | < 300ms ACK |
| Upload presign | < 100ms |

Measure **local / staging only**. Do not k6 production while users are on it.
