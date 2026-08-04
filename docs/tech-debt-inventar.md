# Tech-Debt-Inventar (RefStack)

**Stand:** 2026-08-04  
**Scope:** `app/`, `lib/`, `components/`, `hooks/` (+ API-Routen)  
**Methode:** Baseline-Gates, Knip, God-File-/Deprecated-/console-Scans, Domain-Audits (Accounts, Deals, References, Match, DealDesk, Settings, Shared)

Dieses Dokument ist die **priorisierte Quelle** für Abbau. Bestehende Arbeitspakete werden verlinkt, nicht dupliziert.

---

## Baseline (Phase 0)

| Gate | Ergebnis |
|------|----------|
| `npm run lint` | **13 errors**, 61 warnings (u. a. `prefer-const` in bulk-import, unused vars) |
| `npm run typecheck` | **Fehler** in `load-leader-call-queue.ts`, Deal-/Bulk-Import-Tests |
| `npm test` | **1 fail** / 520 pass — `smart-match-multi-filters.test.ts` (Recency-OR) |
| `npm run format:check` | **805 Dateien** außerhalb Prettier |

CI prüft lint/test/typecheck/build; **nicht** `format:check`, Coverage oder Dead-Code.

---

## Result-Konvention (entschieden)

**Kanonisch für Server Actions / UI-facing Returns:**

```ts
{ success: true; … } | { success: false; error: string }
```

| Befund | Zahl |
|--------|------|
| `success: true/false` | ~1056 Matches / ~75 Dateien (~772 in `*actions*`) |
| Ad-hoc `{ ok }` | ~110 / ~26 Dateien (Libs, Cron, Extract) |
| `lib/observability/result` in Prod | **0** (nur Tests) |

**Begründung:** De-facto-Standard; Clients prüfen `.success`. Guide §3.1 und §3.1.1 waren widersprüchlich — **§3.1.1 und `result.ts` auf `{ success }` ausrichten**. Interne Lib-Returns mit `{ ok }` Boy-Scout, kein Big-Bang.

Verweis: [arbeitspaket-logging-error-e6.md](./arbeitspaket-logging-error-e6.md), [ai-coding-agent-guide.md](./ai-coding-agent-guide.md).

---

## Mapping auf bestehende Arbeitspakete

| Thema | Arbeitspaket | Status im Inventar |
|-------|--------------|-------------------|
| Logger + Result | E6 | T1 erledigt; T2 Shape korrigieren; T3 offen (~119 `console.*`) |
| Legacy-Routen | Welle 4c | Docs veraltet; leere Dirs + tote APIs noch offen |
| Legacy-`role` / Naming | Welle 5 | Schema-Drop fortgeschritten; Mapping-Modul + `company*` Naming offen |
| God-Files / Modularisierung | E5, QC-Struktur | Overview/Actions weiter riesig |
| Rollen/Capabilities | Welle 1–2 Cleanup | Accounts/Deals Auth meist `system_role`/`function_role` |

---

## P0 — Risiko / Datenwirkung

| ID | Ort | Befund | Soll | Aufwand | Paket |
|----|-----|--------|------|---------|-------|
| P0-1 | `app/dashboard/accounts/actions.ts` → `deleteCompanyWithData` | Kein Auth-/Org-Check; löscht References/Deals/Strategy/… per `companyId` | Session + Org-Guard (+ Sales-Restricted) wie bei anderen Account-Actions; Test | S | neu |
| P0-2 | `app/api/deal-desk/analyze/route.ts` (~488 Z.) | `@deprecated`, **kein UI-Caller**; kanonisch `/api/rfp/analyze` | Route entfernen (oder 410); Docs anpassen | S | 4c / neu |
| P0-3 | `app/api/rfp-match/route.ts` | Name suggeriert Match; macht nur Document-Extract; **keine Caller** | Löschen oder mit `reference-extract` mergen | S | neu |
| P0-4 | Baseline typecheck/lint/test | CI-lokal rot (siehe Phase 0) | Fehler beheben bevor große Refactors | M | neu — **teilweise erledigt 2026-08-04:** typecheck + unit tests grün; lint/format weiter offen |
| P0-5 | Accounts/Deals destruktive Actions | `bulkCreateCompaniesFromSheet`, `importDealsFromXlsx`, `deleteDeal` — unzureichende Tests | Mind. Happy-Path + Auth-Negativtests | M | E3 |

---

## P1 — Wartbarkeit / Konventions-Drift

