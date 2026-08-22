# Arbeitspaket — UI-Konsistenz (Farbschuld, Buttons, Copy)

**Stand:** 2026-08-14
**Auslöser:** UI/UX-Review über Home, Deals, Deal-Cockpit, Referenzen, Referenz-Detail und Einstellungen.
**Regelwerk:** [`design-system.md`](./design-system.md) §7 (korrigiert), §8 (Button-Konvention, neu), §9 (Statusfarben, neu).
**Kernbefund:** Die Einzelbeobachtungen aus dem Review sind überwiegend Symptome **einer** Ursache — Farben und Labels werden pro Komponente gewählt statt aus Tokens und `COPY` gezogen. Solange das so ist, kann keine Regel greifen.

### Stand der Umsetzung (14.08.2026, Abend)

Neun Feature-PRs liegen parallel gegen denselben `main`-Stand (#71–#79). Merge-Reihenfolge: dieses Docs-PR zuerst, dann #71 T7a, #79 T8 (Warning), #72 T1-A — danach visueller Stopp — dann #73–#78 mit Rebase nach jedem Merge.

**T1-Zahlen:** 180 (T1-A) + 127 (T1-B) + 19 (T4-Tabellen) = **326** mechanische Treffer. Die PR-Bodies zählten Diff-**Zeilen** (140 / 83); eine Zeile trägt oft mehrere Klassen. Nach T1+T4 bleiben die dokumentierten Inversionen, nicht ein unerklärtes Drittel.

**T3** war der Entscheidungs-Schnitt (D1–D3, D6), nicht der 447er-Sweep. Die Abnahme „keine selbstgebaute farbige Pill in `app/`“ ist damit **nicht** erfüllt. Der Rest (Queue-Punkte, Win-Probability-Ringe, Topic-Badges, SME-Blau, Draft-Dots, übrige semantische Paletten) ist ein **eigener Schnitt mit eigenen Entscheidungen**.

**T8 Phase 1** zählt und warnt (Exit 0). Phase 2 (`--fail`) erst nach dem T3-Rest, nicht nach T1. Das T1-Neutral-Mapping (fünf Zeilen aus §7, keine Fallbacks) ist gelaufen und das Einmal-Skript entfernt.

---

## 1. Ist-Inventar

> **Korrigiert 14.08.2026** nach Gegenzählung. Die Erstfassung hatte drei Fehler: 830 statt 815 (`components/ui` doppelt gezählt), Top-Dateien nach Zeilen statt Treffern sortiert, und T4 falsch zugeordnet. Grundlage ist jetzt die verifizierte Zählung.

**Raw-Tailwind-Paletten außerhalb `components/ui`: 815 Vorkommen**

| Bereich | Vorkommen | Dateien |
|---------|-----------|---------|
| `app/` | 528 | 76 |
| `components/` (ohne `ui/`) | 209 | 21 |
| `lib/` | 78 | 9 |
| `components/ui/` (erlaubte Zone) | 15 | — |

**Nach Charakter:**

| Gruppe | Anzahl | Behandlung |
|--------|--------|------------|
| **Neutral** (slate 246 / gray 77 / zinc 24) | **347** | T1 — 326 mechanisch, 16 dunkle Inversionen, **5 Sonderfälle** (s. u.) |
| **Semantisch** (amber 202, emerald 94, red 76, blue 35, sky 25, orange/green/teal/lime 15) | **447** | T3 — jede Stelle eine Entscheidung |
| **Marke** (violet 18 / purple 3) | **21** | T2 |

**Top-Dateien nach Treffern** (nicht nach Zeilen — Fehler der Erstfassung):

| Treffer | Datei |
|---------|-------|
| 40 | `app/dashboard/deals/cockpit/deal-rfp-risks-section.tsx` |
| 39 | `components/dashboard/command-center-search-results.tsx` |
| 32 | `app/dashboard/deals/cockpit/deal-rfp-eligibility-section.tsx` |
| 28 | `app/dashboard/references/[id]/share-link-dialog-panel.tsx` |
| 24 | `app/dashboard/deals/cockpit/deal-rfp-recommendation-banner.tsx` |
| 22 | `app/dashboard/settings/tabs/workflow-simulation-panel.tsx` |

Die Cockpit-Dateien sind durch den RFP-Quickscan nach oben gerutscht — dort sitzen überwiegend **semantische** Farben (T3), nicht neutrale. Dichte-Spitze für T1 bleibt das Command Center.

**Button-Varianten außerhalb `ui/`:** `outline` 171 · `ghost` 67 · `secondary` 26 · `default` 12 · `destructive` 7 · `link` 1. Die Verteilung ist gesund — T5 hängt nicht an der Menge, sondern daran, dass dieselbe Aktion je nach Seite eine andere Variante trägt.

## 2. Aufgaben

### T1 — Neutrale Farben auf Tokens

**347 Treffer in 40 Klassen.** Davon **326 mechanisch** nach der Mapping-Tabelle in `design-system.md` §7 (die Erstfassung deckte nur einen Teil ab und ist dort vollständig ersetzt), **16 dunkle Inversionen** von Hand.

Zwei Punkte, die keine Aufräumarbeit sind, sondern Entscheidungen:

- **Flächen zweistufig mappen.** `bg-*-50` → `bg-muted`, `bg-*-100/200` → `bg-accent`. Beide Tokens existieren; alles auf `bg-muted` zu ziehen ebnet eine vorhandene Ebene ein.
- **Text kollabiert auf zwei Stufen.** Das Token-System kennt nur `foreground` und `muted-foreground`, die App nutzt heute fünf Abstufungen. Das ist sichtbar. Entweder bewusst akzeptieren oder vorher ein drittes Text-Token einführen — nicht während des Sweeps entscheiden.

**Nicht im Skript** (16 Treffer): `bg-slate-800/900/950`, `bg-zinc-950`, `text-slate-100/200`, `border-slate-800`, `ring-slate-950`. Kontrast-Hacks ohne Token-Äquivalent.

**Die restlichen 5** (347 = 326 + 16 + 5) sind keine Mapping-Fälle und werden vom Abnahme-Grep nicht erfasst:

- `decoration-gray-400` in `components/dashboard/dashboard-home.tsx:271` → `decoration-muted-foreground`, Mini-Hunk.
- 4× `shadow-sm shadow-slate-900/5` in `watchlist-companies-panel.tsx:188`, `watchlist-executives-panel.tsx:131`, `compliance-documents-table.tsx:392`, `references-data-table.tsx:200`. **Kein Farbproblem:** Diese vier `<div>` sind zeichengleich mit `components/ui/card.tsx:10` (`rounded-xl border border-border/70 bg-card shadow-sm shadow-slate-900/5`) — es sind handgebaute Cards. Richtiger Fix ist `Card` verwenden, nicht die Farbe mappen. Gehört zu T4 (Komponenten-Wiederverwendung), nicht zu T1.

**Charakter:** gleiche Risikoklasse wie das Cognism-Rename — Skript, kein Hand-Edit, danach Diff Hunk für Hunk. Jeder Hunk, der kein reiner Klassentausch ist, ist ein Fehlerkandidat. **Anders als beim Rename ist das Ergebnis nicht pixelgleich**; benannte Screens zum visuellen Abgleich gehören in jeden PR.

**Nicht anfassen:** die Raw-`<table>`-Blöcke, die T4 ohnehin ersetzt (Benachrichtigungs-Matrix, Audit-Log) — sonst doppelte Arbeit.

**Abnahme:** `rg -nE '\b(bg|text|border|from|to|via|ring|divide|fill|stroke)-(slate|gray|zinc|neutral|stone)-[0-9]{2,3}'` in `app`, `components` (ohne `ui/`), `lib` = 0, ausgenommen die im PR dokumentierten dunklen Inversionen. Der Abnahme-Grep muss **alle** Prefixe abdecken, nicht nur `bg|text|border`.

### T2 — Markenfarbe auf `primary`

**21 Stellen** `violet-*` / `purple-*` → `primary`. Der „Aktiv"-Badge in der Team-Tabelle ist **bereits** `bg-accent text-accent-foreground` — der Hinweis der Erstfassung darauf war gegenstandslos.

`components/ui/company-logo.tsx` (`to-violet-500`) bleibt — erlaubte Zone.

**PR:** eigener Commit nach T1. Nicht mit T1 mischen — Primary ist sichtbarer als eine Muted-Verschiebung.

**Abnahme:** `rg -nE '(violet|purple)-[0-9]{2,3}'` in `app`, `components` (ohne `ui/`), `lib`, ohne `styles/theme-shell*.css` = 0.

### T3 — Statusfarben zurück ins Badge-System

**447 semantische Farbstellen.** Nicht mechanisch — jede ist eine Entscheidung.

**Zwei Ebenen beachten:** `lib/ui/status-tone.ts` ist die Implementierung, §5 die Semantik (siehe `design-system.md` §9). T3 baut auf `statusTone` auf und erfindet kein drittes System.

Reihenfolge:

1. **Inventarisieren:** Welche Zustände werden heute mit `amber`/`emerald`/`sky` dargestellt, und welchem `*StatusBadge` entsprechen sie?
2. **Lücken schließen:** Wo kein passender Badge existiert, einen Wrapper ergänzen — nicht die Farbe inline.
3. **Konflikte auflösen:** „RFP" und „Verhandlung" teilen heute dieselbe gelbe Variante (§9). Zwei unterscheidbare Zustände brauchen zwei Varianten.
4. **Match-Prozente:** entweder dokumentierte Schwellen mit echter Abstufung oder neutral. Heute sind 72 % und 87 % identisch grün.
5. **Deadlines:** nur einfärben, wenn handlungsrelevant. Bei `won` / `lost` / `archived` keine Rotfärbung.
6. **Farb-assertierende Tests mitziehen** — z. B. `benchmark-risk.test.ts` prüft Farbklassen. Die brechen bei T3 und gehören in denselben PR.

**Abnahme:** kein Status wird auf zwei Arten dargestellt; keine selbstgebaute farbige Pill in `app/`.

### T4 — Tabellenköpfe angleichen

> **Korrigiert.** Die Erstfassung sprach von „Team- und Admin-Tabelle". Falsch zugeordnet: Es sind **drei getrennte Flächen**, und die Team-Tabelle gehört gar nicht dazu.

| Fläche | Ort | Befund |
|---|---|---|
| **Benachrichtigungen** | `app/dashboard/settings/tabs/profile-tab.tsx:204–205` | Raw-`<table>` + `bg-slate-50 text-slate-600` |
| **Audit-Log** | `app/dashboard/settings/tabs/admin-tab.tsx:382–383` | dito, zusätzlich `sticky` |
| **Team** | `app/dashboard/settings/settings-team-card.tsx:289` | nutzt **bereits** shadcn `<Table>` — kein Raw-Markup |

**Nicht `AppDataTable`.** Das ist TanStack für Listen mit Spaltenmenü, Sortierung und Pagination. Eine Benachrichtigungs-Matrix mit drei Zeilen braucht das nicht. Ziel ist der **einheitliche Kopf über shadcn `<Table>`** — so wie im Team bereits umgesetzt, nur ohne `bg-slate-50`. `AppDataTable` nur, wenn ihr Sortierung am Audit-Log bewusst wollt (eigene Entscheidung, siehe D7).

**Team-UX im selben PR** (dieselbe Ansicht): redundante Rollenzeile unter den Selects entfernen (`settings-team-card.tsx:331–333`), Disabled-Grund der eigenen Zeile sichtbar machen, Papierkorb um Tooltip ergänzen (`aria-label` und `AlertDialog` sind vorhanden, Tooltip fehlt — §8.4 verlangt beides).

**Abnahme:** kein `<table className="w-full` in den drei Dateien; Team-Zeile zeigt Rollen nur in den Selects; eigene Zeile hat sichtbaren Disabled-Grund; Papierkorb mit `aria-label` + Tooltip + Dialog.

### T5 — Button-Konvention anwenden (§8)

Befunde aus dem Review, in Reihenfolge der Sichtbarkeit:

| Ort | Befund | Regel |
|-----|--------|-------|
| Home | `+ Referenz finden` trägt ein Plus für eine Suchaktion | §8.3 |
| Home | Pfeil-Suffix `→` nur hier, sonst nirgends | §8.1 |
| Home | `nachfassen` kleingeschrieben neben `Beweis finden` | §8.1 |
| Home | `Fix` — englisch, semantisch leer, hartkodiert in `lib/dashboard-home/dashboard-home-pure.ts:37/40/43` und `dashboard-home-admin.ts:191` (`Fix Sync`) | §8.1 |
| Home vs. Deal-Cockpit | „Referenz finden" ist einmal `default`, einmal `outline` | §8.2 |
| Deals / Deal-Cockpit | drei Plus-Varianten (nackt, im Kreis) für dieselbe Aktionsklasse | §8.3 |
| Referenz-Bibliothek | vier Icon-only-Buttons ohne Label neben einem Text-Button und einem Toggle | §8.4 |
| Referenz-Detail | `PPTX Export` / `PDF Export` als englische Substantive | §8.1 |
| Referenz-Detail | `Freigabe-Link kopieren` ist `default`, obwohl der Hinweis darunter einen anderen ersten Schritt nennt | §8.2 |
| Einstellungen | vier Füllstile auf einem Screen; identisch gebaute Zeilen (Push / 2FA) mit unterschiedlicher Variante | §8.2 |
| Einstellungen | `Push erlauben & registrieren` — Doppelverb mit Ampersand | §8.1 |
| Einstellungen | „Andere Geräte abmelden" und „Überall abmelden" optisch gleichwertig | §8.2 Risiko-Abstufung |
| Einstellungen | Ausrichtung uneinheitlich (Speichern rechts, Abmelden links) | §8.5 |
| Einstellungen / Audit | `CSV Export` (`admin-tab.tsx:378`) — englisches Substantiv | §8.1 |

### T6 — Copy

| Fundstelle | Befund |
|-----------|--------|
| `app/dashboard/settings/tabs/profile-tab.tsx:462`, `workspace-tab.tsx:175` | „Danger Zone" englisch, hartkodiert, mit `text-red-700` statt `text-destructive`. Zweimal dupliziert. |
| ebenda | „Account löschen" vs. „Konto dauerhaft entfernen" — zwei Begriffspaare für dieselbe Sache |
| `lib/copy.ts:66-68` | Funktionsrollen gemischt: `sales_rep: 'Vertrieb'`, `account_manager: 'Account Manager'`, `sales_leader: 'Sales Lead'`. Entweder alle deutsch oder alle englisch — Entscheidung nötig. |
| Einstellungen | drei Platzhalter-Grammatiken (`+49 ...` / `z. B. …` / `https://calendly.com/...`) |
| Einstellungen | zwei Erklärungsmuster (Helper-Text unter dem Feld vs. Klammer im Label) |
| Deal-Cockpit | `−1469 T` — negatives Vorzeichen plus abgekürzte Einheit; „vor X Tagen überfällig" ist lesbar |

### T7 — Bugs aus dem Review

> Der zuvor hier notierte Demo-Seed-Widerspruch ist durch **D6** aufgelöst (§5) — kein Fix nötig.

| Befund | Ort |
|--------|-----|
| Deal-Volumen roh ausgegeben (`1200000` statt `1.200.000 €`) | `lib/dashboard-home/build-sales-rep-queue.ts:86` — `deal.volume` geht ungefiltert in den Meta-String, obwohl `formatDealVolume()` in `lib/format.ts:212` existiert |
| Währungszeichen mal nachgestellt (`1.200.000 €`), mal vorangestellt (`€ 1.750.000`) | Deals-Tabelle vs. Referenz-Detail |
| Freigabe-Widerspruch Titel vs. Karte | **Umsetzung nach D6** (§5): zweites Label „Extern nutzbar" für Freigaben ohne Kunden-Workflow; Karte weist den Zustand als gültig aus statt als Mangel. Betrifft 14 von 16 freigegebenen Referenzen. |
| Pflichtfeld „Telefon" mit rotem Stern, aber leer speicherbar; Vorname/Nachname ohne Stern | `profile-tab.tsx` |
| Fristen doppelt: drei Chips oben, darunter „Alle Fristen · 4" | Deal-Cockpit |
| Hover- und Aktiv-Zustand der Settings-Tabs kaum unterscheidbar | `settings-tabs.tsx:189` — `after:hidden` legt den Line-Indicator still |
| **Deadline-Hot ohne Untergrenze:** `return days <= 30` trifft auch weit vergangene Daten und ignoriert den Deal-Status | `app/dashboard/deals/deals-table-format.ts:12–21`. **Das ist ein Bug, unabhängig von der Farbentscheidung in D3** — deshalb hier und nicht in T3. |

### T8 — Rückfall verhindern

Ohne Guard kommt die Farbschuld zurück — sie ist schon einmal zurückgekommen, nachdem §7 „bereinigt" gemeldet hatte.

**Lint-Regel** ergänzen, die Raw-Paletten in `app/`, `components/` (ohne `ui/`) und `lib/` als Fehler meldet. Umsetzbar als `eslint` no-restricted-syntax auf JSX-`className`-Literale oder als Grep-Check im CI-Schritt vor `npm run build`.

**Wichtig:** Die Regel erst scharfschalten, wenn T1–T3 durch sind — sonst blockiert sie jeden PR. Bis dahin als Warnung mit Zähler, damit die Richtung sichtbar ist.

> **Voraussetzung, damit T8 überhaupt wirkt:** Branch Protection auf `main` mit Required Status Checks. Aktuell ist `main` ungeschützt; ein roter Check blockiert nichts (siehe Bestandsaufnahme August §3.4b).

---

## 3. Reihenfolge

```
T1 (neutral, mechanisch) ──► T2 (Marke) ──► T4 (Tabellen) ──► T3 (Status, mit Entscheidungen)
T5 (Buttons) ──► unabhängig, jederzeit
T6 (Copy)    ──► unabhängig, jederzeit
T7 (Bugs)    ──► sofort, klein
T8 (Guard)   ──► nach T1–T3
```

T7 (Bugs) darf sofort und allein — der Volumen-Fix ist ein Einzeiler, der Deadline-Fix hängt an keiner Designfrage.

T1 zuerst, weil es das Rauschen entfernt, in dem T3 sonst untergeht: Wenn 360 neutrale Stellen weg sind, sind die verbleibenden 448 Farbstellen tatsächlich alle semantisch — und die Liste wird zu einer Entscheidungsliste statt einer Suchaufgabe.

T7 ist unabhängig und klein; der Volumen-Bug ist ein Einzeiler.

## 4. Nicht in diesem Paket

- `styles/theme-shell.css` / `theme-shell-content.css` — die Shell-Override-Schicht mit `!important`. Eigene Baustelle, nicht mit dem Token-Abbau vermischen.
- Informationsarchitektur-Befunde (Fristen-Redundanz, Primary führt nicht zum ersten Schritt) — brauchen eine Produktentscheidung, keinen Fix.
- `components/ui/*` — erlaubte Zone laut §7.

---

## 5. Entscheidungen — getroffen 14.08.2026

| # | Entscheidung | Herkunft |
|---|---|---|
| **D0** Textstufen | **Kollaps auf zwei Stufen akzeptiert.** T1 läuft wie in §7 beschrieben. Eine dritte Textstufe kann später als Token nachgezogen werden — nicht während des Sweeps. | Julien |
| **D1** Deal-Status | **RFP = `info`, Verhandlung = `warning`.** Nur Tones splitten, kein zweiter Sweep über Badge-Varianten. | Julien |
| **D2** Match-Prozente | **Kreis neutral, Label trägt die Stufe.** Prozent ist kein Status (§9); „Sehr hoch" / „Hoch" bleiben als Text. | Julien |
| **D3** Fristen-Chips | **Keine Rotfärbung bei `won` / `lost` / `archived` / `withdrawn`.** Chips bleiben sichtbar, verlieren nur die Warnfarbe. Der Tabellen-Bug (`days <= 30`) ist davon unabhängig und sitzt in T7. | Julien |
| **D4** Rollenbenennung | **Englische Fachbegriffe bleiben** (Sales Rep · Account Manager · Sales Lead), UI und Doku einheitlich. Keine neue Entscheidung: folgt der Festlegung vom 20.03. im Projekt-Briefing — „Deutsch als primäre UI-Sprache, englische B2B-Fachbegriffe wo üblich". | bestehende Regel |
| **D5** Copy-Wortlaut | Cursors Vorschlagstabelle ist die **Ausgangsbasis**. Einzelne Formulierungen dürfen im PR-Review geändert werden; nicht im Umsetzungsschritt neu erfinden. | Vorschlag, unwidersprochen |
| **D6** Freigabe-Label | **Eigenes Label für Freigaben außerhalb des Workflows** — siehe unten. | Julien, auf Datenbasis |
| **D7** Tabellen-Basis | **shadcn `<Table>`**, nicht `AppDataTable`. | Empfehlung, unwidersprochen |
| **D8** Währungsformat | **Suffix**, `1.200.000 €`, ein Formatter. Bereichsangaben danach angleichen oder als dokumentierte Ausnahme führen. | Empfehlung, unwidersprochen |

### D6 im Detail — Datenlage und Regel

**Gemessen in Production (14.08.):** 35 Referenzen gesamt, 16 mit `status ∈ {approved, external}`. Davon haben **14** weder `approval_requested_at` noch `customer_approval_status` noch ein `approval_token`. Der Kunden-Workflow ist dort nie gelaufen — es fehlt kein Zeitstempel, es gab keinen Prozess. Keine dieser 14 stammt aus dem Demo-Seed.

**Produktentscheidung dahinter:** Eine Referenz darf extern nutzbar sein, ohne dass der Kunde über RefStack freigegeben hat — Pressefreigabe, mündliche Zusage, veröffentlichte Case Study sind legitime Wege. Das ist damit ein **eigener Zustand**, kein unvollständiger.

**Regel:**

| Datenlage | Titel-Badge |
|---|---|
| `customer_approval_status = 'approved'` | **„Extern freigegeben"** |
| `status ∈ {approved, external}`, kein Kunden-Workflow | **„Extern nutzbar"** |
| sonst | wie bisher |

Die Freigabestatus-Karte darf im zweiten Fall nicht mehr „Kunde: Noch nicht gestartet" als Mangel darstellen, sondern muss den Zustand als gültig ausweisen.

**Umsetzungsgrenze — nur Anzeige, kein Verhalten.**

`lib/references/effective-customer-approval.ts` endet mit einem Fallback: `status ∈ {external, approved}` → `'approved'`. Der Docstring nennt das „Legacy". **Durch diese Entscheidung ist der Fallback nachträglich korrekt** — er bildet einen legitimen Zustand ab, keinen unvollständigen. Er wird **nicht angefasst**.

Grund: Die Funktion speist `resolveReferenceReadinessState`, und deren Rückgabe (`showPrimaryStart`, `showMagicLink`, `showRegenerateLink`, `showWithdraw`) steuert, **welche Aktionen im Referenz-Detail überhaupt erscheinen** — über acht UI-Dateien inklusive der Showcase-Links. Eine Änderung am Fallback würde für 14 von 16 Referenzen das Verhalten ändern, nicht nur die Beschriftung.

Die Unterscheidung gehört deshalb ausschließlich in die Anzeige-Ebene: `resolveReferenceTitleBadge` und `resolveFreigabestatusCardBadges` in `lib/references/reference-approval-display.ts` prüfen zusätzlich, ob ein Kunden-Workflow existierte (`approval_requested_at` / `customer_approval_status` / `approval_token`), und wählen danach den Wortlaut.

**Abnahme:** `git diff` zeigt keine Änderung an `effective-customer-approval.ts` und keine an `reference-readiness-state.ts`. Die Aktions-Buttons im Referenz-Detail sind vorher und nachher identisch.

**Folge für T7:** Der zuvor als Bug notierte Demo-Seed (`seed-demo-workspace.ts:85/101`) erzeugt unter dieser Regel **keinen Widerspruch mehr** — `status: 'approved'` ohne Workflow ist jetzt ein gültiger Zustand mit eigenem Label. Der Seed-Fix entfällt. Offen bleibt nur die Produktfrage, ob das Demo-Set zusätzlich eine Referenz *mit* durchlaufenem Kundenworkflow zeigen sollte, um den Flow zu demonstrieren — das ist Content, kein Bug.
