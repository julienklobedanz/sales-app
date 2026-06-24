# Arbeitspaket: Perf-1 — Messung / Instrumentierung

**Quelle:** Performance-Audit (Vault) P7. **Zuerst** umsetzen — macht die Wirkung aller anderen Perf-Pakete belegbar.
**Zweck:** „Blitzschnell" messbar machen: die North-Star-Metrik **Time-to-Evidence** und die Latenz der heißen Pfade erfassen.

---

## Vorab lesen
- `docs/ai-coding-agent-guide.md` (inkl. §3.1.1 Observability/E6).
- Baustein vorhanden: `lib/observability/logger.ts` (strukturiertes Logging) — darauf aufsetzen.

## Ist-Stand (verifiziert)
- Events existieren (`evidence_events`: `reference_matched`, `reference_exported`, …), aber **keine Latenz/Dauer** wird erfasst → „schnell" ist nicht steuerbar.

## Aufgaben
- **T1 — Timing-Helfer:** kleine Utility (z. B. `lib/observability/timing.ts`) `withTiming(label, fn)` → misst Dauer, loggt strukturiert via `logger` (Felder: `label`, `ms`, `organizationId`, ggf. `resultCount`). Optional `Server-Timing`-Header in den betroffenen Routen/Actions.
- **T2 — Heiße Pfade instrumentieren:**
  - **Match** (`lib/evidence/match.ts`, command-center-Suche): Gesamtdauer + getrennt Embedding-Call vs. RPC.
  - **Dashboard-Load** (`lib/dashboard-home/*` Loader): Dauer pro Rolle.
  - **Export** (PDF/PPTX-Routen): Generierungsdauer.
- **T3 — Time-to-Evidence sichtbar machen:** Match-Dauer als Kennzahl festhalten (Log + optional `evidence_events.payload.duration_ms` bei `reference_matched`), damit der Pilot die North Star belegen kann.

## Akzeptanz
- Match-/Dashboard-/Export-Latenz erscheint strukturiert im Log (und/oder `Server-Timing`).
- `reference_matched` trägt eine Dauer im Payload (oder äquivalente Metrik).
- Keine spürbare Overhead-Regression; `typecheck`/`test`/`build` grün.

## Verifikation
```bash
npm run typecheck && npm test && npm run build
```
- Eine Suche/ein Dashboard-Load erzeugt einen Timing-Log-Eintrag mit `ms`.

> **Wirkung:** Baseline-Zahlen **vor** Perf-2/3/4 — danach lässt sich der Effekt jeder Maßnahme belegen.
