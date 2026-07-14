# Arbeitspaket: Perf-8 — Evidence-Loader-Wasserfall parallelisieren

**Quelle:** Symptom „Referenzliste lädt langsam" → Code-Diagnose. Perf-3-Muster, das den Evidence-Loader übersehen hatte.
**Zweck:** Den sequenziellen Query-Wasserfall in `getDashboardDataImpl` beseitigen. **Eine** Datei, verhaltenserhaltend.

---

## Vorab lesen
- `docs/ai-coding-agent-guide.md`.
- Kontext: Referenz-Zeilen sind bereits gecacht (`getCachedOrgReferenceRows`, Perf-2). Das Problem sind die **nachgelagerten** Enrichment-Queries.

## Ist-Stand (verifiziert) — `lib/evidence/dashboard.ts`, `getDashboardDataImpl`
Nach den gecachten Referenz-Zeilen (Z. 44) laufen **vier Queries streng sequenziell** (Wasserfall):
| Zeile | Query | Cachebar? |
|------|-------|-----------|
| 49 | `favorites` (user-spezifisch) | nein (pro User) |
| 138 | `shared_portfolios` (`reference_ids, view_count`) | **nein** — Tabelle hat **keine** `organization_id` |
| 151 | `deal_references` (`reference_id`) | **nein** — Join-Tabelle, **keine** `organization_id` |
| 167 | `references` deleted-count (`count: 'exact'`) | ja (hat `organization_id`-Filter) |

Diese vier sind **voneinander unabhängig** — die JS-Verarbeitung (Mapping, Maps) passiert erst danach. Sequenziell = aufsummierte Roundtrips; durch Perf-7-Streaming jetzt sichtbar (Skeleton → Daten).

---

## T1 — Parallelisieren (Haupthebel)
**Soll:** Die unabhängigen Fetches in **einem** `Promise.all` bündeln, dann erst die JS-Verarbeitung:
```ts
const [rows, favRows, portfolioRows, dealRefRows, deletedCountRes] = await Promise.all([
  getCachedOrgReferenceRows(orgId),
  user ? supabase.from('favorites').select('reference_id').eq('user_id', user.id) : Promise.resolve({ data: null }),
  supabase.from('shared_portfolios').select('reference_ids, view_count'),
  supabase.from('deal_references').select('reference_id'),
  supabase.from('references').select('id', { count: 'planned', head: true })
    .eq('organization_id', orgId).not('deleted_at', 'is', null),
])
// danach: bestehendes Mapping/Enrichment unverändert
```
- **Session-Client (RLS) beibehalten** für `shared_portfolios`/`deal_references`/`favorites` — kein Service-Role, kein Tenant-Risiko.
- `deleted-count`: `count: 'exact'` → **`'planned'`** (Trash-Indikator, Größenordnung reicht; Kommentar setzen).
**Akzeptanz:** die vier Queries laufen **gleichzeitig** (kein Wasserfall); identische Anzeige/Counts; Referenzliste spürbar schneller.

## T2 — (optional, Skalierung) Aggregate auf Org-Referenzen scopen
**Hinweis, nicht Pflicht:** `shared_portfolios`/`deal_references` werden aktuell **ohne** Scoping geladen (volle Tabelle, nur RLS). Bei wachsenden Daten: auf die Referenz-IDs der Org eingrenzen (`.in('reference_id', orgRefIds)` bzw. `.overlaps('reference_ids', orgRefIds)`). **Aber:** das erzeugt eine Abhängigkeit von `rows` → würde T1 teilweise re-sequenzialisieren. Bei aktueller Datenmenge **nicht nötig** — als Kommentar/Follow-up vermerken, nicht umsetzen.

---

## Out of Scope
- `shared_portfolios`/`deal_references` per Service-Role cachen (keine `organization_id` → nicht sauber org-filterbar).
- Andere Loader (dashboard-home wurde in Perf-3 bereits parallelisiert).
- Streaming/Suspense (Perf-7, erledigt).

## Risiken
- `Promise.all`: bei Fehler einer Teil-Query bricht alles — bestehendes Fehlerverhalten (die Queries ignorieren heute `error` weitgehend) beibehalten; wo nötig `Promise.allSettled` oder die einzelnen `{ data }`-Destrukturierungen wie gehabt.
- `count: 'planned'` ist eine Schätzung — nur für den Trash-Indikator, nicht für fachlich exakte Werte.

## Verifikation
```bash
npm run typecheck && npm test && npm run build
npm run test:integration   # tenant-isolation grün
```
- Perf-1-Timing/Server-Timing bzw. TTFB der Evidence-Daten vor/nach: deutlich kürzer (Wasserfall → parallel).
- Referenzliste, Favoriten, Share-/Deal-Counts, Trash-Indikator unverändert.
