# Arbeitspaket: Wissens-Erhalt — Account-Gedächtnis (Beweis-Historie + Outcome-Capture)

**Quelle:** Kollegen-Feedback („Wissen erhalten, wenn Leute die Firma verlassen"). Entscheidung Julien: **jetzt mit rein**. Deckt Guardrail **Data Compounds**.
**Zweck:** Das institutionelle Beweis-Wissen eines Accounts **personen-unabhängig** sichtbar machen — es ist (fast) vollständig schon in den Daten, wird nur nicht zurückgespielt.

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md`
- `supabase/migrations/20250224100000_deals_and_deal_references.sql` (`deals`, `deal_references`)
- `supabase/migrations/20260416170000_epic15_event_tracking.sql` (`evidence_events`, u. a. `share_link_viewed`, `reference_shared`)
- `app/dashboard/accounts/account-detail-proof-points-tab.tsx` (künftiger Ort der Historie)

## Grundprinzip

Kein neues System — **Surfacing** vorhandener Daten, **account-/org-gescopt** statt rep-gescopt:

- `deal_references` (welche Referenz an welchem Deal) + `deals.status` (won/lost) + `evidence_events` (geteilt / geöffnet) liegen bereits vor und sind über `organization_id`/`company_id` an den Account gebunden — sie überstehen einen Rep-Wechsel automatisch.
- Es fehlt nur: (a) das **Zurücklesen** als Account-Gedächtnis und (b) **ein** Feld, das das „Warum" beim Abschluss festhält.

## Zielbild

```
Referenzen-Tab des Accounts
┌ Was hier funktioniert hat ─────────────────────────────────────────┐
│ • „Cloud-Migration FinanzCorp"  → 3 Deals, 2 gewonnen, 9 Öffnungen  │
│ • „Managed Services MetroBank"  → 1 Deal gewonnen, entscheidend     │
├ Beweis-Historie (account-weit, personenunabhängig) ────────────────┤
│ 12.05.  Referenz X an Deal „PharmaX" geteilt · 3× geöffnet          │
│ 02.04.  Deal „Beta AG" gewonnen — entscheidend: Referenz Y          │
└────────────────────────────────────────────────────────────────────┘
```

## T1 — Outcome-Capture (Schema + Erfassung beim Abschluss)

**Schema** (additiv, minimal):

```sql
alter table public.deals
  add column if not exists outcome_reason text,
  add column if not exists decisive_reference_id uuid
    references public.references(id) on delete set null;
```

- **Erfassung:** Wenn ein Deal auf `won`/`lost` gesetzt wird, ein leichtgewichtiger Dialog: „Warum gewonnen/verloren?" (Freitext) + „Welcher Beweis war entscheidend?" (Select aus den **bereits verknüpften** `deal_references`). Beides optional, ein Klick überspringbar (kein Pflicht-Gate → Adoption).
- `decisive_reference_id` muss auf eine mit dem Deal verknüpfte Referenz zeigen (validieren).

## T2 — Account-Gedächtnis zurücklesen (Read-Only, Hauptnutzen)

Server-seitiger Loader, org-/account-gescopt (RLS), für die Referenzen-Tab:

1. **„Was hier funktioniert hat":** Aggregat über alle Deals der `company_id` → je Referenz: Anzahl Deals, gewonnene Deals, Öffnungen (`evidence_events` Typ `share_link_viewed`), Markierung „entscheidend" (aus `decisive_reference_id`). Sortiert nach Wirkung.
2. **Beweis-Historie:** chronologische Liste aus `deal_references` (geteilt) + `evidence_events` (geöffnet/mehrfach) + Deal-Outcomes (gewonnen mit Referenz Z). Nur Account-Bezug, **keine** rep-private Filterung — das ist der Punkt: der Nachfolger sieht alles.
3. Einbau als zwei Karten in der **Referenzen-Tab** (kein neuer Tab — Entschachtelungsziel bleibt gewahrt). Optional eine 1-Zeilen-Verdichtung „zuletzt gewonnen mit Beweis X" in der Überblick-Tab.

## T3 — Sichtbarkeit & Ownership absichern

- Loader liest über `organization_id`/`company_id`, **nicht** über `account_manager_id` → Wissen ist org-eigen, nicht rep-eigen (Kernanforderung „wenn Leute gehen").
- RLS-Sichtbarkeit der Referenzen respektieren (vertrauliche Entwürfe nicht an Sales leaken — analog Proof-Linse).
- Wenn ein Rep deaktiviert/entfernt wird, bleibt die Historie am Account erhalten (FKs `on delete set null` bei User-Referenzen prüfen — `deals.account_manager_id` ist bereits `on delete set null`).

---

## Out of Scope

- Keine Volltext-/Notiz-Archivierung des gesamten Account-Wissens (RefStack ist nicht das System of Record) — **nur die Beweis-/Outcome-Ebene**.
- Keine Analytics-/Insights-Seite (pausiert).
- Kein Export/Reporting in dieser Iteration.

## Risiken

- **Datenarmut Pre-Pilot:** Bei wenigen Deals/Events ehrlicher Leerzustand statt erfundener Historie (Proof over Promise).
- **Doppelzählung** von Events vermeiden (ein Share + n Views sauber trennen).
- Performance: Aggregat je Account cachen (Key mit `organization_id`+`company_id`), nicht pro Render neu berechnen.

## Verifikation

- `npm run typecheck` + `npm test` grün; Migration additiv (keine Daten-Verluste).
- Test: Deal auf `won` mit entscheidender Referenz → erscheint in „Was hier funktioniert hat".
- Test: Rep-Wechsel simulieren (account_manager_id auf NULL) → Historie bleibt vollständig am Account sichtbar.
- Fremd-Org sieht nichts (RLS).

---

## Cursor-Prompt

> Setze `docs/arbeitspaket-wissens-erhalt-account-gedaechtnis.md` um, getrennte Commits: **T1** (additive Migration `deals.outcome_reason` + `deals.decisive_reference_id` + optionaler Capture-Dialog beim Statuswechsel auf won/lost, überspringbar), **T2** (org-/account-gescopter Read-Loader → zwei Karten „Was hier funktioniert hat" + „Beweis-Historie" in der Referenzen-Tab), **T3** (Sichtbarkeit/Ownership absichern: über organization_id/company_id lesen, nicht account_manager_id; RLS für vertrauliche Referenzen respektieren). Baue **kein** neues Tracking — nutze `deal_references` und `evidence_events`, die es schon gibt. Ehrliche Leerzustände bei dünnen Daten. Nach jedem T: `npm run typecheck` + `npm test`. Schreib einen Test, der den Rep-Wechsel (account_manager_id = NULL) simuliert und prüft, dass die Historie am Account erhalten bleibt.
