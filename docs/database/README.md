# Database Documentation

| File | Description |
|------|-------------|
| [SCHEMA.md](SCHEMA.md) | Domains, key tables, indexing |
| [MIGRATIONS.md](MIGRATIONS.md) | Flyway policy & version history |
| [Full ERD (42 tables)](../erd/vibely-erd-full.png) | Complete entity-relationship diagram ([erd/](../erd/)) |

**Migrations (source of truth):** `backend/src/main/resources/db/migration/V*.sql`

When adding a migration, update [SCHEMA.md](SCHEMA.md) if domains or relationships change, and refresh [vibely-erd-full.png](../erd/vibely-erd-full.png) when table count or major FKs change.
