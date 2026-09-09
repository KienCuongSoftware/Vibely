# k6 — local only

Default target: `http://localhost:8080`. Do not point this at production.

```powershell
cd D:\Worksplace\FullStack\Vibely\perf\k6

k6 run feed.js
k6 run feed-ramp.js
k6 run core-apis.js
```

```powershell
k6 run -e BASE_URL=http://127.0.0.1:8080 feed.js
```

Playbook: [docs/performance/MEASUREMENT.md](../../docs/performance/MEASUREMENT.md).
