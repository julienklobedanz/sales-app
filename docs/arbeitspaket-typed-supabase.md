# Arbeitspaket: Typisierter Supabase-Zugriff (Engineering E1 + E2)

**Quelle:** Engineering-Audit (Vault) — höchster Hebel. Wurzel der role-Spalten-Drift aus Welle 5.
**Zweck:** Den gesamten Datenzugriff typsicher machen, sodass Schema-/Spalten-Drift vom **Compiler und CI** gefangen wird — nicht erst zur Laufzeit.
**Charakter:** Fundament-Refactor, schrittweise (Strangler). Verhaltenserhaltend.

---

## Vorab lesen (für die Coding-Session)

- **Konventionen:** `docs/ai-coding-agent-guide.md`.
- Aktueller Stand `[verifiziert 2026-08-06]`: `tsconfig` `strict: true`; `lib/database.types.ts` + `db:types`/`typecheck`; Clients mit `Database`-Generic; Domänen-Casts weitgehend abgebaut (T3); **T4** CI-Gate scharf (`npm run typecheck` vor Test/Build in `.github/workflows/ci.yml`).
- **Code vor Edit lesen**; **Vault nicht** heranziehen.

---

## Ziel

`supabase.from('x').select(...)` liefert **typisierte** Rows; `.select('…nicht_existent')` und Writes auf nicht-existente Spalten werden zu **Compile-Fehlern**. Die 273 `as { … }`-Casts werden schrittweise überflüssig.

---

## T1 — Typen generieren + Workflow einrichten

**Soll:**

1. `database.types.ts` generieren (Supabase CLI):
   ```bash
   npx supabase gen types typescript --project-id <PROJECT_ID> --schema public > lib/database.types.ts
   # oder lokal: --local statt --project-id
   ```
2. npm-Scripts ergänzen:
   ```json
   "db:types": "supabase gen types typescript --project-id <PROJECT_ID> --schema public > lib/database.types.ts",
   "typecheck": "tsc --noEmit"
   ```
3. `lib/database.types.ts` committen (generierte Datei; bei Schema-Änderung neu erzeugen — Konvention in `docs/ai-coding-agent-guide.md` ergänzen).
   **Akzeptanz:** `lib/database.types.ts` existiert; `npm run db:types` reproduziert sie; `npm run typecheck` läuft.

---

## T2 — Clients typisieren

**Soll:** Den `Database`-Generic in alle drei Clients einziehen:

```ts
import type { Database } from '@/lib/database.types'
// client.ts
createBrowserClient<Database>(url, anon)
// server.ts
createServerClient<Database>(url, anon, { cookies… })
// service-role.ts
createClient<Database>(url, serviceKey, { … })
```

**Akzeptanz:** Alle Clients sind generisch typisiert; `npm run typecheck` zeigt jetzt die echten Typfehler an den Aufrufstellen (erwartet — Grundlage für T3).

---

## T3 — Typfehler abarbeiten + Casts entfernen (schrittweise)

**Soll:** Die durch T2 aufgedeckten Fehler clusterweise beheben:

- `.select('…')`-Strings korrigieren (keine nicht-existenten Spalten),
- `as { … }`-Casts durch die generierten Row-Typen ersetzen (`Tables<'references'>` etc.),
- pro Domäne ein PR (references/evidence, deals, accounts, market-signals, settings/roles, deal-desk, api-routes).
  **Strangler:** T3 muss nicht in einem PR fertig sein. Solange `typecheck` noch nicht 0 ist, **nicht** in CI als Blocker schalten (siehe T4) — erst clusterweise grün machen.
  **Akzeptanz:** Sukzessive 0 `typecheck`-Fehler; Anzahl `as { … }`-Casts deutlich reduziert (Ziel: nur noch dort, wo wirklich nötig).

---

## T4 — CI-Gate aktivieren ✅

**Soll:** In `.github/workflows/ci.yml` einen `typecheck`-Schritt **vor** dem Build ergänzen — erst **scharf schalten**, wenn T3 org-weit 0 Fehler erreicht hat (sonst rot). Optional: separater CI-Job, der Migrationen gegen eine Wegwerf-/lokale DB anwendet (fängt SQL-/Schema-Fehler vor Prod).

**Erledigt (2026-08-06):** `lint-and-build` führt `npm run typecheck` **scharf** (kein `continue-on-error`) **vor** Test/Build aus; Migrations-Job existiert separat (`db-migrations`, E7).  
**Akzeptanz:** CI bricht bei Spalten-/Schema-Drift ab (`tsc --noEmit`); grüner Lauf auf `main`.

---

## Reihenfolge & Sicherheit

1. T1 (Typen + Scripts) → T2 (Clients generisch) → T3 (clusterweise Fehler/Casts) → T4 (CI-Gate scharf).
2. Verhaltenserhaltend: keine Logikänderung, nur Typen/Selects. Tests müssen grün bleiben.
3. Bei Schema-Änderungen ab jetzt: **erst** `db:types` neu generieren, **dann** Code anpassen, **dann** migrieren/droppen (verhindert den Welle-5-Schmerz).

## Verifikation

```bash
npm run db:types     # reproduzierbar
npm run typecheck    # Zielzustand: 0 Fehler
npm run test         # grün
npm run build        # grün
```

- Stichprobe: ein bewusst falscher Spaltenname in einem `.select(...)` muss `typecheck` **rot** machen (Beweis, dass das Gate greift).

---

## Wirkung

Schließt die Fehlerklasse, die in Welle 5 zur role-Drift-Nacharbeit führte, dauerhaft — und sichert alle künftigen Schema-Änderungen (gerade relevant vor der Pilotphase) compiler- und CI-seitig ab.
