# Arbeitspaket: Globaler Rename — „Finden" → Smart Match, „Evidence" → Referenzen/references

**Quelle:** Produktentscheidung (Julien, Juni 2026). Konsistentes Wording vor dem Accounts-Umbau.
**Zweck:** App-Layer und Routen an die Zielbegriffe angleichen — **mechanisch, verhaltenserhaltend**, mit Redirects für Altlinks.

---

## Vorab lesen
- `docs/ai-coding-agent-guide.md`
- `lib/copy.ts` (zentrale UI-Labels), `lib/routes.ts` (zentrale Routen), `middleware.ts`

## Ist-Stand (verifiziert)
- **Display-Labels** liegen zentral in `lib/copy.ts`:
  - `nav.match = 'Finden'`, `pages.match = 'Finden'` → Ziel **„Smart Match"**.
  - `nav.evidence = 'Referenzen'`, `pages.evidence = 'Referenzen'` → **bereits korrekt** (kein Display-Change nötig).
- **Routen/Code** liegen zentral in `lib/routes.ts`:
  - `ROUTES.match = '/dashboard/match'`, `ROUTES.matchWithDeal(dealId)`.
  - `ROUTES.evidence.{root,new,newBulk,detail,edit} = '/dashboard/evidence/…'`.
- **Ordner:** `app/dashboard/match/*`, `app/dashboard/evidence/*` (inkl. `new/`, `[id]/`, `[id]/edit/`).
- **DB:** Die Tabelle heißt **bereits** `public.references` (siehe `deal_references.reference_id → references(id)`). Der App-Layer („evidence") hinkt also nur dem DB-Namen hinterher — der Rename **gleicht an**, er erfindet nichts.
- **Event-Log:** Tabelle `evidence_events` (event_type-Enum mit `share_link_viewed`, `reference_shared`, …). **Nicht umbenennen** (siehe Out of Scope).

---

## T1 — Display + Routen + Redirects (nutzer­sichtbar, Haupthebel)

1. **Label:** in `lib/copy.ts` `nav.match` und `pages.match` von `'Finden'` auf `'Smart Match'` setzen. Sonst nichts an copy.ts (Referenzen-Labels stimmen schon).
2. **Routen in `lib/routes.ts`:**
   - `match: '/dashboard/smart-match'`, `matchWithDeal` analog auf `/dashboard/smart-match?deal=…`.
   - `evidence.root/new/newBulk/detail/edit` auf `/dashboard/references/…` umstellen. **Key-Name `evidence` im ROUTES-Objekt vorerst beibehalten** (nur der Pfad-String ändert sich) → minimiert Diff. Optionaler Key-Rename `evidence → references` in T2.
3. **Ordner verschieben** (Git-aware, `git mv`):
   - `app/dashboard/match/` → `app/dashboard/smart-match/`
   - `app/dashboard/evidence/` → `app/dashboard/references/` (inkl. `new/`, `[id]/`, `[id]/edit/`).
4. **Harte Pfad-Literale** finden und auf `ROUTES.*` umstellen (nicht erneut hart kodieren):
   - `rg -n "/dashboard/match|/dashboard/evidence" --glob '!docs/**'`
   - Prüfen: `middleware.ts` (öffentliche/geschützte Pfade), `next.config.*`, Server Actions mit `revalidatePath('/dashboard/evidence' | '/dashboard/match')`.
5. **Redirects** (Altlinks aus Bookmarks, internen Mails, Verlauf) in `next.config.ts`:
   ```ts
   async redirects() {
     return [
       { source: '/dashboard/match', destination: '/dashboard/smart-match', permanent: false },
       { source: '/dashboard/match/:path*', destination: '/dashboard/smart-match/:path*', permanent: false },
       { source: '/dashboard/evidence', destination: '/dashboard/references', permanent: false },
       { source: '/dashboard/evidence/:path*', destination: '/dashboard/references/:path*', permanent: false },
     ]
   }
   ```
   `permanent: false` (307), bis der Rename stabil ist; später auf `true` (308) heben.
6. **Restweite Display-Strings** prüfen: `rg -n "Finden"` (außer `docs/`) — z. B. das `Match`-Inline-Link-Label im Proof-Points-Tab (`app/dashboard/.../company-detail-proof-points-tab.tsx`, „für semantische Treffer die Suche unter **Match**") auf „Smart Match" ziehen.

## T2 — Interne Identifier (mechanische Nacharbeit, optional aber „global")
Nur Code-Hygiene, **keine** Verhaltensänderung — separater Commit:
- ROUTES-Key `evidence` → `references` (dann alle `ROUTES.evidence.*`-Aufrufe nachziehen; `rg -n "ROUTES.evidence"`).
- Modul-/Dateinamen: `lib/evidence/*`, `app/dashboard/references/evidence-client.tsx`, `evidence-onboarding-empty-state.tsx`, `columns.tsx`/`data-table.tsx`-interne Bezeichner → `reference(s)-*`.
- Komponenten-/Variablennamen `Evidence*`/`evidence*` → `Reference*`/`reference*`.
- `COPY.nav.evidence`-Key → `references` (Aufrufer nachziehen).
> T2 ist rein optisch im Code. Wenn Zeit knapp ist, reicht T1 für den Nutzer vollständig.

---

## Out of Scope (bewusst)
- **DB-Tabelle `evidence_events` NICHT umbenennen.** Internes Event-Log, in RPCs/Triggern/Policies verdrahtet; ein Rename ist eine risikoreiche Daten-Migration ohne Nutzerwert. Name bleibt, ein Kommentar dokumentiert das.
- **Öffentliche Share-Route `/p/[slug]`** ist nicht betroffen (separater, öffentlicher Pfad) — externe Links bleiben gültig.
- Keine inhaltlichen Änderungen an Match- oder Referenz-Seiten (separate Pakete).

## Risiken
- **Deep-Links/Tab-Query** (`?tab=`, `?deal=`) müssen über die Redirects erhalten bleiben → in Verifikation testen.
- **Doppelte Quelle der Wahrheit:** Wenn irgendwo Pfade hart kodiert sind statt `ROUTES.*`, brechen sie still. Daher Schritt T1.4 (rg) zwingend.
- `revalidatePath`/`revalidateTag` mit altem Pfad → Cache-Invalidierung läuft ins Leere. Alle Vorkommen prüfen.

## Verifikation
- `npm run typecheck` und `npm test` grün.
- `rg -n "Finden"` und `rg -n "/dashboard/(match|evidence)\b" --glob '!docs/**' --glob '!next.config.*'` liefern **keine** Treffer mehr (außer den Redirect-Quellen).
- Klick-Test: Sidebar „Smart Match" + „Referenzen", Referenz-Detail, `…/new`, Deal-Kontext-Match (`?deal=`), alte URL `/dashboard/evidence/<id>` leitet auf `/dashboard/references/<id>`.

---

## Cursor-Prompt
> Setze das Arbeitspaket `docs/arbeitspaket-rename-smart-match-references.md` um. Beginne mit **T1** (Display + Routen + Ordner + Redirects), in **einem** Commit, verhaltenserhaltend. Nutze `git mv` für Ordner, stelle alle harten Pfad-Literale auf `ROUTES.*` um und ergänze die Redirects in `next.config.ts`. Benenne die DB-Tabelle `evidence_events` **nicht** um. Danach `npm run typecheck` + `npm test`, und führe die rg-Checks aus der Verifikation aus; liste verbliebene Treffer auf. **T2** (interne Identifier) erst nach grünem T1 als separaten Commit — frag vorher kurz nach, ob ich T2 jetzt will.
