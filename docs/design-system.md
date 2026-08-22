## Design System (Refstack) – Quelle der Wahrheit

Ziel: **Fully aligned UI** durch zentrale Tokens + konsistente UI-Primitives + klare Regeln, wo Styles/Copy hingehören.

### 1) Tokens & Theme (Farben, Radius)

- **Primäre Token-Quelle**: `app/globals.css`
  - CSS-Variablen wie `--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, …
  - Ein Theme: hell. `.theme-shell` setzt die Fläche; es gibt kein `.dark` und keine `dark:`-Varianten.
  - `@import "shadcn/tailwind.css";` + `@theme inline { --color-* ... }` verdrahtet Tokens für Tailwind/Utilities.
- **Wächter:** `npm run check:dark` (`scripts/check-dark-variants.mjs`). Phase 2 (`--fail`): CI bricht ab, wenn `\bdark:` unter `app/`, `components/` oder `lib/` vorkommt — inklusive `components/ui`.

### 2) UI‑Primitives (Shadcn)

- **Komponenten‑Library**: `components/ui/*`
  - Beispiele: `button.tsx`, `badge.tsx`, `card.tsx`, `group.tsx`, `option.tsx`, `hinweis.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`, …
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

> **Korrektur 20.08.2026.** `components/ui` ist keine Paletten-Freizone. Der Wächter `check:palette` scannt den Ordner. Overlay-Scrims nutzen `bg-foreground/…` (kein eigenes Token). Benannte Ausnahme: Firmenlogo-Platzhalter in `company-logo.tsx` (Verlauf + `text-white`, Allowlist). Die Zählung vom 14.08. (815 außerhalb von `ui`) bleibt historisch; Abbauplan: [`arbeitspaket-ui-konsistenz.md`](./arbeitspaket-ui-konsistenz.md).

- **Keine Raw‑Tailwind‑Paletten** in App‑Screens (`green-600`, `slate-*`, `zinc-*`, …): semantische Utilities (`text-primary`, `text-muted-foreground`, `bg-muted`, `border-border`, `text-destructive`, …) oder UI‑Variants nutzen. Bei neuen Features gleich Tokens verwenden. Dasselbe gilt in `components/ui/*`.
- **`components/` (App‑Ebene):** Eigenes Markup nutzt durchgängig semantische Klassen (`auth-shell`, Status‑Badges, `SupportTicketModal`, …). `dark:` ist verboten.
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

---

### 10) Seiten‑Grammatik: was eine Seite ist und wann sie eine sein darf

> Ergänzt die Abschnitte 7–9 um die Ebene darüber. Die Farbarbeit hat die Atome geordnet (Tokens, Buttons, Badges); dieser Abschnitt ordnet Seiten. Eingeführt 14.08.2026 nach einem Seitenreview, das **drei Objektseiten mit drei Skeletten** (Referenz, Deal, Account), **zwei Sammelseiten mit zwei Skeletten** und **sieben Komponenten für denselben Referenzinhalt** gefunden hat — fünf davon für dieselbe interne Zielgruppe.

#### 10.1 Seitenwürdigkeit

**Nicht jedes Objekt braucht eine Seite.** Maßstab ist das Gewicht des Inhalts:

| Gewicht | Ort | Was die Route tut |
|---------|-----|-------------------|
| Passt auf einen Bildschirm | **In seiner Sammlung**, im Lesebereich neben der Liste | leitet auf die Sammlung mit dem Objekt ausgewählt weiter |
| Trägt mehrere Bereiche mit je eigener Darstellungsform | **Eigene Seite** | rendert die Seite |

Der Deal ist seitenwürdig — er trägt einen Arbeitsbereich mit sieben Bereichen. Die Referenz ist es nicht — ihr Inhalt füllt einen Bildschirm, eine eigene Seite ließe zwei Drittel leer.

**Beide bleiben verlinkbar.** Der Unterschied liegt darin, wohin die Route führt, nicht darin, ob es eine gibt. **Die Route eines nicht seitenwürdigen Objekts leitet auf die Sammlung mit Auswahl weiter** — eine kanonische URL, ein Renderpfad. Auf schmalen Fenstern klappt die Liste weg und der Lesebereich füllt aus — responsives Verhalten, keine zweite Ansicht.

#### 10.2 Aufbau einer Objektdarstellung

In dieser Reihenfolge, ob als Seite oder als Lesebereich:

1. **Identität** — wer oder was. Rechts die Ausgaben des Objekts (Export, Briefing)
2. **Zustand** — die Antwort auf die Leitfrage der Fläche
3. **Kern** — wofür das Objekt im Produkt existiert
4. **Kontext** — was gelegentlich gebraucht wird, ruhig gehalten
5. **Vertiefung** — Zusammenfassung plus Einstieg, nicht der Inhalt selbst

**Bindende Regel:** *Der Zustand ist eine Aussage, keine Feldliste.* „Extern nutzbar — Freigabe außerhalb von RefStack" beantwortet die Frage. Drei Zeilen „Unter NDA? Nein · Intern: Noch nicht gestartet · Kunde: Extern nutzbar" verlangen vom Nutzer, sie selbst zu beantworten.

**Phasenabhängigkeit:** Abschnitte, die für den aktuellen Zustand bedeutungslos sind, werden **nicht gerendert**. Kein Leerlauf, keine Felder mit „—".

#### 10.3 Eine Information, ein Element

Dieselbe Information steht auf einer Fläche an **einer** Stelle. Wo Chips und Timeline dieselben Termine zeigen, entsteht kein Mehrwert, sondern Konkurrenz um Aufmerksamkeit.

#### 10.4 Ein Inhalt, mehrere Einfassungen

Ein Objekt hat **eine** Inhaltsdarstellung. Was sich je nach Ort unterscheidet, ist die Einfassung — nicht der Inhalt.

| Einfassung | Unterschied |
|------------|-------------|
| **Intern** | alle Felder, alle Aktionen |
| **Kundenfreigabe** | reduzierte Felder, Freigabe‑Ansprache |
| **Öffentlich** | reduzierte Felder, Branding des Workspaces |

Eine neue Ansicht desselben Objekts ist ein **Rahmen um den vorhandenen Kern**, nie eine zweite Implementierung.

**Bindende Regel:** *Wenn zwei interne Ansichten unterschiedliche Felder zeigen, ist das ein Bug, keine Variante.*

#### 10.5 Aktions‑Platzierung

| Art der Aktion | Ort |
|----------------|-----|
| Erzeugt ein Artefakt aus dem **ganzen** Objekt | Kopf, bei den Aktionen |
| Verändert oder exportiert eine **bestimmte Menge** | an dieser Menge |
| Betrifft einen **einzelnen Eintrag** | im Panel dieses Eintrags |
| Ist eine **Variante derselben Absicht** | im Dialog der Hauptaktion, nicht als eigener Button |

Vier Knöpfe, die alle „irgendwie teilen" heißen, sind eine Aktion mit vier Varianten. Ergänzt 8.2: die Hierarchie sagt, *wie* ein Button aussieht — dieser Abschnitt sagt, *wo* er steht.

#### 10.6 Navigationsebenen

| Ebene | Mechanismus | Beispiel |
|-------|-------------|----------|
| Objekt | Route | Deal, Referenz, Firma |
| Bereich | Unterroute | Bereich eines Arbeitsbereichs |
| Eintrag | Query‑Parameter, Panel | ein Risiko, ein Entwurf |

**Höchstens eine schwebende Ebene gleichzeitig.** Wer ein Panel über einem Panel braucht, hat die Ebene darunter falsch gewählt.

Alles muss verlinkbar sein, die Zurück‑Taste muss überall das Erwartete tun, und ein Neuladen darf keinen Zustand verlieren.

#### 10.7 Arbeitsbereiche

Ein Arbeitsbereich entsteht, wenn ein Objekt einen Teil hat, der **eigenständige, längere Arbeit** trägt — erkennbar an mehreren Bereichen mit je eigener Darstellungsform und zweistelligen Mengen.

Aufbau: **Leiste** links mit Fortschrittszahlen · **eine** Inhaltsfläche · **Panel** für Einzeleinträge. Die Zahlen in der Leiste sind kein Schmuck, sondern zeigen, wo Arbeit liegt („1 K.O.", „0/26").

Ein Arbeitsbereich ist eine **Unterroute des Objekts**, kein Sidebar‑Eintrag. Er ist damit erkennbar untergeordnet und steht nicht in Konkurrenz zu den Hauptbereichen der App.

Auf schmalen Fenstern klappt die Leiste auf **Icons und Zahlen** zusammen. Die Beschriftungen entfallen, die Zahlen nicht — sie sind der Grund für die Leiste.

#### 10.8 Sammelseiten

Eine Sammelseite zeigt viele Objekte eines Typs. Sie folgt überall demselben Aufbau: **Titel · Toolbar · Inhalt · Fuß**.

##### Toolbar — feste Positionen

| Position | Inhalt |
|----------|--------|
| 1 | **Suche** — der Platzhalter nennt die durchsuchten Felder |
| 2 | **Primärfilter** — der eine dominante Filter der Sammlung, sichtbar |
| 3 | **Weitere Filter** — ein Menü, nicht mehrere Icons |
| 4 | **Ansichtswechsel** — nur bei nicht seitenwürdigen Objekten (10.1) |
| 5 | **Primäraktion** — rollenabhängig |
| 6 | **Spaltenkonfiguration** — kein Filter; beschriftet, mit Weg zurück zur Voreinstellung |

**Bindende Regel:** *Positionen rücken nicht nach.* Wer eine Aktion nicht darf, sieht die Position leer — sonst sieht die Toolbar für jede Rolle anders aus und niemand lernt, wo etwas liegt.

Der **Ansichtswechsel** ist kein Zusatzfeature, sondern die Folge daraus, dass ein kleines Objekt in seiner Sammlung gelesen wird. Die Zustände heißen **Liste** und **Lesen**, weil sie unterschiedliche Arbeitsweisen sind, nicht zwei Layouts. Objekte mit eigener Seite haben keinen Ansichtswechsel.

Es gilt weiter 8.4: **höchstens zwei unbeschriftete Icons nebeneinander.** Filter‑Voreinstellungen gehören ins Filtermenü, nicht als eigene Icons in die Toolbar.

##### Standardspalten

**Die Standardspalten beantworten die Leitfrage der Sammlung, nicht die Datenstruktur des Objekts.**

- Ein Feld, nach dem man **filtert**, muss keine Spalte sein (Industrie, Vertragsart, Region)
- Ein Feld, nach dem man **scannt**, muss eine sein
- Zwei Spalten, von denen eine aus der anderen folgt, sind **eine** Spalte

| Sammlung | Leitfrage | Standardspalten |
|----------|-----------|-----------------|
| **Deals** | Welcher Deal braucht Beweise, und wie dringend? | Account · Titel · Status · **Beweislage** · Frist · Volumen |
| **Referenzen** | Was hat das gebracht, und darf ich es teilen? | Account · Titel · **Ergebnis** · Status · Projektjahr |
| **Accounts** | Bei welchen Firmen haben wir was? | Firma · **Beweise** · Offene Deals · NDA |

**Bindende Regel:** *Die Voreinstellung ist eine Produktaussage, keine Vorliebe.* Welche Spalten beim ersten Öffnen stehen, beantwortet die Leitfrage der Sammlung. Das wird nicht ausgehandelt — ob Nutzer **danach** abweichen dürfen, ist eine andere Frage und darf mit Ja beantwortet werden.

Wo Spalten konfigurierbar sind, gilt zusätzlich:

- Die **Voreinstellung** ist die dokumentierte Auswahl aus der Tabelle oben, nicht das, was historisch gewachsen ist.
- Ein Weg **zurück zur Voreinstellung** muss erreichbar sein. Wer sich verkonfiguriert hat, darf nicht im eigenen Zustand feststecken.
- Eine geänderte Voreinstellung erreicht Bestandsnutzer **nur über einen Versionssprung im Speicherschlüssel**. Ohne ihn gilt im Browser weiter die alte Auswahl, und die Änderung wirkt nur für neue Nutzer.

**Zeitangaben in Sammlungen sind Handlungsabstände**, keine Daten: „in 4 Tagen" statt „30.04.2026". Bei abgeschlossenen Objekten entfällt die Einfärbung (siehe 9).

##### Standardsortierung

Folgt der Leitfrage **und einer sichtbaren Spalte**: **Deals nach Frist aufsteigend**, **Referenzen nach Projektjahr absteigend**. Eine unsichtbare Spalte darf die Voreinstellung nicht sortieren.

##### Auswahl und Fuß

Der Fuß ist in allen Sammlungen identisch: Auswahlzähler · Ergebnisse pro Seite · Blättern.

**Eine Auswahlspalte gibt es nur, wenn es echte Mehrfachaktionen gibt.** Aktionen, die nur bei genau einer ausgewählten Zeile funktionieren, rechtfertigen keine Mehrfachauswahl — dafür genügt der Klick auf die Zeile.

##### Leerzustand

Der Leerzustand nennt den Raum und lädt ein. **Die angebotene Aktion muss der Rolle entsprechen:** Wer nicht anlegen darf, bekommt keinen Anlegen‑Knopf, sondern den Weg, der ihm offensteht.

#### 10.9 Linsen — Objekte ohne eigenen Inhalt

Manche Objekte haben **keine eigenen Attribute**, sondern bestehen aus ihren Beziehungen. Eine Firma in RefStack ist die Summe ihrer Referenzen, Deals, Signale und ihres NDA‑Status — sonst nichts.

Solche Objekte bekommen eine **Linse**, kein Verwaltungsobjekt. Der Unterschied ist nicht kosmetisch: Eine Objektseite lädt dazu ein, Felder zu pflegen. Eine Linse zeigt, was das System bereits weiß.

**Bindende Regel:** *Eine Linse hat keine eigenen bearbeitbaren Felder.* Sie zeigt ausschließlich, was anderswo entsteht.

**Benannte Ausnahme — NDA-Erfassung:** Der NDA ist kein Attribut der Firma, sondern ein eigenes Objekt — eigene Tabelle, eigener Posteingang (`notifications/nda-inbox.ts`), eigene Treffer in der globalen Suche, eigene Zeile auf dem AM-Dashboard. Die Linse zeigt seinen Zustand und bietet den Einstieg; sie besitzt die Daten nicht. Deshalb kein Verstoß gegen „keine eigenen bearbeitbaren Felder“. Der Unterschied zum Rückfall ist prüfbar: Ein Notiz-, Strategie- oder Next-Step-Feld hätte kein eigenes Objekt hinter sich. Genau daran ist die Ausnahme zu erkennen — und `accountLensEditableControlIds()` bleibt leer, weil der NDA-Einstieg kein Linsenfeld ist.

Der Wunsch nach „Notizen", „Strategie" oder „Nächsten Schritten" an einer Linse ist das Signal, dass sie zum Verwaltungsobjekt wird. Dann greift diese Regel, nicht eine Diskussion.

**Aufnahmetest für Inhalte:** Trägt diese Information zur Kernaufgabe des Produkts bei? Bei RefStack: *Hilft sie, einen Beweis zu erzeugen oder zu platzieren?* Was nur beim **Gewinnen** des Deals hilft, gehört ins CRM — was beim **Belegen** hilft, hierher.

**Zustand vor Inhalt:** Wenn ein Zustand die Verwendbarkeit des Inhalts bestimmt — bei der Firma der NDA — steht er darüber und verändert die Darstellung des Inhalts sichtbar, nicht nur als Hinweis daneben.

---

### 11) Bausteine: wie ein Gegenstand innen aufgebaut ist

§1–§9 ordnen die Atome. §10 ordnet die Seiten. Dieser Abschnitt ordnet die Ebene dazwischen: Karte, Gruppe, Option, Hinweis, Ablagefläche, Überschrift, Leerzustand, Faktzeile. Eingeführt 19.08.2026.

#### 11.1 Die Karte

**Eine Karte ist ein Bauteil, kein Klassenbündel.** Wer einen Gegenstand mit eigenem Titel einfasst, benutzt `<Card>`. Wer Bedienelemente gruppiert, eine Option zeichnet oder einen Hinweis setzt, benutzt das dafür vorgesehene Bauteil — nicht eine Karte mit anderem Innenabstand.

**Woran man eine Karte erkennt:** Sie hat einen Gegenstand, über den sich ein Satz sagen lässt. „Freigabe-Einstellungen“ ist einer. „Die drei Umschaltknöpfe“ ist keiner.

Nicht jeder Kasten mit Rahmen ist eine Karte:

| Was | Erkennbar an | Bauteil |
|---|---|---|
| **Karte** | eigener Gegenstand, meist mit Titel | `<Card>` |
| **Gruppe** | fasst Bedienelemente zusammen, kein eigener Gegenstand | `<Group>` — oder `<TabsList>`, wo schon `role="tablist"` |
| **Option** | auswählbar, Teil einer Menge | `<Option>` |
| **Hinweis** | eine Aussage, kein Gegenstand | `<Hinweis>` |
| **Ablage** | hier kann etwas fallen gelassen werden | `<Ablage>` — gestrichelt |
| **entfällt** | Rahmen ohne Gegenstand — Dekoration | Rahmen entfernen |

**Voreinstellungen der Karte** (`components/ui/card.tsx`):

| | Wert |
|---|---|
| Radius | `rounded-lg` |
| Innenabstand | `p-4` |
| Hintergrund | `bg-card` |
| Rahmen | `border-border` |

Eine Kartenfläche, nicht mehrere. `bg-muted/20`, `/30` und `/40` sind keine Kartenhintergründe. Wer eine gedämpfte Fläche braucht, baut einen **Hinweis**.

**`CardTitle`:** Rendert ein echtes Überschriftenelement. Prop `as?: 'h2' | 'h3' | 'h4' | 'div'`, Voreinstellung **`h2`**.

- Karte als Abschnitt der Seite: `h2` (Default)
- Karte in einer Karte: `as="h3"`
- Tiefer nicht. Kein `h1` in der Karte (das bleibt die Seite, §10)
- `as="div"` nur, wo `CardTitle` nachweislich keine Überschrift ist

**Prüfkriterium:** Keine `h2` innerhalb einer anderen `<Card>`.

**Gruppe** (`components/ui/group.tsx`): `rounded-lg border border-border bg-muted p-1`. Einfassung, keine Auswahl-Logik. Segment-Schalter mit `role="tablist"` nutzen `TabsList`.

**Option** (`components/ui/option.tsx`): `rounded-md border p-2`. Ausgewählt über `has-[:checked]:` oder `data-selected="true"`. Der Aufrufer bleibt `label` / `button` / `fieldset`.

**Hinweis** (`components/ui/hinweis.tsx`): `rounded-md border p-2 text-xs`. `tone`: `muted` (Default) · `destructive` · `warning` (Status-Tokens, keine Roh-Palette). Kein `role="alert"` von selbst.

**Ablage** (`components/ui/ablage.tsx`): siehe §11.6.

**Wächter:** `npm run check:enclosures` (`scripts/check-enclosure-classes.mjs`). Meldet `rounded-*` + `border` außerhalb der Bauteile. Phase 2 (`--fail`): CI bricht ab, wenn der Zähler über der Allowlist liegt. Dauerhafte Ausnahmen: Chrome, Logo-Fallbacks. Felder nutzen `border-input` und fallen so aus dem Raster.

#### 11.2 Überschriften

**Nicht jedes fette `<p>` ist eine Überschrift.** Erkennung: *Führt das einen Abschnitt an, dessen Inhalt darunter dazugehört?* Nur dann ein Heading. Sonst:

| Was | Erkennbar an | Element |
|---|---|---|
| **Überschrift** | führt einen Abschnitt an | `h1` / `h2` / `h3` · oder `legend` in `fieldset` |
| **Beschriftung** | benennt ein Feld oder einen Wert daneben | bleibt Text; Umbau §11.4 |
| **Wert** | hervorgehobener Inhalt (Name, Zahl, Zeilentitel) | `<p>` / `<span>` |
| **Betonung** | ein Satz oder Status, kein Abschnitt | `<p>` |

`CardTitle` (§11.1) bleibt die Kartenüberschrift. Dieser Abschnitt gilt **neben** der Karte.

**Ebenen** (mit §11.1):

- **`h1` — die Seite.** Genau eines sichtbar. Nicht in der Karte. `DASHBOARD_PAGE_TITLE_CLASS` ist Optik, nicht Semantik.
- **`h2` — Abschnitt der Seite oder Objekt unter dem Seiten-h1.** Identisch mit dem `CardTitle`-Default. Eine Abschnittsüberschrift neben Karten ist `h2`, nie `h3` und nie `h1`.
- **`h3` — unter einem h2.** `CardTitle as="h3"` in Karte-in-Karte, oder ein Unterabschnitt unter einem Nicht-Karten-h2. Tiefer nicht.
- **Dialog / Sheet / Popover:** `DialogTitle` / `SheetTitle`. Kein rohes `h3` als Dialogtitel.
- **`fieldset` / `legend`:** wo die Zeile eine Gruppe von Feldern oder Optionen beschriftet, nicht einen Seitenabschnitt.

Karten-h2 und Seiten-h2 sind Geschwister. Konkurrenz entsteht nur, wenn zwei `h1` sichtbar sind oder ein `h2` die Seite spielt.

**`h1`:** eine sichtbare Arbeitsfläche, ein `h1`. Exklusive Render-Zweige derselben Route zählen als eins. Objekt in einer Pane unter der Sammlung: `h2` (wie die Account-Linse), nicht ein zweites `h1`. Token-Seiten, deren einziger Gegenstand eine Karte ist: `h1` **über** der Karte, nicht `CardTitle as="h1"`.

**Kein Klassen-Wächter.** `font-semibold` auf `<p>` ist nach der Klassifikation meist richtig. Die Regel halten diese Dokumentation und Outline-Tests (`getByRole('heading', { level })`) für repräsentative Sichten.

#### 11.3 Leerzustand eines Bausteins

§10.8 bleibt der Leerzustand der **Sammlung**: Er nennt den Raum, lädt ein, und die Aktion entspricht der Rolle. Dieser Abschnitt gilt **neben** der Sammlung — für die leere Karte, die leere Liste in einem Bereich, den Slot ohne Inhalt.

**Erkennung:** *Ist das der Zustand eines Gegenstands, der hier hingehört, aber fehlt?* Nicht: *steht `border-dashed` in der Klasse?*

| Was | Erkennbar an | Darstellung |
|---|---|---|
| **Sammlung leer** | keine Objekte dieses Typs | §10.8 — unangetastet |
| **Filter leer** | die Menge existiert, die aktuelle Suche trifft nichts | Schale bleibt, Satz „Keine Treffer“, keine Dropzone |
| **Baustein leer, Schale bleibt** | Slot ist Teil der Seitengrammatik (Home-Karte, navigierbarer Bereich, Linsen-Kern) | Schale rendern, innen ein Satz; Aktion nur wenn die Rolle sie darf |
| **Baustein leer, Abschnitt entfällt** | optionaler Kontext des Objekts (§10.2) | nicht rendern, kein „—“ |
| **Dropzone** | hier kann etwas abgelegt werden | `<Ablage>` — gestrichelt, Bedeutungsträger nur hier |
| **Laden** | Warten, nicht leer | Satz ohne Extra-Rahmen |

**Gestrichelt** heißt *hier kann etwas hin*. Bei einem leeren Baustein ist es eine geliehene Dropzone-Optik ohne Ablageziel — Rahmen ohne Gegenstand (§11.1). Provisorien („noch nicht verknüpft“) ebenfalls ohne Gestricheltes.

Drei Aussagen, keine Vereinheitlichung: Filter „Keine Treffer“ · noch nie „Noch keine {Gegenstand}“ · Formular optional „Keine Angabe“.

`HonestEmpty` bleibt der Aufrufer für Home-Karten und trägt **keine** Extra-Einfassung. Tabellen-, KPI- und Identitäts-`—` (feste Spalte, festes Raster) sind keine Felder mit Gedankenstrich im Sinne von §10.2.

#### 11.4 Schlüssel-Wert

**Nicht jedes Label über einem Wert ist eine Faktzeile.** Erkennung: *Benennen Schlüssel und Wert denselben Fakt eines Gegenstands?* Nur dann eine Beschreibungsliste. Sonst:

| Was | Erkennbar an | Element |
|---|---|---|
| **Faktzeile** | Label + Wert eines Objekts | `<dl>` / `<dt>` / `<dd>` |
| **Metrik** | Zahl mit Kicker in festem Raster | `<p>` über `<p>` |
| **Spalten-Kicker** | 10px über einer Tabellenzelle | `<p>` |
| **Switch-Zeile** | Beschriftung eines Controls | `<Label>` oder `<p>` |
| **Eyebrow** | kleine Zeile über einem Titel | `<p>` |
| **Gruppenlabel** | 10px-Label in einer Ergebniskarte | Text, kein Heading |
| **Formularfeld** | benennt ein Input | `<Label>` — keine zusätzliche Regel |

Kein Bauteil. Eine Zeile fasst nichts ein. Markup wie in den Stammdaten (WHATWG: `div`-Wrapper in `dl` sind zulässig):

- Gestapelt: `dt` oben, `dd` darunter (Raster)
- Inline: dieselbe `dl`, `div` mit `flex justify-between` (Deal-Fakten)
- Ein Paar in einer Menge: Teil derselben `dl`, nicht eine Mini-Karte

**Kein Klassen-Wächter.** `text-xs uppercase` trifft Eyebrows und Metriken. Die Regel halten diese Dokumentation und Outline-Tests (`getByRole('term')`) für repräsentative Sichten.

#### 11.5 Generator-Fläche `components/ui`

`knip.json` ignoriert ungenutzte **Exporte und Typen** unter `components/ui/**`, nicht ungenutzte **Dateien**. Der Ordner ist Vokabular, keine Verwendungsliste: ein Slot ohne Aufrufer (Sidebar\*, ContextMenu\*, `CardFooter`, `SelectScrollDownButton`, …) bleibt Teil des Primitivs, damit `npx shadcn add` und `shadcn diff` die Datei wiedererkennen. Ein entferntes `export` wäre eine ungenutzte lokale Funktion — das hieße löschen, und der Generator füllt den Slot wieder auf.

Die Karte (§11.1) sitzt in derselben Fläche. `card.tsx` ist mit eigenen Klassen (`rounded-lg`, `p-4`, `border-border`) und dem `as`-Prop an `CardTitle` bereits ein Fork; solange `shadcn diff` die Datei noch sinnvoll vergleicht, gilt die Ausnahme weiter. Sobald ein Primitiv so weit umgebaut ist, dass der Vergleich nichts mehr trägt, ist die Datei unsere und fällt aus `ignoreIssues`.

**Copy-Wächter:** `npm run check:copy` (`scripts/check-copy-keys.mjs`). Zählt Blatt-Schlüssel in `lib/copy.ts` gegen Leser in `app/`, `components/`, `lib/` und `hooks/`. Die Prüfung läuft am **Pfad** (`accounts.title`), nicht am letzten Bezeichner (`title`): gleichnamige Blätter in verschiedenen Gruppen maskieren sich sonst gegenseitig — eine Namensprüfung meldete 75 ungelesene Schlüssel, die Pfadprüfung 141. `--fail` in CI scheitert nur bei ungelesenen Blättern.

Aufgelöst werden direkte Ketten (`COPY.a.b.c`), dynamischer Zugriff (`COPY.a.b[ausdruck]` wertet den Teilbaum `a.b` vollständig als gelesen) und lokale Aliase (`const c = COPY.a.b`, danach `c.key`). Ein Alias, der die Datei verlässt (exportiert oder weitergereicht), wertet den Teilbaum als gelesen.

**Nicht auflösbar** sind Zugriffe, denen der Wächter keinen Pfad zuordnen kann — etwa `COPY[variable]` oder Destrukturierung. Sie werden gezählt und namentlich ausgegeben, lassen den Lauf aber grün. Ein Wächter, der Fehlalarme produziert, wird ignoriert.

#### 11.6 Die Ablagefläche

**Eine Ablage ist ein Bauteil, kein gestrichelter Kasten.** Wer eine Fläche zeichnet, auf der Dateien landen sollen, benutzt `<Ablage>`. Wer einen Gegenstand mit Titel einfasst, bleibt bei der Karte.

**Woran man eine Ablage erkennt:** Sie bedeutet *hier kannst du etwas fallen lassen*. Die Form trägt die Bedeutung: `border-dashed` statt durchgezogen. Ein leerer Baustein, der gestrichelt aussieht, ohne Ablageziel zu sein, ist geliehene Optik — Rahmen ohne Gegenstand (§11.1, §11.3).

Nicht jede gestrichelte Fläche ist eine Ablage, und eine Ablage ist keine Karte:

| Was | Erkennbar an | Bauteil |
|---|---|---|
| **Karte** | eigener Gegenstand, meist mit Titel | `<Card>` — durchgezogener Rahmen |
| **Ablage** | Dropziel, kein eigener Gegenstand | `<Ablage>` — gestrichelt |
| **Baustein leer** | Slot ohne Inhalt, nichts abzulegen | Schale bleibt, Satz innen, kein Gestricheltes |

**Voreinstellungen** (`components/ui/ablage.tsx`):

| | Wert |
|---|---|
| Radius | `rounded-lg` |
| Rahmen | `border-2 border-dashed` |
| Ruhe | `border-muted-foreground/30 bg-muted/20` |
| Aktiv (Datei schwebt) | `border-primary bg-primary/5` |
| Deaktiviert | `opacity-60`, keine Zeigerereignisse |

Die drei Zustände sind die, die die Aufrufer brauchen. Innenabstand, Ausrichtung und Inhalt setzt der Aufrufer. Die Ablage-Logik (Drag, Dateiprüfung, Fortschritt) bleibt beim Aufrufer — das Bauteil fasst ein, es empfängt nicht.

**Prüfkriterium:** Kein `rounded-*` + `border-dashed` außerhalb von `<Ablage>`. Der Wächter (§11.1) zählt das.
