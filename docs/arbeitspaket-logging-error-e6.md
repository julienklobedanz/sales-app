# Arbeitspaket: Logging & Error-Handling (Engineering E6)

**Quelle:** Engineering-Audit E6. Observability vor dem Pilot.
**Zweck:** Ad-hoc-Logging/Fehlerbehandlung durch ein zentrales, strukturiertes Muster ersetzen.
**Inventar:** `docs/tech-debt-inventar.md` (Result-Konvention entschieden 2026-08-04).

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md`.
- Ist-Stand `[verifiziert 2026-08-04]`: ~119 `console.*` in App-Code, Logger existiert (~11 Importe), `result.ts` Helpers auf `{ success }` umgestellt.

---

## T1 — Zentrales Logging-Util

**Soll:** `lib/observability/logger.ts` — strukturiertes Logging mit Level (`debug|info|warn|error`), Kontext-Feldern (z. B. `organizationId`, `userId`, `action`), und einer Stelle, an der später ein Sink (z. B. Vercel/Logflare/Sentry) angebunden werden kann. Sensible Felder redacten.
**Akzeptanz:** Logger existiert; ein Sink-Anschluss ist vorbereitet (eine Funktion, nicht verstreute `console.*`).
**Status:** ✅ erledigt.

---

## T2 — Einheitliche Server-Action-Fehler (`Result`-Konvention)

**Soll:** Typisierte Result-Konvention **`{ success: true; data? } | { success: false; error }`** (de-facto-Standard der Actions, nicht `{ ok }`). Helfer in `lib/observability/result.ts`: `ok()`, `err()`, `fail()` (loggt einmal zentral).
**Akzeptanz:** Konvention dokumentiert (`ai-coding-agent-guide.md` + Inventar); Helpers verfügbar; neue/berührte Actions nutzen sie.
**Status:** ✅ Shape + Docs angeglichen (2026-08-04). Adoption in Actions = Boy-Scout / T3.

---

## T3 — Migration der heißen Pfade (schrittweise)

**Soll:** Die ~119 `console.*` **nicht** in einem Rutsch, sondern:
- neue/berührte Dateien sofort auf Logger + `Result` (`success`) umstellen (Boy-Scout),
- die sicherheits-/fehlerträchtigen Pfade zuerst (Auth, Approval, Import, CRM-Sync, Cron).
**Akzeptanz:** heiße Pfade migriert; `console.*` in App-Code rückläufig; Konvention greift für Neues.
**Status:** ⏳ offen.

---

## Reihenfolge

T1 (Util) → T2 (Result-Konvention) → T3 (schrittweise Migration, heiße Pfade zuerst). Verhaltenserhaltend; Tests grün.

## Verifikation
```bash
npm run typecheck && npm test && npm run build
```
- Stichprobe: ein provozierter Fehler in einem migrierten Pfad erzeugt **einen** strukturierten Log-Eintrag (nicht mehrere verstreute) + ein `Result`-Fehlerobjekt.

---

## Hinweis

Niedrigste Dringlichkeit der Engineering-Reihe, aber hoher Wert **im Pilotbetrieb** (Debugging/Observability bei echten Nutzern). Gut parallel zu E5 umsetzbar (beim Zerlegen gleich auf Logger/Result umstellen).