| ID | Ort | Befund | Soll | Aufwand | Paket |
|----|-----|--------|------|---------|-------|
| P1-1 | Guide + `lib/observability/result.ts` | `{ ok }` vs `{ success }` | Helpers auf `{ success }`; Guide angleichen | S | E6 |
| P1-2 | ~119 `console.*` / ~64 Dateien; Logger ~11 Importe | E6 T3 kaum gestartet | Heiße Pfade (Auth, Approval, Import, Cron) → `log`; Settings/Actions Boy-Scout | L | E6 — **heiße Pfade ✅ 2026-08-04**; Rest offen |
| P1-3 | God-Files | große Actions/UI-Dateien | Sliceweise splitten | L | E5 — **Accounts, Overview, Smart-Match, MS-Actions, Column-Renders, Form-Content, Deals-Actions ✅** |
| P1-4 | `companyFromJoin` 3× + inline in Deals | Duplikat | Eine Shared-Helper-Funktion | S | neu — ✅ `lib/accounts/company-from-join.ts` |
| P1-5 | `normalizeDealStatus` 3× (actions, request, market-signals) | Drift-Risiko | Eine Funktion in `lib/deals/` | S | neu — ✅ `lib/deals/normalize-deal-status.ts` |
| P1-6 | Accounts Naming | Route `accounts/`, Code `company*` (~18 Dateien) | Schrittweise Rename (DB `companies` ok) | L | Welle 5 |
| P1-7 | PDF/Extract 5 Module, 2 Einstiege | `document-extraction` vs `extract-rfp-plain-text` → … | Facade(s) dokumentieren/konsolidieren | M | neu |
| P1-8 | Match Lib-Split | `lib/match/*` + top-level `lib/match-*.ts` + Orchestrator in `library/match.ts` | Klare Schicht; Typen nicht aus Dashboard importieren | M | E5 |
| P1-9 | Dual Form-Schicht References | Re-export New → `lib/references/reference-form/*`; Fields noch unter dashboard | Lib von Dashboard entkoppeln | M | E5 |
| P1-10 | Legacy-Mapping | `lib/roles/legacy-mapping.ts` ~30+ Importe | UI-Labels → system/function; Mapping schrumpfen | M | Welle 5 |

---

## P2 — Toter / duplizierter Code (sichere Löschung)

| ID | Ort | Befund | Soll | Aufwand | Paket |
|----|-----|--------|------|---------|-------|
| P2-1 | Leere Dirs | `app/dashboard/companies`, `concepts/inbox-references`, `api/rfp/coverage`, `dev/ui-preview` | Löschen (Redirects bleiben) | XS | 4c |
| P2-2 | Knip unused files (triagiert, App-Code) | u. a. `company-detail-links-tab`, `deal-activity-card`, `references/columns`+`data-table`, Settings-Orphans (`invite-card`, `settings-form`, `settings-danger-zone`, tabs), `lib/auth/get-user-role`, `lib/dashboard/can-view-insights`, DealDesk-Orphans (`bid-team`, `demo-seed`, …), `ticket-status-badge`, … | Nach Import-Check löschen | M | neu |
| P2-3 | Alias-Exports | `NewsroomsCard`, `ISO_27001_BADGE_SRC`, `isIso27001ComplianceDocument`, ungenutzte `DESK_COVER_THRESHOLD`-Reexports, `upgradeReferencedCompanyLogosForLightUi` | Entfernen | S | neu |
| P2-4 | `formatDateUtcDe` | @deprecated, **20 Calls / 12 Dateien** | Auf `formatReferenceDate` migrieren | S | neu — ✅ Call-Sites migriert; Wrapper bleibt |
| P2-5 | `parseExportSettings` 2× | settings page + onepager API | Zentralisieren | S | neu |
| P2-6 | Knip unused deps | `react-hook-form`, `@hookform/resolvers`, `date-fns` — **0 Code-Imports** (nur Docs) | Entfernen oder Forms wieder anbinden; Entscheidung Produkt | S | neu |
| P2-7 | Scripts/Edge/sw.js | Knip meldet „unused“ — oft **False Positives** (CLI/Cron/Service Worker) | Nicht blind löschen; Knip-Ignore | — | — |

**Knip-Hinweis:** Viele ungenutzte **Typen/Exports** in Actions sind oft öffentliche API oder Re-Exports — nicht massenhaft entfernen. `server-only` als unlisted Dependency in Knip konfigurieren.

---

## P3 — Kosmetik

| ID | Ort | Befund | Soll | Aufwand |
|----|-----|--------|------|---------|
| P3-1 | `components/dashboard/*` | 4× PascalCase (`DashboardMfaGate`, …) | kebab-case | S |
| P3-2 | Quote-Mix | `components/ui/` oft `"`, Rest `'` | Prettier/`format` | S (805 Dateien!) |
| P3-3 | DE/EN Dateinamen | `ki-entwurf`, `sperrlink` vs engl. Domains | Bei Touch angleichen | — |
| P3-4 | Hardcoded Farben | Accounts/Deals Status (`red-*`, `emerald-*`) | Design-Tokens | M |
| P3-5 | EN-Copy Reste | Strategy-Tab Buying-Center, „Company Update“ | `COPY` / DE | S |

