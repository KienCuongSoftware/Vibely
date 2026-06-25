# Database Documentation

| File | Description |
|------|-------------|
| [SCHEMA.md](SCHEMA.md) | Domains, key tables, indexing |
| [MIGRATIONS.md](MIGRATIONS.md) | Flyway policy & version history |
| [Full ERD](../erd/vibely-erd-full.png) | Entity-relationship diagram ([erd/](../erd/)); refresh after table-count or major FK changes |

**Migrations (source of truth):** `backend/src/main/resources/db/migration/V*.sql`. The current schema history reaches `V44` and contains 43 SQL migration files.

When adding a migration, update [SCHEMA.md](SCHEMA.md) if domains or relationships change, and refresh [vibely-erd-full.png](../erd/vibely-erd-full.png) when table count or major FKs change.
