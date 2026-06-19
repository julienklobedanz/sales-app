# Arbeitspaket: Deal-Desk-Reife (Welle 4a)

**Quelle:** Feature-Umsetzungs-Prüfung & Entscheidungsregister (H6, H2, F2).
**Voraussetzung:** Welle 0–3 umgesetzt (Deals/Deal-Desk-Fusion aus W0, Rollen/Rechte aus W1/2, Insights aus W3). 261+ Tests grün.
**Zweck:** Technische Reife des Deal-Desk: zwei Analysepfade vereinen, JSON-Persistenz normalisieren (ermöglicht Reporting/Insights-Tiefe), schlankes Deal-Schema als Guardrail festschreiben.
**Nicht hier:** H3 (Background-Jobs/Queue) — laut Roadmap ohne Pilot nicht zeitkritisch, separat/später.

---

## Vorab lesen (für die Coding-Session)

- **Konventionen:** `docs/ai-coding-agent-guide.md`. Supabase-Migrationen nach bestehendem Muster.
- **Bestehende Bausteine:** `lib/deal-desk/workspace-state.ts` (`DealDeskWorkspaceState`), `lib/deal-desk/project-mapper.ts`, `lib/rfp-coverage.ts` (`buildRfpCoverageReport`), `lib/deal-desk/map-rfp-to-desk.ts`.
- **Code vor Edit lesen**; **Vault nicht** heranziehen.
- Verhaltenserhaltend wo möglich; Tests grün halten.

---

## Ist-Stand (verifiziert)

- **Zwei RFP-Analysepfade**, beide auf `buildRfpCoverageReport`:
  - `app/api/deal-desk/analyze/route.ts` → voller Snapshot (Win-Score, Red Flags, Draft-Zeilen, SME-Tasks) in `deal_desk_projects.analysis_snapshot`.
  - `app/api/rfp/analyze/route.ts` → nur `requirements` + `coverage` (für die RFP-Sektion auf der Deal-Detailseite), braucht `dealId`.
- **Persistenz als JSON-Blob:** `deal_desk_projects.workspace_state` (jsonb) hält `DealDeskWorkspaceState = { redFlags, smeRoutes: Record<string,string>, decision: 'go'|'no-bid'|null, bidTeam: BidTeamAssignment[] }`. **Keine** normalisierten Tabellen für SME-Routings/Bid-Team/Red-Flags → nicht über Deals hinweg auswertbar. Kein `deal_desk_audit`-Tabellenschema.
- **Deal-Schema** (`deals`): `title, company_id, industry, volume(text), status, expiry_date, requirements_text, account_manager_id, sales_manager_id, is_public` — bereits schlank (kein Forecast/Aktivitäten/Kontakte).

---

## T1 (H6) — RFP-Analysepfade vereinen

**Soll:** **Eine** Analyse-Engine als Quelle der Wahrheit; die Deal-Detail-RFP-Sektion liest denselben Snapshot wie Deal Desk.
1. Gemeinsame Funktion `analyzeRfp(input)` in `lib/deal-desk/` extrahieren, die den **vollen** Snapshot erzeugt (Coverage + Requirements + Win-Score + Red Flags + Draft-Zeilen + SME-Tasks), aufbauend auf `buildRfpCoverageReport` + `map-rfp-to-desk`.
2. `/api/deal-desk/analyze` nutzt `analyzeRfp` (wie bisher, Snapshot in `deal_desk_projects`).
3. Deal-Detail-RFP-Sektion: statt eigenem `/api/rfp/analyze` den **Snapshot des verknüpften Deal-Desk-Projekts** lesen (`deal_id`-Verknüpfung existiert). Wo eine Ad-hoc-Analyse ohne Projekt nötig ist, `analyzeRfp` aufrufen und Ergebnis persistieren statt flüchtig.
4. `/api/rfp/analyze` als **dünnen Wrapper** auf `analyzeRfp` zurückführen oder per Redirect/Deprecation auflösen — **kein** zweiter, abweichender Output mehr.
**Akzeptanz:** Beide Einstiege liefern konsistente Coverage/Requirements aus **einer** Engine; kein divergierender Zweit-Output; bestehende UI (DealRfpSection, Deal-Desk-Client) funktioniert unverändert; Tests grün.

---

## T2 (H2) — Deal-Desk-Persistenz normalisieren

**Soll:** Die Mehrzeilen-Daten aus `workspace_state` in **normalisierte, org-gescopte Tabellen** überführen, damit Reporting/Insights möglich werden (z. B. Red-Flags-an-Legal, SME-Antwortzeiten, Go/No-Bid-Quote).

