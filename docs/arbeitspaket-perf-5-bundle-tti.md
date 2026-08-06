# Arbeitspaket: Perf-5 — Client-Bundle & Time-to-Interactive (P1)

**Quelle:** Performance-Audit (Vault) P5 + P6(Suspense). **Letztes klares Perf-Paket vor dem Pilot.**
**Zweck:** Schnellerer initialer Seitenaufbau (TTI): weniger Client-JavaScript laden, schwere Teile erst bei Bedarf, mehr Server-Components, perceived-perf via Skeletons.

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md` (Konventionen, Design-System). Next.js App Router: `next/dynamic`, Server vs. Client Components, `<Suspense>`.
- **Prinzip „erst messen":** zuerst Bundle-Analyse (T1), dann gezielt die größten Brocken angehen — nicht raten.

## Ist-Stand (verifiziert — korrigiert nach Cursor-Gegenprüfung 18.06.)

- **170** `'use client'`-Dateien, **0** `next/dynamic` (kein Code-Splitting), **kein** Bundle-Analyzer.
- **Schwere Libs — korrigiert:** `recharts` ist **nicht** im Projekt (meine frühere Angabe war falsch). `@react-pdf/renderer` ist **bereits server-only** (`app/api/pdf/*`, `lib/evidence/pdf/*`) — kein Client-Leak. `framer-motion` ist in `package.json`, hat aber **keine Imports** → Entfernungs-Kandidat. **Echter Client-Leak: nur `xlsx`** via `lib/accounts/companies-import-template.ts` (`import * as XLSX`), gezogen über `companies-import-dialog.tsx`.
- 12 Client-Komponenten > 500 Z. (u. a. `dashboard-overview` 1457, `deal-desk-client` 1135, `accounts-grid` 830, `reference-detail-sheet` 636, `account-detail-nda-popover` 623); **34** Dialog/Sheet/Modal-Komponenten.
- **T1 (Analyzer) ist die Wahrheit** — die obigen Verdächtigen sind Hypothesen; der Build-Report priorisiert verbindlich.

> **Nach T1: klare Gewinne nehmen, dann stoppen.** Sichere Wins: `xlsx` → Server/API, `framer-motion` entfernen, die schwersten 2–3 Dialoge der Hot-Routen lazy. **Nicht** reflexartig alle 34 Dialoge umstellen, wenn der T1-Report nur marginalen Rest-Gewinn zeigt — Diminishing Returns.

---

## T1 — Messen (zuerst)

**Soll:** `@next/bundle-analyzer` einbinden (`next.config.ts` + Script `analyze`), einmal laufen lassen, die größten Route-/Shared-Chunks notieren. Das priorisiert T2–T4 datenbasiert.
**Akzeptanz:** `npm run analyze` erzeugt einen Report; Top-Brocken dokumentiert (PR-Beschreibung).

## T2 — Schwere Libs lazy laden

**Soll:** Komponenten, die `xlsx`/`react-pdf`/`recharts`/`framer-motion` importieren, per `next/dynamic` (ggf. `{ ssr: false }`) **erst bei Bedarf** laden (z. B. Export-/Import-Dialog, Charts). `xlsx`/`react-pdf` möglichst **nur serverseitig** (API-Route) statt im Client-Bundle.
**Akzeptanz:** diese Libs sind nicht mehr im Initial-Bundle der betroffenen Routen (per T1-Report belegt).

## T3 — Dialoge/Modals/Sheets lazy laden

**Soll:** Die 34 Dialog/Sheet/Drawer-Komponenten erst beim Öffnen laden (`dynamic(() => import(...))` im Trigger). Priorität: die schweren (`reference-detail-sheet`, `account-detail-nda-popover`, `share-link-button`, große Dialoge).
**Akzeptanz:** Modal-Code ist aus dem initialen Route-Bundle ausgelagert; Öffnen funktioniert unverändert (kleiner Lade-Spinner ok).

## T4 — `'use client'`-Fläche reduzieren + Suspense

**Soll:** (a) Komponenten, die **keine** Interaktivität brauchen (reine Anzeige), zu Server-Components machen — `'use client'` entfernen, wo möglich. (b) Auf den schweren Routen (`/dashboard`, `/dashboard/deal-desk`, Evidence-Detail) `<Suspense>` + Skeletons, damit sofort Struktur erscheint.
**Akzeptanz:** messbar kleinere Client-Bundles auf den Hot-Routen; schwere Routen zeigen sofort Skeleton statt Leerlauf.

---

## In Scope

Bundle-Analyse, `dynamic()` für schwere Libs + Modals, `'use client'`-Reduktion wo trivial, Suspense/Skeletons auf Hot-Routen.

## Out of Scope

- Funktionale Änderungen / Redesign.
- Monolith-Zerlegung um ihrer selbst willen (das ist E5/Boy-Scout, nicht hier — nur wo es dem Splitting dient).
- pgvector/DB-Tuning (Perf-6, mit Pilot).

## Risiken

- `ssr: false` ändert Hydration/SEO — nur für client-only/below-the-fold/Modale nutzen, nicht für initial sichtbaren, indexrelevanten Inhalt.
- `dynamic` mit Suspense-Fallback: Layout-Shift vermeiden (Skeleton in passender Größe).

## Verifikation

```bash
npm run analyze     # neue Script: Bundle-Report
npm run typecheck && npm test && npm run build
```

- T1-Report vor/nach: Initial-Bundle der Hot-Routen kleiner; schwere Libs nicht mehr im First Load JS.
- Perf-1-Timing/Lighthouse: TTI der Hot-Routen verbessert; Verhalten unverändert.

## Reihenfolge

T1 (messen) → T2 (schwere Libs, größter Einzelgewinn) → T3 (Modals) → T4 (use-client-Reduktion + Suspense). Ein zusammenhängender Block, gern in 2–3 PRs.
