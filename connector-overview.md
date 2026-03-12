# Connector Overview – refstack

> Erstellt am: 2026-03-12 | Getestet mit echten API-Calls gegen alle 5 Konnektoren

---

## Status-Übersicht

| Konnektor   | Status        | Getestet am  | Ergebnis                                              |
|-------------|---------------|--------------|-------------------------------------------------------|
| GitHub      | ✅ Verbunden  | 2026-03-12   | Repo `sales-app` gelesen, Struktur vollständig        |
| Supabase    | ✅ Verbunden  | 2026-03-12   | 15 public Tables, Projekt ACTIVE_HEALTHY              |
| Vercel      | ✅ Verbunden  | 2026-03-12   | Deployment `sales-app` READY (production)             |
| Jira        | ✅ Verbunden  | 2026-03-12   | 2 Projekte, 13 Issues auf refstack.atlassian.net      |
| Shadcn UI   | ✅ Verbunden  | 2026-03-12   | 56 Komponenten verfügbar, 22 bereits installiert      |

---

## GitHub

**Status:** ✅ Verbunden
**Repo:** `julienklobedanz/sales-app` (lokal als `refstack` gespeichert)
**Remote URL:** `git@github.com:julienklobedanz/sales-app.git`
**Branch:** `main`

**Verfügbare Funktionen für refstack:**
- Repo-Struktur lesen und analysieren (Dateien, Verzeichnisse, Branches)
- Code-Änderungen committen und pushen über CLI / Git-Tools
- Pull Requests erstellen und reviewen
- GitHub Actions für CI/CD-Pipelines konfigurieren (Build, Test, Deploy → Vercel)
- Issues direkt aus Jira-Tickets via Branch-Naming verknüpfen
- `.env.local` und Secrets sicher über GitHub Secrets verwalten

**Repo-Struktur (vorgefunden):**

```
refstack/
├── app/                          # Next.js App Router
│   ├── approval/[token]/         # Freigabe-Flow mit Token
│   ├── auth/callback/            # Supabase Auth Callback
│   ├── dashboard/                # Haupt-Dashboard
│   │   ├── companies/            # Unternehmensansicht
│   │   ├── deals/                # Deal-Verwaltung
│   │   ├── edit/                 # Referenz bearbeiten
│   │   ├── entwuerfe/            # Entwürfe-Bereich
│   │   ├── favorites/            # Favoriten
│   │   ├── new/                  # Neue Referenz anlegen
│   │   ├── request/              # Anfragen stellen
│   │   ├── requests/             # Anfragen verwalten
│   │   └── settings/             # Einstellungen
│   ├── login/                    # Login-Seite
│   ├── onboarding/               # Onboarding-Flow
│   ├── p/[slug]/                 # Öffentliche Referenz-Seite (Public Portfolio)
│   └── register/                 # Registrierung
├── components/
│   ├── dashboard/
│   │   └── SupportTicketModal.tsx
│   └── ui/                       # 22 Shadcn-Komponenten installiert
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser-Client
│   │   └── server.ts             # Server-Client (SSR)
│   ├── slug.ts
│   └── utils.ts
├── hooks/
│   └── use-mobile.ts
├── docs/                         # 4 Markdown-Dokumente (Session-Notizen)
├── .env.local                    # Lokale Env-Vars (Supabase URL + Keys)
├── .env.example
├── components.json               # Shadcn Konfiguration
├── next.config.ts
└── package.json                  # Next.js 14, Supabase, OpenAI, pdf-parse
```