**Migration (Skelett):**
```sql
-- SME-Routings (Anforderung → Zuständige:r)
CREATE TABLE public.deal_desk_sme_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.deal_desk_projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requirement_key text NOT NULL,
  assignee_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bid-Team-Zuordnung
CREATE TABLE public.deal_desk_bid_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.deal_desk_projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email text,           -- falls externes Mitglied ohne Profil
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Red Flags (für Auswertung: an Legal? Status?)
CREATE TABLE public.deal_desk_red_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.deal_desk_projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  severity text,
  sent_to_legal boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Go/No-Bid: einzelner Wert → Spalte auf deal_desk_projects
ALTER TABLE public.deal_desk_projects
  ADD COLUMN IF NOT EXISTS bid_decision text;  -- 'go' | 'no_bid' | null
```
- **RLS** auf alle neuen Tabellen: org-gescoped (Muster wie `deal_desk_projects`).
- **Backfill:** bestehende `workspace_state`-Inhalte in die Tabellen migrieren (SME-Routes, Bid-Team, Red-Flags, Decision).
- **Lese-/Schreibpfade** in `app/dashboard/deal-desk/actions.ts` + `lib/deal-desk/project-mapper.ts` auf die Tabellen umstellen.
- **Übergang (Strangler):** `workspace_state` während der Migration weiterschreiben/synchron halten, bis alle Pfade umgestellt sind; danach eigenes späteres Paket zum Entfernen. **Nicht** im selben PR hart abschalten.
- **Mock-Default beachten:** `bidTeam` nutzt heute `DEFAULT_BID_TEAM`/Mock — beim Normalisieren auf **echte** `profiles` umstellen bzw. leer starten (kein stiller Mock; verweist auf H1/„no silent mock").

**Akzeptanz:** SME-Routes, Bid-Team, Red-Flags, Decision liegen in Tabellen + sind org-RLS-geschützt; Bestandsdaten verlustfrei migriert; Deal-Desk-UI verhält sich unverändert; eine einfache Aggregat-Abfrage (z. B. „Red Flags an Legal letzten 30 Tage") ist möglich; Tests grün.

---

## T3 (F2) — Schlankes Deal-Schema als Guardrail festschreiben

**Soll:** Den schlanken Match-Kontext-Charakter der `deals`-Tabelle **bewusst sichern** — kein Nachrüsten von CRM-Funktionsumfang (Forecast, Aktivitäten-Log, Kontakt-CRM).
- Kurzer Guardrail-Vermerk im Code (z. B. Kommentar an der `deals`-Typ-/Schema-Definition + Verweis hierher) und in `docs/` (dieses Paket).
- Optional: einfacher Test/Lint, der vor neuen CRM-typischen Spalten warnt (z. B. Assertion auf erlaubtes Spalten-Set), falls mit vertretbarem Aufwand machbar.
**Akzeptanz:** Guardrail dokumentiert/sichtbar an der Schema-Definition; keine neuen CRM-Felder eingeführt.

---

## Cleanup (Boy-Scout dieser Welle)

- Beim Anfassen von `deal-desk/actions.ts` / `project-mapper.ts`: opportunistisch entwirren, keine neuen Helfer-Dubletten.
- `DEFAULT_BID_TEAM`/Mock-Bid-Team beim Normalisieren (T2) entkoppeln → reale Profile statt stillem Mock (knüpft an H1 an).

---

## Out of Scope (→ andere Pakete)

- H3 Background-Jobs/Queue (separat, ohne Pilot nicht zeitkritisch).
- Welle-4b (Compliance-Segment, Zitat, E-Mail-Branding, KI-vs-Heuristik, Storage) und 4c (Legacy-Routen).
- Entfernen von `workspace_state` (erst nach abgeschlossener Umstellung, eigenes Paket).

---

## Verifikation

```bash
npm run test
npm run build
# Migration lokal/Branch anwenden, Supabase-Typen regenerieren
```
- Manuell: ein Deal-Desk-Projekt anlegen/analysieren → SME-Route + Bid-Team + Red-Flag in den neuen Tabellen; Backfill eines bestehenden Projekts verlustfrei.
- H6: DealRfpSection (Deal-Detail) und Deal-Desk zeigen konsistente Coverage aus einer Engine.

---

## Reihenfolge

T1 (H6, isoliert) → T2 (H2, Migration + Backfill + Pfade; größtes Item, eigener PR) → T3 (F2, klein). T1 und T2 nicht vermischen.
