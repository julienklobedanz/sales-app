# Arbeitspaket: Schema-Sync + CI-Migrations-Gate (Engineering E7)

**Quelle:** Engineering-Audit E7 + Schema-Lag-Befund aus E1/E2.
**Zweck:** Den Drift zwischen Repo-Migrationen und Remote-Schema beseitigen, die `looseSelect`-Escape-Hatches schließen (sonst latentes Typ-Loch im gerade gewonnenen Typsicherheits-Fundament) und künftigen Drift per CI verhindern.
**Charakter:** DB-/DevEx-Arbeit. Vorsicht bei Remote-Migrationen (Prod-DB).

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md` (Schema-Reihenfolge: db:types → typecheck → migrieren).
- Typsicherheit ist aktiv (E1/E2): `lib/database.types.ts`, `npm run db:types`, `npm run typecheck` (CI-Gate).

---

## Status (2026-08-06)

| Task | Status |
| ---- | ------ |
| T1 Drift ermitteln | ✅ historisch in `docs/schema-sync.md` |
| T2 Remote + Typen | ✅ `tags`/`archived_at` in `lib/database.types.ts`; Repair-Migration vorhanden |
| T3 `looseSelect` entfernen | ✅ `grep looseSelect` → 0; Modul entfernt |
| T4 CI-Migrations-Gate | ✅ Job `db-migrations` in `.github/workflows/ci.yml` (`supabase start`) |
| `supabase/config.toml` | ✅ vorhanden |

**Offen / Boy-Scout:** Remote-Drift gelegentlich mit `npx supabase migration list --linked` prüfen (braucht Link/Secrets — nicht jeder Dev). Typed-Cast-Abbau → eigenes Paket E1/E2 T3.

---

## T1 — Drift ermitteln & dokumentieren

**Soll:** Den genauen Rückstand bestimmen:

```bash
supabase migration list   # zeigt lokale vs. remote angewandte Migrationen
```

Alle Repo-Migrationen auflisten, die am Remote (`oxxzczmibzyusonwzdvc`) **nicht** angewandt sind (mind. die zwei oben).
**Akzeptanz:** Liste der ausstehenden Migrationen dokumentiert (in PR-Beschreibung oder `docs/`).

---

## T2 — Remote nachziehen + Typen neu

**Soll:** Ausstehende Migrationen am Remote anwenden, dann Typen regenerieren.

```bash
supabase db push           # ausstehende Migrationen anwenden
npm run db:types           # database.types.ts neu generieren
```

**Sicherheit:** Vor `db push` die ausstehenden Migrationen **inhaltlich prüfen** — nur additive Änderungen (`ADD COLUMN`, wie `tags`/`archived_at`) sind risikoarm; bei destruktiven Schritten zuerst auf Branch/Staging testen. Bei Historie-Mismatch ggf. `supabase migration repair`.
**Akzeptanz:** `supabase migration list` zeigt keinen Rückstand mehr; `lib/database.types.ts` enthält `tags`/`archived_at` etc.; `npm run typecheck` grün.

---

## T3 — `looseSelect`-Escape-Hatches entfernen

**Soll:** Da die Spalten jetzt in den Typen existieren:

- in `deal-desk/actions.ts` (4×) und `accounts/actions.ts` die `looseSelect(...)`-Aufrufe durch **normale, typisierte** `.select(...)` ersetzen.
- `lib/supabase/loose-select.ts` entfernen (oder, falls ein einzelner berechtigter Rest bleibt, mit klarem Kommentar einschränken — Ziel: keine Gewohnheits-Schlupflöcher).
  **Akzeptanz:** `grep -rn "looseSelect" app lib` → 0 (oder nur dokumentierter Rest); `npm run typecheck` grün.

---

## T4 (E7) — CI-Migrations-Gate

**Soll:** Einen CI-Job ergänzen, der **alle Migrationen von Null gegen eine Wegwerf-DB** anwendet — fängt SQL-Fehler und nicht-replaybare Migrationen, **bevor** sie auf Remote treffen.

- Variante A: Postgres-Service-Container in `ci.yml`, Migrationen via `supabase db reset`/`psql` einspielen.
- Variante B: `supabase start` (lokaler Stack) im CI, `supabase db reset`.
- Voraussetzung: `supabase init` (erzeugt `supabase/config.toml`) + Projekt-Link dokumentieren.
- Optional: Drift-Check `supabase db diff` (meldet, wenn Remote-Schema von Migrationen abweicht).
  **Akzeptanz:** CI bricht ab, wenn eine Migration nicht sauber von Grund auf durchläuft; Job grün auf `main`.

---

## Reihenfolge & Sicherheit

1. T1 (Drift sichtbar machen) → T2 (anwenden + Typen) → T3 (Hatches entfernen) → T4 (CI-Gate).
2. T2 berührt die Prod-DB → ausstehende Migrationen vorher reviewen; additive zuerst.
3. Ab jetzt gilt die dokumentierte Reihenfolge: Migration schreiben → Remote anwenden → `db:types` → Code → `typecheck`.

## Verifikation

```bash
supabase migration list   # kein Rückstand
npm run db:types          # reproduzierbar, enthält neue Spalten
npm run typecheck         # 0 Fehler, ohne looseSelect
npm run test && npm run build
```

## Wirkung

Schließt das letzte bekannte Loch im Typsicherheits-Fundament (looseSelect) und verhindert per CI, dass Repo und Remote-Schema künftig auseinanderlaufen — die strukturelle Ursache hinter dem Welle-5-/Schema-Lag-Schmerz.
