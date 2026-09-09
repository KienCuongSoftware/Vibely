# Redis cache check (local)

With Redis enabled (`APP_REDIS_ENABLED=true`):

```bash
redis-cli INFO stats
```

Compute:

```
hit ratio = keyspace_hits / (keyspace_hits + keyspace_misses)
```

| hit ratio | Meaning |
|-----------|---------|
| ~90%+ | Cache is doing work |
| ~15% hits | Most reads miss — feed/explore may still hammer Postgres |

Latency:

```bash
redis-cli --latency
```

If Redis is **disabled** (common on local), treat cache as miss-by-design and measure Postgres only.
