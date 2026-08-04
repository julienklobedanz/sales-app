# Schema-Sync (Remote ↔ Repo)

**Projekt:** `oxxzczmibzyusonwzdvc` · CLI: `supabase link --project-ref oxxzczmibzyusonwzdvc`

## Drift prüfen

```bash
npx supabase migration list --linked
```

Spalten gegen Remote verifizieren (Beispiel):

```bash
npx supabase db query --linked \
  "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='company_roadmap_projects';"
```

## Bekannter Befund (E7, 2026-06)

| Thema                                                  | Status                                                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **22 Migrationen** `20260614120000` … `20260630160000` | auf Remote angewendet (Stand nach E7-`db push`)                                                                                                |
| **`tags` / `archived_at`**                             | in `schema_migrations` als angewendet markiert, Spalten physisch fehlend → Repair `20260630160000_repair_missing_tags_and_archived_at.sql`     |
| **3 Legacy-SQL-Dateien** ohne Timestamp                | ✅ als `2025021213*`–`2025021215*` Baseline-Migrationen aufgenommen                                                                            |
| **Prod-Drift (Rollen)**                                | Remote hatte `profiles.role` bereits entfernt, während CRM-/Invite-Migrationen noch `role` referenzierten → Migrationen idempotent nachgezogen |

## Reihenfolge (Prod)

1. `npx supabase migration list --linked` — ausstehende Migrationen reviewen
2. Nur additive / freigegebene Migrationen: `npx supabase db push`
3. `npm run db:types` → `npm run typecheck`
4. App deployen

## CI

Job `db-migrations` in `.github/workflows/ci.yml`: wendet alle Migrationen gegen eine Wegwerf-Postgres-Instanz an (`supabase db reset`).
