# Arbeitspaket: Dashboards & Navigation (Welle 3) — inkl. Cleanup

**Quelle:** Produkt-Audit, Entscheidungsregister (C1, C4, C5, C7, D1, D2) & Dashboard-Spec (Vault, Juni 2026).
**Voraussetzung:** Welle 1 (`system_role`/`function_role`/`capabilities`, `lib/roles/*`) **und** Welle 2 (Sichtbarkeits-RLS) sind umgesetzt. 261+ Tests grün.
**Datenlage beachten:** Pre-Pilot (im Wesentlichen 1 Demo-Org). Dashboards/Insights datengetrieben bauen, aber **keine** erfundenen Kennzahlen — wo Daten fehlen, ehrlicher „zu wenig Daten"-Zustand (E1/G2 sind bewusst vertagt).

---

## Vorab lesen (für die Coding-Session)

- **Konventionen zuerst:** `docs/ai-coding-agent-guide.md` + `docs/design-system.md` (viel UI in dieser Welle).
- **Rollen-/Capability-Quelle:** `lib/roles/*` (`capabilities.ts`, `profile-roles.ts`, `reference-visibility-scope.ts`) — Dashboards wählen über `function_role`, nicht über Legacy-`role`.
- **Überholt:** rollenbezogene Teile von `docs/arbeitspakete-freigabe-rollen-settings-deals.md`.
- **Code vor Edit lesen**; **Vault nicht** heranziehen.
- **Entscheidung C4 = Option B** ist verbindlich: Market Signals ist **keine** Kernsäule (Details unten T4/T5).

---

## Ist-Stand (verifiziert)

- Sidebar-Reihenfolge aktuell: **Home · Match · Market Signals · Accounts · Deals · Evidence** (+ Support/Feedback/Settings). `app/dashboard/dashboard-shell.tsx`.
- Market Signals **noch** in der Nav (`ROUTES.marketSignals`).
- **Keine** `/dashboard/insights`-Route.
- Dashboard-Datenmodelle existieren: `loadSalesRepDashboardData`, `loadAccountManagerDashboardData`, `loadAdminDashboardData`, Dispatcher `loadDashboardHomeForRole(role)` (`dashboard-home-data.ts`, 1287 Z.) — mappen noch auf Legacy-`role`.
- `dashboard-overview.tsx` 1419 Z., enthält 2× `role === 'sales'`.
- Zwei Request-Pfade: `app/dashboard/request/page.tsx` **und** `app/dashboard/deals/request/new/page.tsx`.
- `market-signals/market-signals-client.tsx` 2871 Z.

---

## T1 (D1) — Rollenbasierte Dashboards

**Soll:** Dashboards über **`function_role`** auswählen (Dispatcher `loadDashboardHomeForRole` darauf umstellen). Je Rolle: **eine Leitfrage + Hero + max. 3 Widgets** (Design-Spec). Auf den vorhandenen `load*DashboardData`-Modellen aufbauen.

