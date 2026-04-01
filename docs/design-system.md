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

- **Keine Raw‑Tailwind‑Paletten** in App‑Screens (`green-600`, `slate-*`, `zinc-*`, …): semantische Utilities (`text-primary`, `text-muted-foreground`, `bg-muted`, `border-border`, `text-destructive`, …) oder UI‑Variants nutzen. Ein gezielter Sweep in `app/` hat die letzten offensichtlichen Stellen bereinigt; bei neuen Features gleich Tokens verwenden.
- **`components/` (App‑Ebene, nicht `ui/`):** Eigenes Markup nutzt durchgängig semantische Klassen (`auth-shell`, Status‑Badges, `SupportTicketModal`, …). Generierte **Shadcn‑Primitives** unter `components/ui/*` dürfen `dark:`‑Varianten und z. B. **Overlay‑Scrims** (`bg-black/50` / `bg-black/80`) sowie `text-white` auf **destructive**‑Buttons enthalten – das sind etablierte Muster; nur bei gezieltem Theme‑Tuning anfassen (visuell testen).
- **Copy:** wiederkehrende Labels weiter über `lib/copy.ts` (`COPY`) führen; Rollen/Nav sind dort bereits vorhanden.
- **Badges:** Status über die zentralen `*StatusBadge`‑Komponenten; Variant‑Semantik siehe Abschnitt 5.

