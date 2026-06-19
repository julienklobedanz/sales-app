# Arbeitspaket: Logging & Error-Handling (Engineering E6)

**Quelle:** Engineering-Audit E6. Observability vor dem Pilot.
**Zweck:** Ad-hoc-Logging/Fehlerbehandlung durch ein zentrales, strukturiertes Muster ersetzen.

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md`.
- Ist-Stand `[verifiziert]`: **108** `console.error/warn/log`, **163** catch-Blöcke, **kein** zentrales Logger-/Error-Modul.

---

## T1 — Zentrales Logging-Util

**Soll:** `lib/observability/logger.ts` — strukturiertes Logging mit Level (`debug|info|warn|error`), Kontext-Feldern (z. B. `organizationId`, `userId`, `action`), und einer Stelle, an der später ein Sink (z. B. Vercel/Logflare/Sentry) angebunden werden kann. Sensible Felder redacten.
**Akzeptanz:** Logger existiert; ein Sink-Anschluss ist vorbereitet (eine Funktion, nicht 108 verstreute `console.*`).

---

## T2 — Einheitliche Server-Action-Fehler (`Result`-Konvention)

**Soll:** Eine typisierte `Result<T>`-Konvention (`{ ok: true, data } | { ok: false, error }`) für Server-Actions etablieren (viele geben heute uneinheitlich `{ error }`/werfen/loggen). Fehler **einmal** zentral loggen (T1) statt verstreut.
**Akzeptanz:** Konvention dokumentiert (`ai-coding-agent-guide.md`); als Helfer verfügbar; neue/berührte Actions nutzen sie.

---

## T3 — Migration der heißen Pfade (schrittweise)

**Soll:** Die 108 `console.*` / 163 catch-Blöcke **nicht** in einem Rutsch, sondern:
- neue/berührte Dateien sofort auf Logger + `Result` umstellen (Boy-Scout),
- die sicherheits-/fehlerträchtigen Pfade zuerst (Auth, Approval, Import, CRM-Sync, Cron).
**Akzeptanz:** heiße Pfade migriert; `console.*` in App-Code rückläufig; Konvention greift für Neues.

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
