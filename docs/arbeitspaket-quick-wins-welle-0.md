# Arbeitspaket: Quick-Wins (Welle 0)

**Quelle:** Produkt-Audit, Entscheidungsregister & Live-DB-Prüfung (Vault, Juni 2026).
**Zweck:** Die unabhängigen, risikoarmen Sofort-Maßnahmen — sichtbarer USP, Proof-over-Promise-Löcher schließen, größte IA-Verwirrung beseitigen, sichere tote Pfade entfernen.
**Eigenschaft:** Diese Aufgaben sind **voneinander unabhängig** → je ein eigener kleiner PR. **Keine** Abhängigkeit zum Rollenmodell (Welle 1).

---

## Vorab lesen (für die Coding-Session)

- **Konventionen zuerst:** `docs/ai-coding-agent-guide.md` (Scope-Disziplin, Design-Tokens, zentrale Badge-Komponenten, deutsche UI-Copy) — bei UI zusätzlich `docs/design-system.md`.
- **Überholt:** rollenbezogene Teile von `docs/arbeitspakete-freigabe-rollen-settings-deals.md` (alte `admin`/`sales`-Annahme) — nicht als Zielbild nehmen.
- **Code vor Edit lesen**; **Vault nicht** heranziehen (außerhalb Repo).
- Jede Aufgabe einzeln umsetzen + Tests grün halten (55 Tests vorhanden).

---

## T1 (C2) — „Match/Finden" als sichtbaren Nav-Punkt

**Problem:** `[verifiziert]` Die Kernhandlung (semantischer Match) hat **keinen** Sidebar-Eintrag; erreichbar nur über Command-Palette, Header-Suche und kontextuell. Route `ROUTES.match` (`/dashboard/match`) existiert.
**Soll:** Sidebar-Eintrag „Finden" (oder „Match") aufnehmen und **weit oben** platzieren (nach Home, vor/bei Evidence).
**Dateien:** `app/dashboard/dashboard-shell.tsx` (Sidebar-Items), `lib/copy.ts` (`COPY.nav.*`), `lib/routes.ts` (vorhanden).
**Schritte:** neues `SidebarMenuItem` mit `ROUTES.match` + passendem Hugeicon (`lib/icons.tsx`/`AppIcon`), `isActive`-Logik analog zu bestehenden Items; Reihenfolge anpassen.
**Akzeptanz:** Match ist als Sidebar-Punkt sichtbar und aktiv-markiert; kein Doppel-Eintrag; bestehende kontextuellen Einstiege bleiben.

---

## T2 (D3) — Fake-Win-Rate & synthetischen Pipeline-Impact entfernen

**Problem:** `[verifiziert]` `app/dashboard/dashboard-home-data.ts` ~Z. 314–316 setzt `winRatePercent: 14`, `winRateDeltaPercent: 2` **hartkodiert**; `pipelineImpact` (~Z. 308–313) wird synthetisch aus `activeDeals.length` abgeleitet. Live existieren nur 2 abgeschlossene Deals → echte Win-Rate statistisch unmöglich.
**Soll:** Hartkodierte/synthetische Werte entfernen. Statt einer erfundenen Zahl ein **ehrlicher Zustand**: „Zu wenige abgeschlossene Deals für eine valide Quote" (oder Kennzahl ausblenden, bis genug Daten da sind). Keine simulierten KPIs (Guardrail „Proof over Promise").
**Dateien:** `app/dashboard/dashboard-home-data.ts` + die Komponente(n), die `pipelineImpact`/`winRatePercent` rendern.
**Akzeptanz:** Keine konstante 14 % mehr im Code/UI; Sales-/Admin-Dashboard zeigt entweder echte, aus Daten berechnete Werte **oder** einen klaren „zu wenig Daten"-Hinweis. Nutzungs-KPIs (Views/Shares aus `evidence_events`) bleiben unverändert (die sind echt).

---

## T3 (Bug) — `reference_matched`-Tracking reparieren

**Problem:** `[verifiziert]` Live ist `reference_matched` seit 20.04. **stale**, obwohl Views/Shares aktiv sind. Befund: Logging (`logEvent({ eventType: 'reference_matched' })`) liegt in `app/dashboard/references/match.ts` (via `actions.ts::matchReferences` → `matchReferencesImpl`). Die **prominente** Dashboard-/Command-Center-Suche läuft aber über `searchReferencesSemanticLegacy` (`app/dashboard/command-center/actions.ts`) — **Hypothese: dieser Pfad loggt nicht.**
**Schritte:** (1) Prüfen, welche Match-Einstiege real genutzt werden und welche `reference_matched` emittieren. (2) Den/die ungeloggten Pfad(e) ergänzen — am besten **eine** zentrale Logging-Stelle, damit nicht erneut ein Pfad „vergisst".
**Dateien:** `app/dashboard/command-center/actions.ts`, `lib/command-center/search-references-semantic.ts`, `app/dashboard/references/match.ts`, `lib/events/log-event.ts`.
**Akzeptanz:** Ein Match über die Dashboard-Suche **und** über die Match-Seite erzeugt je ein `reference_matched`-Event in `evidence_events`; manuell verifiziert.

