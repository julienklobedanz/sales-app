# Arbeitspaket: Legacy-Abbau & Namens-Konsolidierung (Welle 5 — Abschluss)

**Quelle:** Roadmap-Block B + F + workspace_state-Abbau. **Letzte geplante Welle.**
**Voraussetzung:** Welle 0–4 umgesetzt. Tests grün.
**Zweck:** Den über die Wellen aufgebauten Übergangs-Ballast entfernen: Legacy-`role`-Spalte, JSON-`workspace_state`, und die `references`/`evidence`-Namensdopplung.
**Charakter:** Größter Cleanup, **mehrere PRs**. Strikt verhaltenserhaltend. Sicherheitsregel: kein Drop/Rename ohne „0 Referenzen"-Nachweis + Branch + grüner Testlauf (266 Tests).

---

## Vorab lesen (für die Coding-Session)

- **Konventionen:** `docs/ai-coding-agent-guide.md`. Migrationen nach bestehendem Muster; Supabase-Typen nach jeder Migration neu generieren.
- **Rollen-Quelle:** `lib/roles/*` (`capabilities.ts`, `profile-roles.ts`, `legacy-mapping.ts`).
- **Code vor Edit/Drop lesen**; **Vault nicht** heranziehen.

---

## Ist-Stand (verifiziert)

- **63** verbliebene Legacy-`role`-Lesestellen (`.role ===`, `profile.role`, `role === 'sales|admin|account_manager'`) in ~20 Dateien (u. a. settings, accounts, deals, references, PDF-Routen, onboarding, notifications, dashboard-overview).
- **42** Importe aus `app/dashboard/references/` (Modul-Ordner ohne Route) — die `references`/`evidence`-Namensdopplung.
- `app/dashboard/settings/user-role.ts` schreibt bereits `system_role`/`function_role` (Legacy-`role` via Trigger synchron) — als „transitorisch bis Welle 5" markiert.
- **DB-seitig safe:** Die references-RLS nutzt `current_user_function_role()`/`system_role`/`capabilities` — **nicht** `profiles.role`. Kein DB-Objekt greift auf `profiles.role` zu → Spalten-Drop bricht keine Policy.
- `workspace_state` wird noch aus JSON gelesen (u. a. `app/api/deal-desk/executive-briefing-pptx/route.ts` via `parseWorkspaceState`) → vor Entfernen migrieren.

---

## T1 (Block F · Schritt 1) — Verbliebene `role`-Lesestellen migrieren

**Soll:** Alle 63 Legacy-Vergleiche auf das neue Modell umstellen: `system_role`/`function_role` bzw. `can(capability)` (aus `lib/roles/*`). **Sicherheitsrelevante** Stellen zuerst (Zugriff/Sichtbarkeit), dann kosmetische (UI).
**Vorgehen:** clusterweise als getrennte PRs, z. B.:
- Settings (`settings-form.tsx`, `compliance-*`),
- Accounts (`accounts/*`, `nda-actions.ts`),
- Deals/Deal-Desk (`deals/page.tsx`, `deal-desk/actions.ts`),
- References/Approvals (`pending-approvals.ts`, `approvals.ts`),
- Output-Routen (`api/pdf/*`, `reference-onepager-pptx`),
- Onboarding/Notifications/Dashboard (`wizard-actions.ts`, `notifications/inbox.ts`, `dashboard-shell.tsx`, `dashboard-overview.tsx`, `overview/reference-detail-sheet.tsx`).
**Akzeptanz:** `grep -rnE "role === '(sales|admin|account_manager)'|profile\.role" app lib` → **0**; Verhalten je Rolle unverändert; Tests grün.

---

## T2 (Block F · Schritt 2) — `profiles.role` entfernen

**Erst wenn T1 = 0 Legacy-Lesestellen.**
**Soll:**
- Migration: `profiles.role`-Spalte droppen, Sync-Trigger (`sync_legacy_profile_role`) + Trigger-Funktion entfernen, Invite-Legacy-`role`-Spalte ebenso (falls vorhanden).
- `lib/roles/legacy-mapping.ts` und der Legacy-Pfad in `user-role.ts` entfernen/vereinfachen (nur noch System-/Funktions-Rolle).
- Supabase-Typen regenerieren.
**Akzeptanz:** Keine `role`-Spalte mehr; kein Sync-Trigger; App nutzt ausschließlich `system_role`/`function_role`/Capabilities; Build & Tests grün.

---

## T3 (Block B) — `references`/`evidence`-Namen konsolidieren

**Soll:** Die Modul-Ordner-Bezeichnung `references` (Server-Actions/Helfer, **keine** Route) an die UI-Route `evidence` angleichen — ein Name für das Domänenobjekt. Variante: Module nach `app/dashboard/evidence/_actions/` (oder `lib/evidence/`) verschieben und die **42 Importe** aktualisieren.
**Charakter:** mechanischer Rename/Move — ein gebündelter PR, am besten per IDE-Refactor; danach Voll-Build.
**Akzeptanz:** Keine `@/app/dashboard/references/`-Importe mehr; Funktion unverändert; Tests grün.
**Hinweis:** Öffentliche Routen/Slug-Pfade (`/p/[slug]`) und Storage-Bucket-Namen **nicht** umbenennen — nur interne Modulpfade.

---

## T4 — `workspace_state` (JSON) abbauen

**Erst wenn alle Lesepfade auf die normalisierten Tabellen (4a) umgestellt sind.**
**Soll:**
- Verbliebene JSON-Reads migrieren (mind. `executive-briefing-pptx/route.ts` → aus `deal_desk_sme_routes`/`_bid_team`/`_red_flags`/`bid_decision` lesen).
- Dual-Write + JSON-Fallback (`workspace-merge.ts`/`workspace-persistence.ts`) entfernen; `workspace_state`-Spalte droppen.
**Akzeptanz:** `grep -rnE "workspace_state" app lib` → keine produktiven Lese-/Schreibpfade mehr; Deal-Desk verhält sich unverändert; Tests grün.

---

## Reihenfolge & Sicherheit

1. **T1** (role-Lesestellen migrieren) — Voraussetzung für T2; clusterweise PRs.
2. **T2** (role-Spalte droppen) — erst nach T1=0.
3. **T3** (references→evidence) — unabhängig, eigener Refactor-PR.
4. **T4** (workspace_state) — erst nach Migration der JSON-Reads.
- Jeder Drop/Rename: vorher `grep`=0, Branch, Tests grün. T2 und T4 sind irreversible DB-Schritte → besonders sorgfältig.

---

## Verifikation

```bash
npm run test
npm run build
# nach jeder Migration: Supabase-Typen regenerieren
```
- T1: `grep` der Legacy-Muster = 0.
- T2: kein `profiles.role` in Schema/Code; RLS weiter funktionsfähig (nutzt function_role).
- T3: kein `@/app/dashboard/references/`-Import.
- T4: keine produktiven `workspace_state`-Zugriffe.

---

## Abschluss

Mit Welle 5 ist der gesamte geplante Umbau-/Cleanup-Zyklus (Welle 0–5) abgeschlossen. **Bewusst offen/vertagt bleiben:** H3 (Background-Jobs — ohne Pilot), E1 (Pre-Pilot-Daten) und G2 (Pilotkunden/Phase-1-Start). Diese werden reaktiviert, wenn der Pilot ansteht.
