# Arbeitspaket: Modularisierung der Monolith-Dateien (Engineering E5)

**Quelle:** Engineering-Audit E5. Wartbarkeit/Testbarkeit.
**Zweck:** Die größten Dateien in testbare, review-freundliche Module zerlegen — **strikt verhaltenserhaltend**.

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md` (Scope-Disziplin; hier ist Refactor der Auftrag, aber pro Datei begrenzt). Design-System für UI.
- Synergie E3: extrahierte Pure-Logik wird unit-testbar.

---

## Ist-Stand (verifiziert): Top-Dateien

| Datei                                                       | Zeilen      | Typ            | E5                                               |
| ----------------------------------------------------------- | ----------- | -------------- | ------------------------------------------------ |
| `app/dashboard/evidence/new/reference-form.tsx`             | 9 (Barrel)  | UI-Form        | **erledigt** → `lib/references/reference-form/*` |
| `lib/evidence/approvals.ts`                                 | 19 (Barrel) | Server-Logik   | **erledigt** → `lib/evidence/approvals-*`        |
| `app/dashboard/dashboard-home-data.ts`                      | 28 (Barrel) | Daten/Server   | **erledigt** → `lib/dashboard-home/*`            |
| `app/dashboard/dashboard-overview.tsx`                      | 1.457       | UI             | Boy-Scout                                        |
| `app/dashboard/accounts/actions.ts`                         | 1.345       | Server-Actions | Boy-Scout                                        |
| `app/dashboard/deal-desk/deal-desk-client.tsx`              | 1.135       | UI-Client      | Boy-Scout                                        |
| `app/dashboard/overview/reference-table-column-renders.tsx` | 1.106       | UI             | Boy-Scout                                        |

(weitere > 800 Z.: `evidence/new/actions.ts`, `evidence/[id]/page.tsx`, `market-signals/actions.ts`, `deals/actions.ts`, `accounts-grid.tsx`, `deal-desk/actions.ts`)

**E5 Pflicht-Scope abgeschlossen** (Top-3 Monolithen). Weitere große Dateien nur noch opportunistisch beim Anfassen (Boy-Scout).

---

## Vorgehen (pro Datei ein PR, verhaltenserhaltend)

**Muster je Dateityp:**

- **UI-Komponenten** (`reference-form`, `dashboard-overview`, `deal-desk-client`, `reference-table-column-renders`): Teil-Komponenten + Custom Hooks auslagern; reine Render-Helfer in eigene Dateien; State-Logik in Hooks. Kein neues State-/Theme-System.
- **Server-Actions/Daten** (`approvals.ts`, `dashboard-home-data.ts`, `accounts/actions.ts`, `deal-desk/actions.ts`): nach **Concern** splitten (z. B. je Entität/Use-Case), reine Mapping-/Entscheidungslogik in `lib/…` (unit-testbar → E3). Action-Signaturen/Exports stabil halten.

**Richtwert:** Zieldateien < ~400 Zeilen; keine öffentlichen Signaturen brechen.

**Priorisierung:** Dateien zuerst, die hohe Churn/Bug-Last haben oder in kommenden Features ohnehin angefasst werden (Boy-Scout). Empfohlene Top-3: `reference-form.tsx`, `lib/evidence/approvals.ts`, `dashboard-home-data.ts` (letztere zwei zahlen direkt auf E3-Testbarkeit ein).

---

## Akzeptanz

- Bearbeitete Datei deutlich verschlankt; klare Sub-Module/Hooks; **identisches Verhalten**.
- Keine geänderten öffentlichen Exports/Props (oder bewusst + Aufrufer angepasst).
- Extrahierte Logik hat mind. punktuelle Unit-Tests.
- `npm run typecheck && npm test && npm run build` grün.

## Reihenfolge

Iterativ, **ein File pro PR**. Kein Big-Bang. Erst Top-3, Rest opportunistisch mit künftigen Features.

## Verifikation

```bash
npm run typecheck && npm test && npm run build
```

- Vor/Nach: Verhalten der betroffenen Seite/Action manuell gegenprüfen (gleiches Ergebnis).