- **Sales Rep:** Hero = semantische Suche; Widgets: aktive Deals (Match-Status), empfohlene Referenzen, kürzlich geteilt. **Kein** synthetischer Pipeline-Impact (in W0 entfernt — nicht wieder einführen).
- **Account Manager:** Hero = Neue Referenz/Bulk-Import; Widgets: eigene Referenzen nach Status, ausstehende Freigaben (inkl. Änderungswünsche), Nutzung der eigenen Referenzen.
- **Sales Leader:** Hero = KPI-Leiste (Referenzen, Matches/Woche, **Win-Rate echt oder „zu wenig Daten"**); Widgets: Adoption, Top-Referenzen, Abdeckungslücken.
- Weitere Funktions-Rollen (RPM/Marketing/Bid) später — hier nur, falls trivial ableitbar.
  **Akzeptanz:** Dashboard richtet sich nach `function_role`; je Rolle 1 Hero + ≤3 Widgets; alle Zahlen echt oder ehrlich leer; Tests grün.

---

## T2 (D2) — Generalisten-Dashboard (Fallback)

**Soll:** Ist keine `function_role` gesetzt (oder kleine Teams nur Owner/Sales), ein kombiniertes Dashboard aus den wichtigsten Widgets (Suche + aktive Deals + ausstehende Freigaben + Nutzung).
**Akzeptanz:** Nutzer ohne spezifische Funktions-Rolle sehen ein sinnvolles, nicht leeres Dashboard.

---

## T3 (C7) — Insights-Destination

**Soll:** Neue Route `app/dashboard/insights/` + Sidebar-Eintrag. Inhalt (Zeitreihen, aus `evidence_events`): Nutzung (Views/Shares/Matches — echt), Adoption (WAU/Team), **Win-Rate mit vs. ohne Referenz** (echt aus `deals.outcome` × `deal_references`/`evidence_events`; bei zu wenig Deals ehrlich „nicht aussagekräftig"), Top-Referenzen, Abdeckungslücken.

- Zugriff über Capability `view_analytics_all` (Sales Leader/Admin) bzw. `view_analytics_own` (AM = eigene).
  **Akzeptanz:** `/dashboard/insights` erreichbar gem. Capability; KPIs echt; keine hartkodierten Werte; in der Nav (siehe T4).

---

## T4 (C1) — Sidebar neu ordnen

> **Überholt (August 2026).** Die verbindliche Sidebar ist `Home · Deals · Referenzen · Accounts` (Settings/Support im Footer). **Kein** Match, **keine** Marktsignale, **keine** Insights in der Nav. Smart Match liegt in der Referenz-Bibliothek (`?view=match`); die Route `/dashboard/smart-match` bleibt für Deal-Deep-Links.

**Historische Soll-Reihenfolge (Welle 3):** **Home · Match · Evidence · Deals · Accounts · Insights · Settings.**

- Evidence **nach oben** (vor Deals/Accounts), Insights **neu** aufnehmen, **Market Signals aus der Nav entfernen** (→ T5).
  **Dateien:** `app/dashboard/dashboard-shell.tsx`, `lib/copy.ts`.
  **Akzeptanz:** Sidebar entspricht der Soll-Reihenfolge; kein Market-Signals-Top-Level-Punkt mehr; Insights vorhanden; aktive Zustände korrekt.

---

## T5 (C4) — Market Signals: Per-Account-Feed + Widgets (Option B)

> **Teilweise überholt (August 2026).** „Keine eigene Destination“ gilt **nur für die Nav**, nicht für die Route. `/dashboard/market-signals` bleibt erreichbar, weil Digest- und Alert-Mails/Push auf `ROUTES.marketSignals` zeigen. Account-Card und Deal-Karten-Badge bleiben gültig.

**Soll (Welle 3):** Market Signals ist **keine** eigene Destination mehr.

1. **Heimat = Per-Account-Feed:** Signal-Inhalt im Account-Detail (Tab/Sektion) anzeigen — die bestehende Logik aus `market-signals-client.tsx` **dorthin verlagern** (nicht zerlegen-um-des-Zerlegens-willen, sondern verschieben/zuschneiden auf Account-Kontext).
2. **Dashboard-Widgets (handlungsauslösend, account-/pipeline-gebunden, kein Feed):**
   - **Sales Rep:** Signale zu Accounts **eigener aktiver Deals** — bevorzugt als **Badge/Indikator auf den Deal-Karten** (Widget 1), mit Direktaktion „passenden Beweis finden/teilen".
   - **Sales Leader:** **aggregiertes** Widget — nur Signale auf Accounts mit offenen Deals **über Schwelle X**, priorisiert.
   - **Andere Rollen:** keine Signale.
3. Cron-Ingest/Digest bleiben bestehen; nur die **Oberfläche** wird verlagert.
   **Dateien:** `app/dashboard/market-signals/*` (Quelle), `app/dashboard/accounts/[id]/*` (Ziel-Feed), Dashboard-Komponenten (Widgets), `dashboard-shell.tsx` (Nav-Eintrag raus, mit T4).
   **Akzeptanz:** Kein Market-Signals-Nav-Punkt; Signale im Account-Detail sichtbar; Sales-Rep-Deal-Karten zeigen Signal-Indikator mit Aktion; Sales-Leader-Dashboard zeigt aggregiertes, pipeline-gefiltertes Signal-Widget; kein generischer Feed im Dashboard.

---

## T6 (C5) — Request kontextuell + Pfade konsolidieren

**Soll:** Reference-Request wird **im Deal** ausgelöst (Branche/Volumen/Stage vorbefüllt) + Übersicht „Meine Requests" in der Notifications-Inbox. **Einen** Request-Pfad behalten.

- Die zwei Pfade (`/dashboard/request`, `/dashboard/deals/request/new`) auf einen konsolidieren; den anderen per Redirect/Entfernen auflösen.
  **Akzeptanz:** Request aus dem Deal heraus mit vorbefülltem Kontext; „Meine Requests" in der Inbox; nur noch ein Request-Einstieg im Code; alte URL leitet um.

---

## Cleanup (Boy-Scout dieser Welle — Block C + E)

> Gilt nur für Dateien, die diese Welle ohnehin anfasst (kein drive-by außerhalb).

- **`dashboard-overview.tsx` (1419 Z.) + `dashboard-home-data.ts` (1287 Z.) modularisieren**, während die Dashboards gebaut werden (pro Rolle/Widget eigene Module). Verhaltenserhaltend.
- **Rest-`role === 'sales'` (2× in `dashboard-overview.tsx`)** auf Capability-/`function_role`-Logik migrieren (Strangler-Schritt; konsistent mit Welle 2).
- **Request-Pfad-Dublette** auflösen (= T6).
- **Market Signals** aus Nav + verlagert (= T4/T5) — `market-signals-client.tsx` wird **verschoben/zugeschnitten**, nicht „nebenbei zerlegt".
- **Optional, falls berührt:** `overview/`-Komponenten-Verzeichnis klarer benennen (Kern der `references`/`evidence`-Umbenennung bleibt aber Welle 5).

---

## Out of Scope (→ andere Wellen)

- `references`(Module) vs. `evidence`(Route) Umbenennung → Welle 5.
- Legacy-`role`-Spalte entfernen → Welle 5.
- Echte Pilotdaten / Demo-Daten-Seeding (E1) und Pilot-Start (G2) → vertagt.
- Andere Monolithen (reference-form, approvals.ts) → ihre Wellen.

---

## Verifikation

```bash
npm run test
npm run build
```

- Manuell je Funktions-Rolle (sales_rep / account_manager / sales_leader, plus „keine Rolle"): korrektes Dashboard, ≤3 Widgets, echte/ehrliche Zahlen.
- Insights nur mit passender Capability erreichbar.
- Sidebar = Soll-Reihenfolge; kein Market-Signals-Punkt; Signale im Account-Detail + als Dashboard-Widget/Badge.
- `grep -rnE "role === 'sales'" app/dashboard/dashboard-overview.tsx` → 0.
- Genau **ein** Request-Einstieg; alte URL leitet um.

---

## Reihenfolge

T4 (Nav, klein) → T1/T2 (Dashboards, Kern; dabei Cleanup `dashboard-overview`/`-home-data`) → T3 (Insights) → T5 (Market Signals verlagern + Widgets) → T6 (Request). T1 und T5 sind die größten; je eigener PR. Verhaltenserhaltende Cleanups mit dem jeweiligen Task im selben PR.
