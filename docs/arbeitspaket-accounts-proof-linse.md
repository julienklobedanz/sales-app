# Arbeitspaket: Accounts-Umbau — Proof-Linse, Entschachtelung, Signal-Strip

**Quelle:** Green-Field-Entwurf [[account-bereich-neugedacht]] + Kollegen-Feedback (zu verschachtelt, Strategie an Beweis koppeln, Signale zuerst). Entscheidung Julien: **Option A (Proof-Linse)**.
**Zweck:** Den Account-Detail-View entschlacken und seine Strategie-Felder **mit echtem Beweis verbinden** — RefStacks USP statt CRM-Klon.

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md`
- `app/dashboard/accounts/account-detail-client.tsx` (Orchestrator, 4 Tabs)
- `app/dashboard/accounts/account-detail-strategy-tab.tsx` (Signale + MEDDPICC + Buying Center)
- `app/dashboard/accounts/account-detail-power-map-tab.tsx` (separater Buying-Center-/Power-Map-Tab)
- `app/dashboard/accounts/account-detail-pipeline-tab.tsx`, `account-detail-proof-points-tab.tsx`
- `app/dashboard/match/match-rfp-client.tsx` (Coverage-Matrix als Vorlage) + die semantische Suche `matchReferences`

## Ist-Stand (verifiziert) — wichtig

Der Account-Detail hat **4 Tabs**: `mission_control` (Strategy), `buying_center` (Power Map), `pipeline` (Deals), `proof_points` (Referenzen).

- **MEDDPICC existiert bereits** als 6 Freitextfelder in der Strategy-Tab (`strategyFields`: Metrics & Pain, Geschäftsziele, Value Proposition, Red Flags, Wettbewerb, Nächste Schritte → Tabelle `company_strategies`).
- **Buying Center (Miller Heiman) existiert bereits** — und zwar **doppelt**: rechte Spalte der Strategy-Tab **und** als eigener `buying_center`/Power-Map-Tab. → Redundanz.
- **Signale existieren bereits**, aber nur als kleine Karte oben in der Strategy-Tab.
- `proof_points` zeigt account-verknüpfte Referenzen mit einer **naiven Heuristik** (`matchScore` aus Branche+Region), **nicht** der echten Embedding-Suche.

→ Der Kollegen-Eindruck „Strategie fehlt komplett" stimmt gegen den Code **nicht**. Das echte Problem ist: Strategie ist **Freitext, von Beweis entkoppelt, teils doppelt**, und Signale sind nicht priorisiert. Genau das adressiert die Proof-Linse.

---

## Zielbild (3 Tabs + Signal-Strip)

```
┌ Account-Header: Name · Branche · [Account bearbeiten] ─────────────────┐
│ ⚡ Signal-Strip: „IndustrieAG meldet Cloud-Initiative · vor 2 Tagen"     │
│                       [ mit Beweis reagieren → Smart Match ]            │
├ [ Überblick ] [ Deals & Beweis ] [ Referenzen ] ───────────────────────┤
│ Überblick: Steckbrief · MEDDPICC · Buying Center (1×, konsolidiert)     │
│ Deals & Beweis: Pipeline + je Deal Proof-Coverage gegen Kriterien      │
│ Referenzen: account-verknüpfte Referenzen mit echtem Match-Score       │
└────────────────────────────────────────────────────────────────────────┘
```

## T1 — Entschachtelung + Signal-Strip (Frontend, keine Schema-Änderung)

1. Tabs von 4 → **3**: `overview` (= bisher `mission_control`), `deals` (= `pipeline`), `references` (= `proof_points`). Den separaten `buying_center`/Power-Map-Tab **auflösen**.
2. **Buying-Center-Konsolidierung:** Die reichhaltigere der beiden Darstellungen behalten (Power-Map-Tab-Logik vs. Strategy-Spalte vergleichen) und **eine** Buying-Center-Sektion in `overview` rendern. Tote Komponente entfernen bzw. als reine Unterkomponente einbinden.
3. **Signal-Strip:** Die `marketSignals.accountNews`-Karte aus der Strategy-Tab heraus in einen **prominenten Streifen im Header** (über den Tabs) heben: jüngstes Signal + Quelle + CTA **„mit Beweis reagieren"** → `ROUTES.matchWithDeal` bzw. Smart Match mit Account-Kontext. Bei 0 Signalen: dezenter Leerzustand, kein leerer Block.
4. `initialTab`-Param-Whitelist und `activeTab`-Union in `account-detail-client.tsx` auf die neuen 3 Werte anpassen; alte Query-Werte (`mission_control`/`buying_center`/`pipeline`/`proof_points`) auf die neuen mappen (Deep-Link-Kompatibilität).

## T2 — Proof-Coverage je Deal (die Proof-Linse, Kern)

**Datenmodell** — Deals haben heute **keine** Entscheidungskriterien. Minimal-invasiv:

```sql
-- Migration: deal_requirements (n Kriterien je Deal)
create table public.deal_requirements (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,                 -- z. B. „ISO 27001 / Security"
  sort_order int not null default 0,
  created_at timestamptz default now()
);
-- RLS analog deals (organization_id = current_user_organization_id())
create index on public.deal_requirements(deal_id);
```

- Kriterien kommen entweder **manuell** (kurze Liste am Deal) **oder** aus einem RFP-Import (falls vorhanden den RFP-Pfad wiederverwenden — nicht doppelt bauen).
- **Coverage berechnen:** je `label` die **bestehende** semantische Suche (`matchReferences`, org-gescopt, nur freigegebene/sichtbare Referenzen) aufrufen → bester Treffer + Score. Schwelle (z. B. ≥ X) = ✓ belegt, sonst ⚠ Lücke. **Keine** neue Heuristik bauen.
- **UI:** In der `deals`-Tab je aktivem Deal eine **Coverage-Matrix** (Anforderung · bester Beweis · Score · ✓/⚠) — die Komponente aus `match-rfp-client.tsx` als Vorlage/Extraktion wiederverwenden. ⚠-Zeile bietet „Referenz anfragen".
- Sichtbarkeit: Coverage nur über RLS-erlaubte Referenzen rechnen (kein Leak vertraulicher Entwürfe an Sales).

## T3 — Champion-Kit (letzte Meile, Wiederverwendung)

- Der Champion ist im Buying Center bereits identifiziert. Button **„Champion-Kit"** am Deal → bündelt die in T2 als ✓ ermittelten besten Referenzen zu einem teilbaren Portfolio.
- **Wiederverwenden**, nicht neu bauen: bestehenden Share-/Portfolio-Flow + `app/api/public-portfolio-pdf` bzw. `reference-onepager-pptx`. Kein neuer Export-Pfad.

## T4 — Proof-Points mit echtem Match statt Heuristik

- In `account-detail-proof-points-tab.tsx` die `matchScore`-Heuristik durch die echte Embedding-Suche ersetzen (oder den Fit als „grobe Schätzung" klar kennzeichnen, bis die Suche serverseitig vorberechnet ist). Mindestens den Inline-Link auf **„Smart Match"** (statt „Match") ziehen.

---

## Out of Scope

- Keine **volle** MEDDPICC-Pflichtfelder/Scoring (das war Option B — bewusst nicht).
- Kein Umbau der Smart-Match-Seite (eigenes Zielbild, nur Rename).
- Wissens-Erhalt/Account-Gedächtnis → eigenes Paket [[arbeitspaket-wissens-erhalt-account-gedaechtnis]] (T2 dieses Pakets liefert dafür die `deal_requirements`-Basis).

## Risiken

- **Sichtbarkeit:** Coverage darf nur RLS-erlaubte Referenzen sehen — Sales-Rep-Sicht testen (keine Entwürfe).
- **Performance:** Coverage = n Anforderungen × Match-Call. Pro Deal cachen (z. B. `unstable_cache` mit `organization_id`+`deal_id` im Key) und nur bei aktivem Deal-Tab rechnen; nicht im Account-Erstrender blockieren (Suspense/Streaming).
- **Deep-Links:** Alte `?tab=`-Werte müssen weiter funktionieren (T1.4).
- **Embedding-Cache-Key** (falls berührt): bleibt `SHA256(model + finaler Query-Text)` — **kein** orgId/dealId in den Embedding-Key (Mandanten-Filter passiert in der RPC).

## Verifikation

- `npm run typecheck` + `npm test` grün; neue RLS-Policy für `deal_requirements` mit Test (fremde Org sieht nichts).
- Klick-Test je Rolle (Dev-Role-Switcher): Sales-Rep sieht in Coverage keine vertraulichen Referenzen.
- Account mit 0 Signalen / 0 Deals / 0 Referenzen → saubere Leerzustände (Proof over Promise, keine Fake-Coverage).
- Screenshot vorher/nachher der Account-Detailseite.

---

## Cursor-Prompt

> Setze `docs/arbeitspaket-accounts-proof-linse.md` um, in dieser Reihenfolge als getrennte Commits: **T1** (Entschachtelung 4→3 Tabs + Buying-Center-Konsolidierung + Signal-Strip, reines Frontend), **T2** (Migration `deal_requirements` + RLS + Coverage über die bestehende `matchReferences` + Coverage-Matrix-UI aus `match-rfp-client.tsx` wiederverwendet), **T3** (Champion-Kit über bestehenden Portfolio-/Share-Flow), **T4** (Proof-Points echter Match). Baue MEDDPICC und Buying Center **nicht neu** — sie existieren bereits (`strategyFields`, `company_strategies`, Buying-Center-Rollen); konsolidiere und verbinde sie nur. Achte auf RLS-Sichtbarkeit (keine vertraulichen Referenzen für Sales), cache die Coverage pro Deal, und halte alte `?tab=`-Deep-Links über ein Mapping am Leben. Nach jedem T: `npm run typecheck` + `npm test`. Stopp nach T1 und zeig mir einen Screenshot, bevor du T2 startest.
