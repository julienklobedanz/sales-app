# Arbeitspaket: App-Layer- & Integrationstests (Engineering E3)

**Quelle:** Engineering-Audit E3. Schließt die Coverage-Lücke an der Datenschicht.
**Zweck:** Tests dort, wo die realen Bugs entstehen (Server-Actions, RLS/Sichtbarkeit, Auth, Import) — nicht nur Pure-Logic in `lib/`.

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md`; Test-Muster: `lib/**/*.test.ts` (vitest, `environment: 'node'`).
- **Synergie E7:** `supabase/config.toml` + `npm run db:migrate:check` (db reset) existieren → lokaler Supabase-Stack für Integrationstests verfügbar.

---

## Ist-Stand (verifiziert)

- vitest-Coverage `include` nur `lib/**` → `app/` (Server-Actions/Routen) ist **nicht** abgedeckt.
- ~60 Testdateien, alle Pure-Logic; **kein** Supabase-Test-Harness.
- Genau die untypisierten/​RLS-/Auth-Pfade in `app/` sind ungetestet — dort entstand u. a. der Welle-5-role-Drift.

---

## T1 — Coverage & Harness

**Soll:**

- vitest `coverage.include` um `app/**` erweitern (Sichtbarkeit der Lücke).
- Test-Harness wählen (zwei Ebenen):
  - **Unit** für extrahierbare Logik (siehe T2) — bestehendes Muster.
  - **Integration** gegen lokalen Supabase-Stack (`supabase start` / `db reset` aus E7), minimal geseedet, für RLS-/Auth-abhängige Pfade.
    **Akzeptanz:** Coverage zeigt `app/`; ein Smoke-Integrationstest läuft gegen lokalen Stack (lokal + optional CI).

---

## T2 — Pure-Logik aus Server-Actions extrahieren & unit-testen

**Soll:** Aus großen Actions die Entscheidungs-/Mapping-Logik in reine Funktionen (`lib/…`) ziehen und testen (zahlt zugleich auf E5 ein). Priorität:

- Referenz-**Sichtbarkeit**/Capability-Gating (W2),
- Approval-**Statusmaschine** (intern→Kunde, Ablehnung/Änderung),
- **Match**-Scoring/Schwellwerte,
- **Import**-Validierung/Mapping.
  **Akzeptanz:** je Bereich gezielte Unit-Tests auf der extrahierten Logik.

---

## T3 — Integrationstests für sicherheitskritische Pfade

**Soll:** Gegen den lokalen Stack, je ein Test pro kritischem Flow:

- **RLS-Sichtbarkeit:** sales_rep sieht keine Entwürfe/NDA; AM/Admin schon (verhindert Regress des W2-Lochs).
- **Auth-Gating:** Server-Actions weisen nicht-berechtigte Rollen ab.
- **Approval-Flow** end-to-end (intern→Kunde, Token).
- **Mandanten-Isolierung:** Org A sieht keine Daten von Org B.
  **Akzeptanz:** diese Flows sind durch Tests abgesichert; rot bei Regress.

---

## T4 — CI

**Soll:** Integrationstests in CI (eigener Job mit Supabase-Stack, analog E7-`db-migrations`) oder als markierte Suite, die nightly/auf main läuft (falls zu langsam für jeden PR).
**Akzeptanz:** kritische Pfade laufen automatisiert; Strategie dokumentiert.

---

## Reihenfolge

T1 (Harness) → T2 (Pure-Logik, schnelle Gewinne) → T3 (Integration, höchster Sicherheitswert) → T4 (CI). Priorität bei T3 auf RLS/Auth/Mandanten-Isolierung.

## Verifikation

```bash
npm run test && npm run typecheck && npm run build
```

- Bewusst eingebauter RLS-Regress (z. B. sales sieht Entwurf) muss einen Test **rot** machen.