---

## God-Files (Top, ohne generierte Typen)

| Datei | Zeilen |
|-------|-------:|
| `app/dashboard/dashboard-overview.tsx` | ~933 |
| `app/dashboard/accounts/companies-grid.tsx` | 960 |
| `app/dashboard/references/new/actions.ts` | 994 |
| `lib/references/reference-form/reference-form-content.tsx` | ~126 (war 1093) |
| `app/dashboard/overview/reference-table-column-renders.tsx` | ~10 barrel (war 1112) |
| `app/dashboard/market-signals/actions.ts` | ~196 (war 1299) |
| `app/dashboard/deals/actions.ts` | ~152 (war 945) |
| `app/dashboard/accounts/actions.ts` | ~327 |
| `app/dashboard/smart-match/smart-match-shell.tsx` | ~258 |

---

## Empfohlene Abbau-Wellen

1. **Quick Wins (diese Session):** P0-1 Auth-Guard ✅, P0-2/P0-3 tote APIs ✅, P2-1 leere Dirs ✅, P2-2 triagierte Orphans ✅, P2-3 Aliase ✅, P1-1 Result-Shape + Guide ✅, Knip-Script ✅.
2. **E6-Fortsetzung:** Logger auf heiße Pfade ✅ (Auth, HubSpot, Approvals, Import, Invite — 2026-08-04); Rest Boy-Scout.
3. **Konsolidierung:** `companyFromJoin` ✅, `normalizeDealStatus` ✅, `formatDateUtcDe`→`formatReferenceDate` ✅; Extract-Facades noch offen.
4. **God-File-Slices:** Accounts ✅; Overview ✅; Smart-Match ✅; Market-Signals-Actions ✅; Column-Renders ✅; Reference-Form-Content ✅; Deals-Actions ✅ (2026-08-04).
5. **Tooling:** Knip warnend in CI (`npm run knip`); `format:check` erst nach Format-Welle.

### Erledigt 2026-08-04 (Welle Quick Wins)

| Item | Änderung |
|------|----------|
| P0-1 | `deleteCompanyWithData`: Auth + Org + Sales-Restricted-Guard |
| P0-2 | `app/api/deal-desk/analyze` entfernt |
| P0-3 | `app/api/rfp-match` entfernt |
| P0-4 | `tsc --noEmit` und Unit-Tests grün (Recency-Test + Test-Typfixes) |
| P1-1 | `result.ts` → `{ success }`; Guide + E6 Doc |
| P2-1 | Leere Dirs `companies`, `concepts/inbox-references`, `api/rfp/coverage`, `dev/ui-preview` |
| P2-2 | ~35 unreferenzierte App-/Lib-/Component-Dateien gelöscht (Knip-triagiert; `reference-embedding-text` behalten wegen Backfill-Script) |
| P2-3 | `NewsroomsCard`, ISO-27001-Aliase, `DESK_COVER_THRESHOLD`-Reexports, `deadlineCountdownClass`/`deadlineTitleClass`, `upgradeReferencedCompanyLogosForLightUi` |
| Tooling | `knip` + `knip.json`; Script `npm run knip` |
| P1-2 / E6 T3 | Logger auf Auth, HubSpot-APIs, Approvals/E-Mails, Deal-Import, Bulk-Import, reference-extract, Invite |
| P1-4 / P1-5 / P2-4 | `companyFromJoin` → `lib/accounts/company-from-join.ts`; `normalizeDealStatus` → `lib/deals/normalize-deal-status.ts`; UI-Dates → `formatReferenceDate(..., 'de-DE')` |
| P1-3 Accounts | `actions.ts` auf Wrapper + Impl-Module (`strategy-roadmap`, `stakeholders`, `contacts`, `account-match`, `account-deals`, `company-crud`, `onepager`, Typen) |
| P1-3 Overview | Spalten/Filter/Table/Bulk-Helpers nach `overview/*`; `dashboard-overview` ~933 Z. |
| P1-3 Smart-Match | Filters/Search/Results/Helpers; `smart-match-shell` ~258 Z. |
| P1-3 MS/Deals/UI | MS-actions ~196; Deals-actions ~152; column-renders barrel; form-content ~126 + Sections |

---

## Was bewusst nicht Big-Bang

- Repo-weites `evidence`→`references` Rename  
- Massenmigration aller `console.*` / aller Result-Typen  
- Schema/RLS ohne Security-Paket  
- Blindes Löschen aller Knip-Exports (False Positives bei Server Actions)
