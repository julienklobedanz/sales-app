# Arbeitspaket: Legacy-Routen & toter Code (Welle 4c)

**Quelle:** Produkt-Audit (C8) & laufende Cleanup-Integration.
**Voraussetzung:** Welle 0–4b umgesetzt. Tests grün.
**Zweck:** Verwaisten Code entfernen, doppelte Redirect-Mechanik vereinheitlichen, einen Erreichbarkeits-Bug bei Market-Signals-`manage` beheben. **Reines Aufräumen** — keine neuen Features.
**Sicherheitsregel:** kein Löschen ohne „0 Imports/Referenzen"-Nachweis (`grep`) + Branch + grüner Testlauf.

---

## Vorab lesen (für die Coding-Session)

- **Konventionen:** `docs/ai-coding-agent-guide.md`.
- Routing-Quelle: `lib/routes.ts` (`ROUTES`, `LEGACY_REDIRECTS`) + `next.config`.
- **Code vor Löschen prüfen**; **Vault nicht** heranziehen.

---

## Ist-Stand (verifiziert)

- `app/dashboard/market-signals/market-signals-client.tsx` (**2.871 Z.**) wird **nirgends** importiert → verwaist (Hauptdestination ist in W3 auf Account-Detail verlagert; `market-signals/page.tsx` ist nur noch `redirect(ROUTES.accounts)`).
- `app/dashboard/request/` (page, `ticket-type-select.tsx`, loading) — `/dashboard/request` ist per `LEGACY_REDIRECTS` → `ROUTES.request` (= `/dashboard/deals/request/new`) umgeleitet; `ticket-type-select` wird **nur** im request-Ordner genutzt → Ordner tot.
- **Konflikt:** `LEGACY_REDIRECTS` enthält `/dashboard/market-signals/:path*` → accounts. Das fängt auch `/dashboard/market-signals/manage` ab → die **manage-UI (Cron/Digest/Watchlist) ist per URL nicht erreichbar**, obwohl sie bleiben soll.
- **Doppelte Mechanik:** für `market-signals` und `deal-desk` existiert **sowohl** ein `redirect()`-Stub in `page.tsx` **als auch** ein `LEGACY_REDIRECTS`-Eintrag → der Config-Redirect greift zuerst, der Stub ist toter Code.
- `LEGACY_REDIRECTS` enthält noch `/dashboard/concepts/inbox-references` (Ordner in W3 gelöscht).
- `command-center` = Modul ohne Route (kein Handlungsbedarf).

---

## T1 — Verwaisten Code entfernen

**Soll:** Nach Import-Check löschen:

- `app/dashboard/market-signals/market-signals-client.tsx` (verwaist).
- Nur-davon-genutzte Helfer im selben Ordner (`data.ts`, `loading.tsx`) — **erst prüfen**, ob die Account-Signal-Card oder `manage` sie nutzen; nur löschen, wenn 0 Referenzen.
- `app/dashboard/request/` (kompletter Ordner) — durch Redirect tot.
  **Wichtig behalten:** `app/dashboard/market-signals/actions.ts` (Cron/Digest/Account-Card nutzen es) und das `manage/`-Verzeichnis (→ T2).
  **Akzeptanz:** `grep` zeigt 0 verbliebene Importe der gelöschten Dateien; Build & Tests grün.

---

## T2 — Market-Signals-`manage`: Erreichbarkeit herstellen

**Problem:** Der `:path*`-Redirect macht `/dashboard/market-signals/manage` unerreichbar.
**Soll (empfohlen):** Die manage-UI (Cron/Digest/Watchlist-Konfiguration) **nach Settings verlagern** — sie ist Admin-Konfiguration und passt dorthin (konsistent mit Option B: Market Signals ist keine eigene Destination mehr). Danach ist der pauschale `market-signals/*`→accounts-Redirect sauber.
**Soll (minimaler Fallback):** Falls keine Verlagerung gewünscht, `/manage` **vom Redirect ausnehmen** (spezifische Route vor Wildcard) und über Settings/Account verlinken, damit es auffindbar bleibt.
**Dateien:** `app/dashboard/market-signals/manage/*`, `app/dashboard/settings/*` (Ziel), `lib/routes.ts` (Redirect-Regel), `next.config`.
**Akzeptanz:** manage-Funktion (Cron/Digest/Watchlist) ist erreichbar und auffindbar; kein Redirect-Schatten mehr darauf; nur-Admin-Zugriff bleibt.

---

## T3 — Redirect-Mechanik konsolidieren & `LEGACY_REDIRECTS` aufräumen

**Soll:**

- Pro umgeleiteter Route **eine** Mechanik: `LEGACY_REDIRECTS` (next.config) als Quelle für dauerhafte URL-Redirects behalten; die toten `redirect()`-Stub-`page.tsx` (market-signals, deal-desk, ggf. request nach T1) entfernen, wo der Config-Redirect die Route abdeckt.
- `LEGACY_REDIRECTS` durchsehen: Einträge für gelöschte Quellen (`concepts/inbox-references`) entfernen, **außer** alte externe Links sollen weiter sanft landen (dann mit Kommentar belassen). `permanent` vs. temporär konsistent setzen (echte Umbenennungen = permanent; Übergangs-Redirects = temporär).
  **Akzeptanz:** Keine doppelte Redirect-Mechanik mehr; `LEGACY_REDIRECTS` enthält nur noch sinnvolle, dokumentierte Einträge; alle alten URLs landen weiterhin korrekt; Build & Tests grün.

---

## Out of Scope (→ Welle 5)

- `references`(Module) vs. `evidence`(Route) Namens-Konsolidierung (viele Imports).
- Entfernen der Legacy-`role`-Spalte + Sync-Trigger.
- `workspace_state`-Entfernung (nach abgeschlossener 4a-Umstellung, eigenes Paket).

---

## Verifikation

```bash
npm run test
npm run build
```

- Vor jedem Löschen: `grep -rnE "<dateiname/symbol>" app components lib` → 0.
- Manuell: alte URLs (`/dashboard/market-signals`, `/dashboard/request`, `/dashboard/deal-desk`, `/dashboard/companies`) leiten korrekt um; `manage` erreichbar (neuer Ort); keine 404 auf zuvor gültigen Pfaden.

---

## Reihenfolge

T1 (Löschen, größter Aufräum-Effekt) → T2 (manage erreichbar) → T3 (Redirects konsolidieren). Je eigener, kleiner PR.
