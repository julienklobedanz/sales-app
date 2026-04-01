# AI Coding Agent Guide (Refstack)

**Zweck:** Dieses Dokument ist die **Orientierung für jede Coding-Session** (menschlich oder KI). Ziel ist, dass die Codebasis **strukturiert**, **designkonform** und **wartbar** wächst – ohne unnötige technische Schulden.

**Verwendung:** Zu Beginn einer Session den Agent auf diese Datei verweisen (z. B. `@docs/ai-coding-agent-guide.md`) oder Inhalt in den Chat einfügen. Ergänzend: `docs/design-system.md`, `docs/qc-struktur-plan.md`, `docs/refactoring-zusammenfassung.md`.

---

## 1. Stack & Rahmen

| Bereich | In diesem Projekt |
|--------|-------------------|
| Framework | **Next.js** (App Router), **React** |
| Styling | **Tailwind CSS v4**, Design-Tokens über CSS-Variablen |
| UI | **Shadcn/Radix** unter `components/ui/*` |
| Daten | **Supabase** (Client/Server nach bestehenden Patterns) |
| Icons | **Hugeicons** über zentralen Adapter `lib/icons.tsx` (`AppIcon`) – keine verstreuten Raw-Icon-Libraries in neuen Features |
| Validierung | **Zod**, Formulare oft **react-hook-form** |

---

## 2. Nicht verhandelbare Prinzipien

### 2.1 Scope & Änderungsdisziplin

- **Nur das tun, was die Aufgabe verlangt.** Keine „mitgenommenen“ Refactors in unbeteiligten Dateien.
- **Vor dem Editieren lesen:** Bestehende Namensgebung, Typen, Import-Stil und Abstraktionsebene übernehmen.
- **Wiederverwenden** statt parallel neue Helfer für dasselbe Problem (Copy, Formatierung, Badges).

### 2.2 Design System einhalten

Vollständige Regeln: **`docs/design-system.md`**. Kurz:

