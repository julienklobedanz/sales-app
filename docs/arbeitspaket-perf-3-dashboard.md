# Arbeitspaket: Perf-3 — Dashboard schnell (P0)

**Quelle:** Performance-Audit (Vault) P2 + P4.
**Zweck:** Die Tages-Landefläche (Dashboard) lädt durch sequenzielle Queries + teure Counts zäh — parallelisieren und Counts verbilligen.

---

## Vorab lesen
- `docs/ai-coding-agent-guide.md`. Loader liegen in `lib/dashboard-home/*` (nach E5-Modularisierung).

## Ist-Stand (verifiziert)
- `lib/dashboard-home/dashboard-home-admin.ts`: ~12 `await`-Count-Queries **nacheinander** (Z. ~266–361), nur 1 `Promise.all`.
- `count: 'exact'` im Hot-Path: `app/dashboard/page.tsx` 7, `dashboard-home-admin.ts` 10, `-account-manager.ts` 4, `dashboard-home-queries.ts` 5.
- sales-rep/evidence-page ebenfalls überwiegend sequenziell.

## Aufgaben
- **T1 — Parallelisieren:** unabhängige Queries in den Loadern (`admin`, `sales-rep`, `account-manager`, `queries`, `page.tsx`) in `Promise.all` bündeln. Ziel: pro Loader möglichst **ein** Round-trip-Batch statt Wasserfall.
- **T2 — Counts verbilligen:** `count: 'exact'` dort, wo nur Größenordnung/Trend nötig (KPI-Strips, Wochenvergleiche) → `count: 'estimated'`/`planned` **oder** ein gepflegtes Aggregat (Trigger/materialisiert). Exakt nur, wo fachlich zwingend.
- **T3 — Optional:** häufige KPI-Aggregate (Referenzen gesamt, Matches/Woche) als gecachtes Aggregat (Synergie Perf-2).

## Akzeptanz
- Dashboard-Loader feuern unabhängige Queries parallel; messbar weniger Roundtrips/Latenz (Perf-1-Timing).
- KPIs unverändert plausibel (geschätzte Counts dokumentiert, wo eingesetzt).
- `typecheck`/`test`/`build` grün; Verhalten/Anzeige unverändert.

## Verifikation
```bash
npm run typecheck && npm test && npm run build
```
- Dashboard-Load-Timing (Perf-1) vor/nach: deutlich kürzer, v. a. Admin/Leader.

> **Abhängigkeit:** Perf-1 vorher (Baseline). Gut kombinierbar mit Perf-2 (KPI-Caching).