---

## T4 (H1 + Cleanup D) — „No silent mock"

**Problem:** `[verifiziert]` Mehrere Deal-Desk-Funktionen fallen ohne echte Daten/Key still auf Mock/Heuristik zurück: Default-Bid-Team = `MOCK_TEAM_MEMBERS` (`lib/deal-desk/bid-team.ts::initialBidTeamMembers`), `lib/deal-desk/mock-analysis.ts`, `demo-seed.ts`, `reference-incubator-mock.ts`; Benchmark-Risk/Intro-Strategie ohne OpenAI-Key.
**Soll:** Kein stiller Mock im Produktivpfad. Entweder **klar kennzeichnen** („Demo/Beispiel") oder hinter ein **Demo-Flag** legen, das im Normalbetrieb aus ist. Vorbild positiv: die Universal-Suche **warnt** ohne OpenAI-Key — dieses Muster übernehmen.
**Dateien:** `lib/deal-desk/bid-team.ts`, `lib/deal-desk/mock-analysis.ts`, `lib/deal-desk/demo-seed.ts`, `lib/deal-desk/reference-incubator-mock.ts`, Aufrufer in `app/dashboard/deal-desk/*`.
**Akzeptanz:** Im Normalbetrieb erscheint kein als „echt" getarnter Mock; fehlt eine Datenquelle/Key, gibt es einen sichtbaren Hinweis statt Attrappe.

---

## T5 (F1) — HubSpot-OAuth scharfschalten — **obsolet**

Die CRM-Anbindung (HubSpot-OAuth, Import, Sync) wurde entfernt. Sie war nie in Betrieb (null Verbindungen, null `crm_*`-IDs). Nicht scharfschalten, keine Setup-Doku mehr.

---

## T6 (C3) — Deals + Deal Desk fusionieren

**Problem:** `[verifiziert]` Zwei Top-Level-Module für dasselbe Objekt „Deal": Sidebar hat `ROUTES.dealDesk` **und** `ROUTES.deals.root`; Deal-Detail liegt unter `app/dashboard/deals/[id]/page.tsx`.
**Soll:** **Ein** Modul „Deals". Deal Desk wird ein **Tab/Panel auf der Deal-Detailseite** (KI-Analyse, Dokument-Upload), kein eigener Sidebar-Punkt. Bestehende Deal-Desk-Projekte mit dem zugehörigen Deal verknüpfen (Spalte `deal_id` existiert bereits).
**Dateien:** `app/dashboard/dashboard-shell.tsx` (Deal-Desk-Nav entfernen), `app/dashboard/deals/[id]/page.tsx` (+ Tab), `app/dashboard/deal-desk/deal-desk-client.tsx` (als Tab-Inhalt einbinden — bei der Gelegenheit modularisieren, ist 1.107 Z.), `lib/routes.ts` (Routing/Redirect `dealDesk` → Deal-Detail-Tab).
**Hinweis:** Backend-Konsolidierung der zwei Analysepfade (`/api/deal-desk/analyze` vs `/api/rfp/analyze`) ist **H6/Welle 4** — hier nur die **UI/Modul-Fusion**, nicht die Engine-Vereinheitlichung.
**Akzeptanz:** Kein „Deal Desk" mehr in der Sidebar; KI-Analyse erreichbar als Tab im Deal; alte `dealDesk`-URL leitet sinnvoll um; bestehende Projekte bleiben zugänglich.
**Größe:** Mittel (größtes Item dieser Welle) — ggf. eigener, sorgfältiger PR.

---

## T7 (Cleanup A) — Tote Pfade entfernen

**Problem:** `[verifiziert]`

- `app/dashboard/concepts/inbox-references/*` — Route per `LEGACY_REDIRECTS` abgefangen → wird nie gerendert; enthält `demo-data.ts`.
- `app/onboarding/steps/reference-step.tsx` — existiert, aber **nicht** im Wizard importiert.
- `app/dashboard/companies/maintenance.ts` — einzelne Datei in Legacy-Ordner (`companies → accounts` redirected).
  **Soll:** Nach **„0 Imports"-Check** entfernen bzw. verschieben: `concepts/inbox-references/*` löschen; `reference-step.tsx` **einbinden oder löschen** (Entscheidung dokumentieren); `companies/maintenance.ts` nach `accounts/`/`lib/` verschieben (Aufrufer anpassen).
  **Akzeptanz:** Keine toten Routen/Dateien mehr; `grep` zeigt 0 verbliebene Imports der entfernten Teile; Build & Tests grün.

---

## Verifikation (gesamt)

```bash
npm run test
npm run build
```

- T3/T4 zusätzlich manuell: Event in `evidence_events` prüfen bzw. Normalbetrieb ohne Mock.
- T7: vor jedem Löschen `grep -r "<symbol/pfad>" app components lib` = 0.

---

## Reihenfolge-Empfehlung

T1, T2, T3, T7 (alle klein/unabhängig, sofort) → T4 (klein–mittel) → T5 (Ops, parallel möglich) → **T6 zuletzt** (größtes, eigener PR). Jede Aufgabe ist einzeln auslieferbar.
