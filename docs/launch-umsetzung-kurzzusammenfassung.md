# Launch-Umsetzung – Kurzzusammenfassung

Diese Datei fasst die zuletzt umgesetzten Punkte aus der technischen Bestandsaufnahme zusammen.

## 1) RFP-Analyse im Match-Tab

- Platzhalter in `/dashboard/match?tab=rfp` entfernt.
- RFP-MVP ist jetzt nutzbar (mit Deal-Kontext).
- Neue Match-RFP-Client-Integration ergänzt.
- API-Fehler bei fehlendem `OPENAI_API_KEY` auf klaren Deaktiviert-Hinweis umgestellt.

## 2) Deals-Übersicht reaktiviert

- `/dashboard/deals` von Redirect zurück auf echte Übersicht umgestellt.
- Auth-/Org-Checks integriert.
- Deals, Companies und Org-Profile werden geladen und in `DealsClientContent` angezeigt.

## 3) CRM-Sync-Hardcoding reduziert

- Fester Demo-Link zu Salesforce im Referenz-Detail entfernt.
- CRM-Link wird jetzt deal-spezifisch aus `salesforce_opportunity_id` aufgebaut.
- Fallbacks:
  - Wenn CRM-ID vorhanden: Salesforce Opportunity-Link.
  - Wenn nur Deal vorhanden: Link zum Deal in RefStack.
  - Wenn kein Deal/keine CRM-ID: informative Hinweis-Message.
- Neue Helper-Funktion: `lib/crm/salesforce.ts`.

## 4) App-URL/Env-Robustheit

- Zentrale Origin-Normalisierung mit `getAppOrigin()` eingeführt.
- Bisherige `localhost`-Fallbacks in produktionsrelevanten Flows ersetzt:
  - Invites
  - Stripe Return URLs
  - Register Redirect
  - Approval- und Deal-Mail-Links
  - Market Signals Cron/Instant Alerts

## 5) Schema-Cache-Robustheit

- Fallback-Handling für Accounts External Contacts ergänzt:
  - toleriert fehlende Cache-Sichtbarkeit neuer Spalten (`phone`, `last_interaction_at`).
  - verhindert harte Laufzeitabbrüche direkt nach Migrationen.

## 6) Public Flows gehärtet

- Public Portfolio View-/Share-Logging blockiert Seite nicht mehr bei RPC-Fehlern.
- Fehler werden geloggt, öffentliche Ansicht bleibt verfügbar.

## 7) Zielumgebungs-Verifikation vorbereitet

- Script ergänzt: `scripts/verify-launch-env.mjs`
  - prüft erforderliche und optionale Env-Variablen.
- NPM-Command ergänzt:
  - `npm run verify:launch-env`
- SQL-Check ergänzt:
  - `supabase/checks/launch_readiness.sql`
  - prüft kritische Spalten, RPCs, RLS-Status, Policy-Footprint.
- Runbook ergänzt:
  - `docs/launch-readiness-runbook.md`
  - enthält Schritt-für-Schritt für Staging/Prod (Env, SQL-Checks, Cron, Approval/Public, Smoke).

## 8) QA-Status

- Lint/Test/Build wurden erneut ausgeführt.
- Ergebnis: Build grün, Tests grün, Lint ohne Errors (nur bestehende Warnings).
