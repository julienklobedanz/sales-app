# Arbeitspaket: Perf-4 — Match-Pfad „instant" (P0)

**Quelle:** Performance-Audit (Vault) P3. **Kern-USP** (North Star Time-to-Evidence).
**Zweck:** Der Match fühlt sich nicht „instant" an, weil pro Suche ein synchroner OpenAI-Embedding-Call ohne Cache auf dem kritischen Pfad liegt.

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md`. Match: `lib/evidence/match.ts` (`embedTextWithOpenAI` → `match_references`-RPC), Command-Center-Suche (`lib/command-center/*`), UI `app/dashboard/match/match-smart-client.tsx`.

## Ist-Stand (verifiziert)

- `lib/evidence/match.ts:80` synchroner `embedTextWithOpenAI(...)` pro Query, **kein** Cache, kein Debounce. Embedding-Roundtrip (~200–800 ms) ist der dominante Latenz-Anteil.

## Aufgaben

- **T1 — Query-Embedding-Cache:** identische/normalisierte Queries nicht erneut einbetten (Hash der normalisierten Query → Embedding). Umsetzung pragmatisch: `unstable_cache` mit Tag, oder kleine Cache-Tabelle, oder In-Memory-LRU pro Instanz. Kein neues Infra-Stück, wenn Next-Cache reicht.
  - **Cache-Key = `hash(normalisierter finaler queryText)` + Modellname — und NICHTS sonst.** Ein Embedding ist eine reine Funktion des Eingabetexts. **Kein** `orgId`, **kein** `salesVisibleOnly`, **kein** `dealId` im Key:
    - `orgId`/`salesVisibleOnly` beeinflussen das Embedding nicht (die org-/rollen-spezifische Filterung passiert in der `match_references`-RPC, nicht hier) — sie in den Key zu nehmen, zersplittert den Cache und macht Perf-4 wirkungslos.
    - `dealId` ist **bereits im Text** enthalten (Deal-Kontext wird in `queryText` vorangestellt, `match.ts` Z. 52–72) → auf den **finalen** `queryText` hashen, nicht auf den Rohtext, dann ist Deal-Kontext automatisch im Key.
    - Kein Tenant-Leak: der Cache speichert nur `hash(text) → Vektor`; zwei Orgs mit gleicher Suche teilen denselben Vektor (korrekt). TTL darf großzügig/lang sein (Embeddings sind für Text+Modell unveränderlich).
- **T2 — Optimistische/streamende UI:** in `match-smart-client.tsx` (und Command-Center) sofort Skeleton/„suche…" zeigen, Ergebnisse streamen/nachladen statt auf den vollen Roundtrip zu blockieren. Eingabe **debouncen**.
- **T3 — Modell prüfen (optional):** kleineres/schnelleres Embedding-Modell evaluieren, falls Qualität ausreicht.

## Akzeptanz

- Wiederholte identische Suche überspringt den Embedding-Call (Perf-1-Timing zeigt 0 ms Embedding bei Cache-Hit).
- UI reagiert sofort (Skeleton), kein „Klick → Leerlauf bis alles fertig".
- Match-Ergebnisse unverändert korrekt; `typecheck`/`test`/`build` grün.

## Verifikation

```bash
npm run typecheck && npm test && npm run build
```

- Perf-1-Timing: Match-Gesamtdauer sinkt; Cache-Hit-Pfad ohne Embedding-Latenz.
- Manuell: zweimal dieselbe Suche → zweite spürbar schneller.

> **Abhängigkeit:** Perf-1 vorher (misst genau diesen Pfad).
