# Schema-Sync (Remote ↔ Repo)

**Projekt:** `oxxzczmibzyusonwzdvc` · CLI: `supabase link --project-ref oxxzczmibzyusonwzdvc`

CLI-Version für Typen und CI: **2.115.0** (`npx supabase@2.115.0` in `npm run db:types`; gleiche Pin in `.github/workflows/ci.yml` bei `db-migrations` und `integration-tests`).

## Drift prüfen

```bash
npx supabase@2.115.0 migration list --linked
```

Spalten gegen Remote verifizieren (Beispiel):

```bash
npx supabase@2.115.0 db query --linked \
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

1. `npx supabase@2.115.0 migration list --linked` — ausstehende Migrationen reviewen
2. Nur additive / freigegebene Migrationen: `npx supabase@2.115.0 db push`
3. `npm run db:types:check` → `npm run typecheck`
4. App deployen

`db:types:check` gehört **direkt hinter jedes `db push`**, nicht in eine gesonderte Routine. Der Vorfall (Typen beschrieben eine Spalte, die Produktion nicht hatte; Typecheck grün, Fehler erst zur Laufzeit) entstand nicht daran, dass niemand prüfen wollte, sondern daran, dass Prüfen ein eigener Vorsatz war.

```bash
npm run db:types:check
```

Das ist: `gen types` gegen Remote → Prettier auf `lib/database.types.ts` → `git diff --exit-code` auf genau diese Datei. Ein Diff heißt: Produktion weicht von dem ab, was der Compiler annimmt.

Lokal reicht das, solange nach dem Push jemand das Kommando ausführt. Ein Required Check auf PRs würde jeden PR mit neuer Migration rot färben, bis die Migration in Produktion angewendet ist — das kehrt „mergen, dann ausliefern“ um.

## Drift-Wächter auf `main` (Zielform, Token-Freigabe ausstehend)

Wenn ein GitHub-Secret `SUPABASE_ACCESS_TOKEN` freigegeben ist: denselben Lauf **nach dem Merge auf `main`**, nicht als Required Check auf PRs. Der Lauf blockiert keine Feature-PRs und meldet Drift in Minuten statt in Wochen. Bis zur Token-Freigabe bleibt der Wächter **nur lokal** (`npm run db:types:check`). Der Token ist kontoweit, nicht projektgebunden.

## CI

Job `db-migrations` in `.github/workflows/ci.yml`: wendet alle Migrationen gegen eine Wegwerf-Postgres-Instanz an (`supabase start`). CLI dort ebenfalls 2.115.0. Kein Produktions-Typen-Diff in CI, solange das Token fehlt.
