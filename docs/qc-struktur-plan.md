## Qualitätskontrolle (ohne OpenAI/Security/DB-Migrationen)

Ziel: **Struktur, UX-Konsistenz und Wartbarkeit** verbessern, ohne die Themen OpenAI, Security oder DB-Migrationen anzufassen.

### Phase 1 – Struktur-Inventur & Hotspots (Analyse)

- **Ziel**: Verstehen, wo Logik liegt, welche Module „zu groß“ sind, welche UI-Patterns mehrfach existieren.
- **Vorgehen**
  - **Domain Map** erstellen: Deals / Evidence / Accounts / Settings / Onboarding.
  - **Hotspot-Liste** nach Heuristik:
    - sehr große Dateien (viele Verantwortlichkeiten)
    - viele Imports / UI+Logic vermischt
    - Duplizierte Format-/UX-Logik
- **Findings (aktuell)**
  - **`app/dashboard/actions.ts`** ist sehr groß (God-File, viele Verantwortlichkeiten).
  - **`app/dashboard/deals/rfp-sidebar-panel.tsx`** ist sehr groß und enthält mehrere Dialoge + RFP + Matching.
  - **DataTable** Copy ist nicht überall konsistent (Deutsch/Englisch gemischt).
- **Umsetzungsplan**
  - Kurzfristig: gezielte, risikoarme Splits (siehe Phase 3).
  - Mittelfristig: Domain-Services in `lib/domain/*` + UI bleibt schlank.

### Phase 2 – UX-Konsistenz (Analyse)

- **Ziel**: Einheitliche Page-Layouts, Toolbars, Loading/Empty States.
- **Vorgehen**
  - Detailseiten: **Main + sticky Sidebar** als Standard (Evidence ist Referenz).
  - Listen: **eine DataTable** + **eine Toolbar-Zeile**.
  - Copy: DE überall, keine „No results.“ etc.
- **Findings (aktuell)**
  - (behoben) `components/ui/data-table.tsx`: DE-Copy + konfigurierbarer Empty-State.
  - (behoben) Evidence Hub (`app/dashboard/evidence/*`): Pagination/ARIA/Empty-State Copy harmonisiert (DE).
- **Umsetzungsplan**
  - DataTable: DE-Copy, optionale Props für Empty-State und Labels.
  - Danach: schrittweise Adoption in Deals/Evidence/Accounts.
  - Evidence: kurzfristig Copy/A11y harmonisieren, mittelfristig auf shared `components/ui/data-table.tsx` konsolidieren (wenn ContextMenu/Pagination-Features kompatibel sind).

### Phase 3 – Refactor-Slices (Umsetzung, klein & sicher)

**Slice A (P1): Deal-Actions Sidebar entkoppeln**

- **Ziel**: `rfp-sidebar-panel.tsx` in kleine, testbare Komponenten splitten (EditDealDialog, LinkReferenceDialog, FindMatchesDialog, OutcomeDialog).
- **Ergebnis**: Panel bleibt „Komposition“; Dialoge leben in `app/dashboard/deals/components/*`.

**Slice B (P1): DataTable Copy & Konfig**

- **Ziel**: DataTable Labels vereinheitlichen (DE) und per Props überschreibbar machen.
- **Ergebnis**: Konsistentes UI, weniger duplizierte Toolbar-Layouts.

**Slice C (P2): `app/dashboard/actions.ts` modularisieren**

- **Ziel**: Domain-Module extrahieren (z. B. `lib/domain/match/*`, `lib/domain/references/*`).
- **Vorgehen**: rein organisatorisch, keine Logikänderungen.
  - **Technik-Hinweis (Next.js Server Actions)**: Exports, die als Server Actions genutzt werden, bleiben als `export async function ...` im Entry-File und delegieren nur an `*Impl` Funktionen in Submodulen (statt re-export), um Build/Import-Probleme zu vermeiden.

**Status (Stand heute)**

- Slice A: ✅ umgesetzt
- Slice B: ✅ umgesetzt
- Slice C: ✅ umgesetzt (Entry-File: Wrapper + Typen; Logik in Modulen)

### Phase 4 – Lokale Qualitätsgates (ohne CI)

- **Ziel**: Reproduzierbar prüfen, dass Refactors nichts brechen.
- **Checks**
  - `npm run lint`
  - `npm run build`
  - Smoke: Deals öffnen → Sidebar Aktionen öffnen → Dialog Submit/Cancel, DataTable pagination.