**Schlüssel-Dependencies (package.json):**
`next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `openai`, `pdf-parse`, `jszip`, `lucide-react`, `radix-ui`, `next-themes`, `date-fns`

---

## Supabase

**Status:** ✅ Verbunden
**Projekt:** RefStack (`oxxzczmibzyusonwzdvc`)
**Region:** `eu-central-1` (Frankfurt)
**DB-Version:** PostgreSQL 17.6
**Projekt-Status:** `ACTIVE_HEALTHY`

**Verfügbare Funktionen für refstack:**
- Datenbank-Migrations erstellen und anwenden (`apply_migration`)
- SQL-Abfragen direkt ausführen (`execute_sql`)
- Tabellen auflisten, Schema inspizieren (`list_tables`)
- Edge Functions deployen (Serverless-Logik)
- TypeScript-Typen aus dem Schema generieren (`generate_typescript_types`)
- RLS-Policies prüfen und Security-Advisories abrufen
- Branching für sicheres Feature-Entwickeln (Staging-DB)
- Auth-Nutzer und Sessions verwalten

**Gefundene Tabellen/Schemas:**

*Schema: `public` (Kerndaten der Applikation — alle mit RLS)*

| Tabelle               | Zeilen | Schlüssel-Spalten                                                        |
|-----------------------|--------|--------------------------------------------------------------------------|
| `companies`           | 28     | id, name, industry, logo_url, organization_id, website_url               |
| `references`          | 7      | id, company_id, title, summary, full_text, industry, country             |
| `approvals`           | 1      | id, reference_id, status, requester_id                                   |
| `profiles`            | 3      | id, full_name, role, organization_id                                     |
| `contact_persons`     | 9      | id, first_name, last_name, email, position, avatar_url                   |
| `favorites`           | 1      | id, user_id, reference_id                                                |
| `organizations`       | 3      | id, name                                                                 |
| `organization_invites`| 3      | id, organization_id, email, token, invited_by, expires_at               |
| `deals`               | 5      | id, organization_id, title, company_id, industry, volume, is_public, account_manager_id |
| `deal_references`     | 1      | deal_id, reference_id                                                    |
| `reference_assets`    | 0      | id, reference_id, file_path, file_name, file_type, category             |
| `tickets`             | 0      | id, user_id, type, subject, message, status                             |
| `stakeholders`        | 5      | id, company_id, name, role, title, influence_level, attitude, notes     |
| `company_strategies`  | 0      | id, company_id, main_goals, red_flags, competitive_situation, next_steps |
| `external_contacts`   | 1      | id, organization_id, company_id, first_name, last_name, email, role     |
| `shared_portfolios`   | 0      | id, slug, reference_ids, is_active, view_count                          |

*Schema: `auth` — 4 registrierte User, 61 aktive Sessions, 122 Refresh Tokens*
*Schema: `storage` — Buckets vorhanden, noch keine Objekte hochgeladen*

---

## Vercel

**Status:** ✅ Verbunden
**Projekt:** `sales-app` (entspricht GitHub-Repo `julienklobedanz/sales-app`)
**Team:** `julienklobedanz's projects` (`team_LEb4BlEMeOmP7w9QAC872xh5`)
**Framework:** Next.js
**Node-Version:** 24.x

**Verfügbare Funktionen für refstack:**
- Deployments auslösen und Status überwachen
- Build-Logs und Runtime-Logs abrufen (Debugging)
- Environment Variables verwalten (Supabase Keys, OpenAI Key etc.)
- Preview-Deployments für Feature-Branches (automatisch bei Push)
- Custom Domains zuweisen
- Vercel Toolbar Feedback-Threads einsehen und beantworten
- Edge Functions und Middleware konfigurieren

**Deployment-Status:**

| Feld              | Wert                                                                 |
|-------------------|----------------------------------------------------------------------|
| Deployment ID     | `dpl_HbzLQ8VNzewwJY7Rp1VSDC5trD7u`                                 |
| Status            | ✅ **READY** (production)                                            |
| URL (neuestes)    | `sales-848251jv9-julienklobedanzs-projects.vercel.app`              |
| Primär-Domain     | `sales-app-fawn.vercel.app`                                          |
| `live`            | `false` (kein aktiver Live-Traffic zugewiesen)                      |

---

## Jira

**Status:** ✅ Verbunden
**Site:** `refstack.atlassian.net`
**Cloud-ID:** `6c8a0515-63a9-4cae-bbda-db57f106b107`
**Scopes:** `read:jira-work`, `write:jira-work`

**Verfügbare Funktionen für refstack:**
- Issues erstellen, bearbeiten, kommentieren und Status-Transitionen durchführen
- JQL-Suchen über alle Projekte ausführen
- Issues mit Jira-Issues verknüpfen (Blocks, Relates, Duplicate)
- Worklogs / Zeiterfassung eintragen
- Projekte auflisten und Issue-Typen abfragen
- Issues automatisch aus Code-Kommentaren oder Deployments heraus anlegen

**Gefundene Projekte/Issues (13 Issues total):**

*Projekt 1: **KAN – RefStack** (Kanban, Software, öffentlich)*

| Key    | Titel        | Typ      | Status      |
|--------|--------------|----------|-------------|
| KAN-1  | Aufgabe 1    | Task     | Backlog     |
| KAN-2  | Aufgabe 2    | Feature  | In Arbeit   |
| KAN-3  | Sub-Task 2.1 | Subtask  | Backlog     |

Issue-Typen verfügbar: Epic, Task, Feature, Bug, Subtask

