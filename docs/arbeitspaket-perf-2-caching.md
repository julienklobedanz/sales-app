# Arbeitspaket: Perf-2 — Caching-Layer (P0)

**Quelle:** Performance-Audit (Vault) P1. **Größter app-weiter Hebel.**
**Zweck:** Quasi-statische Daten nicht bei jeder Navigation neu aus der DB holen.

---

## Vorab lesen
- `docs/ai-coding-agent-guide.md`. Next.js App Router Caching (`unstable_cache`, `revalidateTag`, `revalidate`).
- **Sicherheit:** RLS-Daten **niemals** cross-user/cross-org cachen — Cache-Key **immer** mit `organization_id` (und ggf. `userId`/`role`) versehen.

## Ist-Stand (verifiziert)
- **14** Seiten `export const dynamic = 'force-dynamic'`, **0** `revalidate` → jede Last = volle DB-Roundtrips.

## Aufgaben
- **T1 — Kandidaten bestimmen:** quasi-statische, lese-dominierte Daten, u. a. Referenzliste, Accounts/Companies, Compliance-Docs, Org-/Branding-/Export-Settings, KPI-Aggregate. Pro-Request-frische Pfade (Mutations-Folgen) ausnehmen.
- **T2 — Cachen mit Tags:** Reads in `unstable_cache(fn, keyParts, { tags })` kapseln; **Key inkl. `organization_id`** (Tenant-Isolierung!). `force-dynamic` nur dort belassen, wo wirklich nötig.
  - **Sales-Visibility NICHT in den Cache-Key:** den **org-weiten** Datensatz einmal cachen (Key = `[scope, organization_id]`) und die Sales-Sichtbarkeit **nach** dem Cache in JS filtern (vorhandenes `filterReferencesForSales`). Das halbiert nicht die Cache-Treffer und verkleinert die Leak-Fläche. (Gegenteil zu Perf-4: bei **Daten** muss `orgId` in den Key; bei **Embeddings** nicht.)
- **T3 — Invalidierung:** bei Mutationen `revalidateTag(...)` der betroffenen Tags (z. B. `references:<org>`), damit nach Create/Update/Approve sofort frisch.
- **T4 — Verifizieren, dass kein Cross-Tenant-Leck entsteht** (Tests/manuell mit zwei Orgs).

## Akzeptanz
- Wiederholte Navigation auf gecachte Bereiche vermeidet DB-Roundtrips (per Perf-1-Timing belegbar).
- Mutationen invalidieren korrekt (keine veralteten Daten).
- **Kein** Org A sieht Org-B-Cache; Integrationstest (E3 `tenant-isolation`) bleibt grün.
- `typecheck`/`test`/`build` grün.

## Verifikation
```bash
npm run typecheck && npm test && npm run build
```
- Zwei aufeinanderfolgende Loads desselben Bereichs: zweiter ohne DB-Hit (Timing/Log).
- Nach einer Mutation: Daten sofort aktuell.

> **Abhängigkeit:** Perf-1 vorher, um den Cache-Effekt zu messen.