- **Farben:** Keine Hardcodes wie `slate-500`, `zinc-900`, `red-600` in App-Screens. Semantische Tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`, `bg-accent`, `text-primary`, `text-destructive`, …
- **Theme:** Über **`next-themes`** / bestehende Provider – kein zweites, paralleles Theme-System erfinden.
- **Neue UI-Varianten:** In `components/ui/*` (z. B. `cva`), nicht als lange `className`-Ketten nur in einer Page.
- **Status:** Zentrale Badge-Komponenten nutzen, keine neuen Ad-hoc-Chips für dieselben Domänen:
  - `components/reference-status-badge.tsx`
  - `components/deal-status-badge.tsx`
  - `components/ticket-status-badge.tsx`  
  Variant-Semantik: `default` / `secondary` / `outline` / `destructive` nach **Bedeutung**, nicht nach Geschmack (siehe Design-Doc).

### 2.3 Copy & Sprache (UI)

- Nutzersichtbare Texte im Dashboard: **durchgängig Deutsch**, professionell, konsistent.
- Wiederkehrende Begriffe (Navigation, Seitentitel, „Treffer“, Rollen, Arbeitsbereich): **`lib/copy.ts` (`COPY`)** erweitern oder nutzen – nicht überall neu formulieren.
- Keine englischen Standard-Strings in UI („No results“, „Submit“) ohne bewusste Ausnahme; bestehende DataTable-/Empty-State-Patterns beachten.

### 2.4 Icons

- Neue oder geänderte Icons: **`AppIcon`** aus `lib/icons.tsx` mit den dort definierten Hugeicons-Exports – Importnamen mit Repo abgleichen (Build bricht bei falschen Exportnamen).

### 2.5 Formatierung & Hilfsfunktionen

- Datums-/Zahlenformatierung: **`lib/format.ts`** prüfen (`formatDateUtcDe`, `formatNumberDe`, …) bevor neue Duplikate entstehen.

---

## 3. Architektur & Dateistruktur

### 3.1 Server Actions (Next.js)

- **Große Einstiegsdateien** (z. B. `app/dashboard/actions.ts`): Öffentliche API als dünne **Wrapper**; Implementierung in **Modulen** (z. B. `app/dashboard/references/*.ts`).
- **Hinweis aus QC:** Re-Exports von Server Actions aus Submodulen können Build/Turbopack-Probleme machen – **delegieren** (`export async function x() { return xImpl() }`) statt blind re-exporten (Details: `docs/qc-struktur-plan.md`).
- Rückgaben: Einheitlich **`{ success, error?, … }`** wo im Projekt etabliert; Fehler dem Nutzer per **Toast** o. Ä. sichtbar machen, nicht verschlucken.

### 3.2 „God-Files“ vermeiden

- Neue Logik nicht endlos in eine Page packen. **Domain-nah** auslagern (`lib/domain/*`, `app/dashboard/<bereich>/*.ts`), UI-Komponenten **klein und zusammensetzbar** (vgl. Deal-Sidebar-Split in QC-Plan).
- Wenn eine Datei **UI + mehrere Dialoge + schwere Datenlogik** mischt: **Sliceweise** extrahieren (wie im QC-Plan beschrieben), nicht alles auf einmal umbauen.

### 3.3 UX-Patterns

- **Detailseiten:** Main + **Sidebar** (Evidence/Deals als Referenz).
- **Listen:** DataTable + **eine** Toolbar-Zeile; Loading über **`loading.tsx`** wo üblich.
- **Konsistenz** vor Eigenbrötlerei: bestehende Layouts (`dashboard-shell`, Header, Tabellen) nachahmen.

---

## 4. Qualität vor „fertig“

Vor Abschluss einer relevanten Änderung (immer wenn möglich):

```bash
npm run lint
npm test
npm run build
```

- **Lint-Warnungen** nicht ignorieren, außer es gibt einen dokumentierten Grund (z. B. Library-Limit) und minimalen Scope (`eslint-disable-next-line` mit Kurzkommentar).
- **Typen:** `any` nicht als Default; bestehende Typen aus `lib/` / Supabase-Generierung nutzen.

---

## 5. Was Agenten explizit **nicht** tun sollen (Schulden vermeiden)

| Verhalten | Stattdessen |
|-----------|-------------|
| Neue Feature-Logik nur in `page.tsx` mit 800 Zeilen | Helfer/Module + kleine Komponenten |
| Farben und Abstände „mal schnell“ hardcoden | Tokens + `components/ui` |
| Jeden Status mit neuem `Badge`-Styling | `*StatusBadge` + Variant-Semantik |
| Englische Strings für Endnutzer | `COPY` + Deutsch |
| Lucide/Hugeicons direkt überall importieren | `AppIcon` / zentrale Icon-Datei |
| Server Actions beliebig re-exporten | Wrapper-Pattern laut QC-Plan prüfen |
| Aufgeräumte Bereiche „nebenbei“ umbauen | Separater Task, eigenes Review |

---

## 6. Datenbank & Migrationen

- Schemaänderungen: **Supabase-Migrationen** im Repo (`supabase/migrations/`), nicht nur lokal.
- Keine sensiblen Secrets in Code; `.env.local` / geheime Werte nie committen.

*(Security-Härtung und produktive API-Keys sind out of scope dieses Guides, aber Grundlagen gelten.)*

---

## 7. Dokumentation im Repo

| Datei | Inhalt |
|-------|--------|
| `docs/design-system.md` | Tokens, UI, Icons, Copy, Badges |
| `docs/qc-struktur-plan.md` | Struktur-Ziele, Refactor-Slices, Server-Action-Hinweise |
| `docs/refactoring-zusammenfassung.md` | Historische Übersicht Benefits |
| `docs/ai-coding-agent-guide.md` | **Dieser Guide** – Session-Standard |

**Regel:** Keine neuen „Parallel-Dokumente“ für dieselben Regeln anlegen. Bestehende Docs **aktualisieren**, wenn sich Konventionen ändern (z. B. neue Badge-Variant).

---

## 8. Checkliste am Ende einer Session

- [ ] Änderung **fokussiert**; keine unnötigen Dateien berührt?
- [ ] **Design:** Tokens, keine Raw-Farben; Badges/Copy wo passend?
- [ ] **Lint & Build** grün (wenn im Setup möglich)?
- [ ] **Server Actions / API** dem bestehenden Muster folgend?
- [ ] Bei neuen **sichtbaren** Begriffen: `COPY` oder bewusste Ausnahme dokumentiert?

---

## 9. Kurzfassung (eine Zeile)

**Refstack wächst professionell, wenn jede Änderung dem Design System, `COPY`, zentralen Badges/Icons/Format-Helfern und schlanken Server-Action-Strukturen folgt – mit Lint/Build als Minimum und ohne Scope-Creep.**

---

*Version: 1.0 – abstimmen mit `docs/design-system.md` und Team-Entscheidungen; bei Abweichungen zuerst Design-Doc anpassen, dann Code.*
