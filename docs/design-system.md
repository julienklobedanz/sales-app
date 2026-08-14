## Design System (Refstack) – Quelle der Wahrheit

Ziel: **Fully aligned UI** durch zentrale Tokens + konsistente UI-Primitives + klare Regeln, wo Styles/Copy hingehören.

### 1) Tokens & Theme (Farben, Radius, Dark Mode)

- **Primäre Token-Quelle**: `app/globals.css`
  - CSS-Variablen wie `--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, …
  - `.dark` überschreibt diese Variablen → Dark Mode läuft über Tokens.
  - `@import "shadcn/tailwind.css";` + `@theme inline { --color-* ... }` verdrahtet Tokens für Tailwind/Utilities.

### 2) UI‑Primitives (Shadcn)

- **Komponenten‑Library**: `components/ui/*`
  - Beispiele: `button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`, …
  - **Button `size="toolbar"`:** einheitliche Höhe/Abstände für Aktionen **über** `AppDataTable` (Filter, Spalten, Primäraktion).
  - **`ToolbarSearchField`** (`components/ui/toolbar-search-field.tsx`): Suchfeld mit Icon; `variant="list"` (h-10, `AppDataTable`) oder `variant="dashboard"` (h-11, Übersicht/Accounts). Konstanten: `lib/table-toolbar.ts` (`TABLE_TOOLBAR.list` / `.dashboard`).
  - **Tabellen (TanStack):** `app-data-table.tsx` (`AppDataTable`) ist die gemeinsame Basis für Listen (Referenzen, Deals); `tableVariant` (`evidence` | `deals` | `default`) schaltet das jeweilige Kontextmenü (`COPY.evidence.*` / `COPY.deals.*`); `DataTable` in `data-table.ts` ist ein Alias.
  - Variants/States gehören **hier** hin (nicht als neue Hardcodes in Pages).

### 3) Icons

- **Zentraler Adapter**: `lib/icons.tsx` (`AppIcon`)
  - Einheitliche Defaults (Size, StrokeWidth, currentColor)
  - Icon‑Library Wechsel bleibt auf einen Ort begrenzt.

### 4) Copy / Labels

- **Zentrale UI‑Begriffe**: `lib/copy.ts` (`COPY`)
  - Navigation/Page‑Labels, wiederkehrende Begriffe (z. B. „Treffer“ statt „Matches“).

### 5) Semantische Badges (App‑Ebene)

Für häufige Status‑Darstellungen gibt es zentrale Wrapper:

- `components/reference-status-badge.tsx`
- `components/deal-status-badge.tsx`
- `components/ticket-status-badge.tsx`

#### Badge‑Variant Semantik (Konvention)

Damit Status‑Chips überall gleich “wirken”, nutzen wir `Badge`‑Variants nach Bedeutung (nicht nach persönlichem Geschmack):

- **`default`**: positiv / abgeschlossen / “gut” (z. B. Deal **Gewonnen**, Referenz **Freigegeben**, Ticket **Geschlossen**)
- **`secondary`**: neutral / in Prüfung / wartend (z. B. Referenz **Intern**, **Freigabe ausstehend**, Ticket **Offen**)
- **`outline`**: “Meta” / Entwurf / archiviert / ohne starke Bewertung (z. B. Referenz **Entwurf**, Deal **Archiviert**)
- **`destructive`**: negativ / gescheitert / abgebrochen (z. B. Deal **Verloren**, **Zurückgezogen**)

### 6) Regeln für “Fully aligned”

- **Keine Hardcoded Farben** in App‑Screens (`slate|zinc|gray|neutral|red|yellow|…`) → Tokens verwenden (`bg-background`, `text-muted-foreground`, `border-border`, `bg-muted`, `bg-accent`, `text-primary`, …).
- **Neue UI‑Varianten** gehören in `components/ui/*` (cva/variants), nicht als ad‑hoc Klassen in Pages.
- **Wiederkehrende Begriffe** (Nav, Headlines, Tabellen‑Header) bevorzugt über `COPY` lösen.
- **Status‑Darstellungen** nicht neu erfinden → `*StatusBadge` Wrapper verwenden.

### 7) Farben & Copy: laufende Disziplin

> **Korrektur 14.08.2026.** Die frühere Fassung behauptete, ein Sweep habe „die letzten offensichtlichen Stellen bereinigt". Das trifft nicht zu: Eine Zählung am 14.08. findet **815 Raw‑Paletten‑Klassen** außerhalb von `components/ui` (app 528 / components ohne `ui/` 209 / lib 78). `components/ui` selbst: 15 — die einzige erlaubte Zone. Die Regel gilt weiter, sie wird nur nicht eingehalten. Abbauplan: [`arbeitspaket-ui-konsistenz.md`](./arbeitspaket-ui-konsistenz.md).

- **Keine Raw‑Tailwind‑Paletten** in App‑Screens (`green-600`, `slate-*`, `zinc-*`, …): semantische Utilities (`text-primary`, `text-muted-foreground`, `bg-muted`, `border-border`, `text-destructive`, …) oder UI‑Variants nutzen. Bei neuen Features gleich Tokens verwenden.
- **`components/` (App‑Ebene, nicht `ui/`):** Eigenes Markup nutzt durchgängig semantische Klassen (`auth-shell`, Status‑Badges, `SupportTicketModal`, …). Generierte **Shadcn‑Primitives** unter `components/ui/*` dürfen `dark:`‑Varianten und z. B. **Overlay‑Scrims** (`bg-black/50` / `bg-black/80`) sowie `text-white` auf **destructive**‑Buttons enthalten – das sind etablierte Muster; nur bei gezieltem Theme‑Tuning anfassen (visuell testen).
- **Copy:** wiederkehrende Labels weiter über `lib/copy.ts` (`COPY`) führen; Rollen/Nav sind dort bereits vorhanden.
- **Badges:** Status über die zentralen `*StatusBadge`‑Komponenten; Variant‑Semantik siehe Abschnitt 5.

**Mapping‑Tabelle für den Abbau.** Vollständig gegen den Ist‑Stand erhoben (14.08.): 342 neutrale Treffer in 40 Klassen, davon **326 mechanisch** abbildbar.

| Raw‑Klassen | Token | Treffer |
|---|---|---|
| `text-{slate,gray,zinc}-700/800/900/950` | `text-foreground` | 80 |
| `text-{slate,gray,zinc}-300/400/500/600` | `text-muted-foreground` | 109 |
| `bg-{slate,gray}-50` | `bg-muted` | 34 |
| `bg-{slate,gray,zinc}-100/200` | `bg-accent` | 30 |
| `border-{slate,gray,zinc}-100/200/300` | `border-border` | 73 |

**Zwei Stufen bei Flächen sind Absicht.** `bg-muted` und `bg-accent` sind beide vorhanden; alles auf `bg-muted` zu ziehen würde eine vorhandene Ebene der Flächenhierarchie einebnen.

**Beim Text gibt es nur zwei Stufen.** Das Token‑System kennt `foreground` und `muted-foreground`, die App nutzt heute fünf Abstufungen. Der Abbau kollabiert sie auf zwei. Das ist eine bewusste Entscheidung, keine Nachlässigkeit — wer eine dritte Textstufe braucht, führt sie als **Token** ein, nicht als Raw‑Klasse.

**Nicht im Skript** (16 Treffer, 8 Klassen): dunkle Inversionen `bg-slate-800/900/950`, `bg-zinc-950`, `text-slate-100/200`, `border-slate-800`, `ring-slate-950`. Das sind Kontrast‑Hacks ohne Token‑Äquivalent — einzeln ansehen, ggf. mit T3 lösen.

Semantische Farben (`amber`, `emerald`, `red`, `sky`, …) sind **nicht** mechanisch ersetzbar — sie tragen Bedeutung und gehören in das Status‑System aus Abschnitt 5 und 9.

---

### 8) Button‑Konvention

> Ergänzt Abschnitt 5 (Badges) um das fehlende Gegenstück für Aktionen. Eingeführt 14.08.2026 nach einem UI‑Review, der vier Beschriftungsgrammatiken, drei Plus‑Icon‑Varianten und wechselnde Hierarchien für dieselbe Aktion gefunden hat.

#### 8.1 Beschriftung

- **Deutsches Verb im Infinitiv + Objekt**, Satzanfang groß: „Referenz finden", „Deal anlegen", „Briefing erzeugen", „Passwort speichern".
- **Keine englischen Substantive als Label.** `PDF Export` → **„Als PDF exportieren"**. `Fix` → die konkrete Aktion („Economic Buyer ergänzen").
- **Kein Ampersand, kein Doppelverb.** „Push erlauben & registrieren" → **„Push aktivieren"**.
- **Kein Pfeil‑Suffix** (`→`). Richtung ist keine Beschriftung.
- **Keine Kleinschreibung** am Labelanfang: „nachfassen" → **„Nachfassen"**.
- Etablierte Formatnamen dürfen als **Objekt** vorkommen, nicht als ganzes Label: „ICS‑Datei herunterladen" statt „ICS".
- Wiederkehrende Labels gehören nach `lib/copy.ts`. Ein hartkodiertes Label ist ein Bug, kein Stil.

#### 8.2 Hierarchie — eine Primäraktion pro Ansicht

| Variant | Verwendung |
|---------|------------|
| `default` | **Genau eine** Hauptaktion pro Ansicht. Wenn zwei Buttons Primary sind, ist einer falsch. |
| `outline` | Der Normalfall. Alles Regelmäßige. |
| `ghost` | Aktionen innerhalb von Zeilen und Karten, sekundär im Kontext. |
| `secondary` | Nur **innerhalb gedämpfter Blöcke** (`bg-muted`‑Zeilen), damit der Button nicht verschwindet. |
| `destructive` | Irreversibel. Immer mit Bestätigung. |
| `link` | Navigierend im Fließtext. |

**Bindende Regel:** *Dieselbe Aktion trägt überall dieselbe Variante.* „Referenz finden" darf nicht auf einer Seite `default` und auf einer anderen `outline` sein — die Variante beschreibt die Aktion, nicht die Seite.

**Risiko‑Abstufung:** Zwei benachbarte Aktionen mit unterschiedlicher Reichweite dürfen nicht identisch aussehen. „Andere Geräte abmelden" und „Überall abmelden" sind nicht gleichwertig — die weitreichendere bekommt `destructive` oder eine Bestätigung.

#### 8.3 Icons

- Ein Icon nur, wenn es Bedeutung trägt, die das Label nicht trägt. **Nicht dekorativ.**
- **Pro Aktionsklasse genau ein Icon**, app‑weit:
  - **Plus** = ein Objekt neu anlegen. **Nie für Suchen oder Finden.**
  - **Lupe** = suchen, finden, matchen.
  - **Teilen‑Icon** = Link erzeugen oder versenden.
  - **Papierkorb** = löschen.
- Immer über `AppIcon` (`lib/icons.tsx`), nie direkt importiert.
- Entweder app‑weit Plus‑im‑Kreis oder app‑weit nacktes Plus — nicht beides.

#### 8.4 Icon‑only

Erlaubt nur, wenn **alle drei** Bedingungen erfüllt sind:

1. Das Symbol ist etabliert (`⋯` Overflow, `✕` Schließen, Papierkorb in einer Zeile) **oder** im Kontext eindeutig,
2. `aria-label` **und** Tooltip sind gesetzt,
3. die Aktion ist nicht destruktiv — oder es folgt ein Bestätigungsdialog.

**Nicht mehr als zwei Icon‑only‑Buttons nebeneinander** ohne sichtbare Gruppierung. Eine Toolbar aus vier unbeschrifteten Icons ist ein Ratespiel.

#### 8.5 Größe und Ausrichtung

- `size="toolbar"` über `AppDataTable` (Abschnitt 2), `default` in Formularen und Karten, `sm`/`xs` in Tabellenzeilen und Chips.
- **Nebeneinanderstehende Buttons haben dieselbe Größe.**
- Formular‑ und Sektionsaktion: **rechtsbündig** unter dem Block.
- Listen‑ und Bulk‑Aktion: **linksbündig** über der Liste.
- Karten‑ oder Settings‑Zeile mit Label links: Button rechts.

---

### 9) Statusfarben: ein System, nicht fünf

Status wird **ausschließlich** über die `*StatusBadge`‑Wrapper aus Abschnitt 5 dargestellt.

> **Zwei Ebenen, nicht zwei Systeme.** Im Code existieren parallel die Badge‑Variants aus Abschnitt 5 und `lib/ui/status-tone.ts` (CSS‑Variablen `--status-*`). Das ist kein Widerspruch, solange die Rollen klar sind: **`statusTone` ist die Implementierung** (Farbwerte, an Tokens verdrahtet), **Abschnitt 5 ist die Semantik** (welcher Zustand wirkt positiv, neutral, meta, negativ). Neue Status gehen über `statusTone`; die Zuordnung Zustand → Wirkung richtet sich nach Abschnitt 5. Was **nicht** erlaubt ist: eine dritte Ebene aus Raw‑Klassen daneben. Verboten sind parallele Systeme für dieselbe Information:

- **Keine selbstgebauten farbigen Pills** aus Raw‑Paletten (`bg-amber-50 text-amber-700`, …).
- **Kein farbiger Punkt**, wo ein Badge steht. Ein Screen zeigt Status auf **eine** Art.
- **Zwei Zustände dürfen nicht dieselbe Variante teilen**, wenn der Nutzer sie unterscheiden muss (aktuell: „RFP" und „Verhandlung" beide gelb).

**Prozentwerte sind kein Status.** Match‑Scores gehören nicht ins Badge‑System. Entweder eine dokumentierte Skala mit echten Schwellen (dann sind 72 % und 87 % unterschiedlich eingefärbt) oder neutral dargestellt — nicht alles im selben Grün.

**Zeitliche Dringlichkeit** wird nur eingefärbt, wenn sie handlungsrelevant ist. Eine überfällige Frist an einem gewonnenen oder verlorenen Deal ist bedeutungslos; sie rot zu färben entwertet Rot überall sonst.