*Projekt 2: **SAM1 – (Example) Billing System Dev** (Beispiel-Projekt, 10 Issues)*
Enthält Demo-Issues (Implement User Authentication, Market Analysis Tools, etc.) — kein produktiver Inhalt.

---

## Shadcn UI

**Status:** ✅ Verbunden
**Framework:** React / TypeScript (Next.js App Router)
**Konfiguration:** `components.json` im Repo vorhanden

**Verfügbare Funktionen für refstack:**
- Beliebige der 56 Registry-Komponenten abrufen und in `components/ui/` installieren
- Komponenten-Demos und Beispielcode abrufen
- Themes aus der TweakCN-Bibliothek anwenden (Farbpalette, Typografie)
- Block-Templates (Login, Dashboard, Sidebar, Kalender) als Ausgangspunkt nutzen
- Komponentenmetadaten (Dependencies, Variants) einsehen

**Bereits im Projekt installiert (22 Komponenten in `components/ui/`):**
`alert-dialog`, `avatar`, `badge`, `button`, `card`, `command`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`

**Noch nicht installiert (Auswahl aus 56 verfügbaren):**
`accordion`, `calendar`, `carousel`, `chart`, `checkbox`, `combobox`, `drawer`, `form`, `pagination`, `progress`, `radio-group`, `slider`, `navigation-menu`, `breadcrumb`, `resizable`, u.v.m.

---

## Empfohlene kombinierte Workflows

### 1. Feature-Entwicklung von Jira bis Production
`Jira` → `GitHub` → `Vercel` → `Supabase`

Ein neues Jira-Issue im KAN-Board anlegen (z.B. KAN-4 "Shared Portfolio Seite"), einen Feature-Branch `feat/KAN-4-shared-portfolio` auf GitHub erstellen, die Logik mit bestehender Supabase-Tabelle `shared_portfolios` verbinden (aktuell 0 Rows — bereit für Implementierung), Vercel erstellt automatisch ein Preview-Deployment für den Branch. Nach Review: Merge → Production-Deploy auf `sales-app-fawn.vercel.app`.

### 2. Neues UI-Feature mit Shadcn Komponenten ausbauen
`Shadcn UI` → `GitHub` → `Vercel`

Die `company_strategies`-Tabelle (0 Rows, noch nicht genutzt) mit einem neuen Dashboard-Bereich ausbauen: `form` + `textarea` + `card` aus Shadcn UI installieren, in `app/dashboard/companies/` integrieren, direkt auf Vercel Preview testen. Kein Supabase-Schema-Change nötig — Tabelle existiert bereits.

### 3. Datenbank-Migration sicher ausrollen
`Supabase Branching` → `GitHub` → `Vercel`

Neue Spalten oder Policies über `apply_migration` auf einem Supabase-Branch testen, parallel dazu einen GitHub Feature-Branch pflegen, Vercel Preview-Deployment zeigt den Stand mit Test-DB. Erst nach Abnahme: Supabase-Branch mergen + GitHub-Branch mergen → atomares Rollout.

### 4. Bug-Tracking: Produktionsfehler direkt in Jira
`Vercel Runtime Logs` → `Jira` → `GitHub`

Vercel Runtime-Logs auf Fehler (500er, Edge-Function-Crashes) überwachen, direkt ein Jira-Issue im KAN-Board anlegen (Typ: Bug), Fix-Commit mit Issue-Referenz (`KAN-5`) auf GitHub pushen — Vercel deployed automatisch auf Production sobald Merge erfolgt.

### 5. Portfolio-Sharing Feature (komplett end-to-end)
`Supabase` → `Shadcn UI` → `GitHub` → `Vercel` → `Jira`

Die bestehende Tabelle `shared_portfolios` (Spalten: slug, reference_ids, is_active, view_count) mit einem Share-Dialog ausbauen: Shadcn `dialog` + `input` + `badge` für die UI, Supabase RLS für Zugriffssteuerung, Route `app/p/[slug]/` existiert bereits im Repo. Jira-Issue für Tracking, Vercel Preview für Stakeholder-Review vor Launch.

---

## Verknüpfte Dokumente

- [[analyse-nutzer-organisation-daten]] — Bestehende Analyse der User-/Org-Datenstruktur (passt zu Supabase-Findings)
- [[arbeitspakete-freigabe-rollen-settings-deals]] — Arbeitspakete für Freigabe-Flow und Deals (deckt sich mit `approvals`- und `deals`-Tabellen)
- [[session-referenz-detailansicht-aenderungen]] — Letzte Session-Notizen zur Referenz-Detailansicht
- [[session-referenz-formular-aenderungen]] — Letzte Session-Notizen zum Referenz-Formular
