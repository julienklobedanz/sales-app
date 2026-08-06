# Technische Bestandsaufnahme (Pages) – Refstack

**Stand:** Juni 2026 · **27 Pages** (`app/**/page.tsx`)

Ziel: Pro Page/Routing-Screen eine **rein technische** Einschätzung, was **derzeit nicht funktionieren kann** (fehlende APIs/DB/RLS/Env/Platzhalter) und was **hardcodiert** bzw. bewusst „Demo“ ist.

Grundlage:

- Next.js **App Router** (`app/**/page.tsx`)
- Auth/Daten primär über **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`)
- Pfade zentral über `lib/routes.ts` (`ROUTES`)
- Sidebar-Navigation: [`app/dashboard/dashboard-shell.tsx`](app/dashboard/dashboard-shell.tsx)

> Hinweis zur Methodik: Statisches Code-Review der Page-Entry-Points und Actions. Für End-to-End-Verifikation (RLS, RPCs, Migrationsstand, Runtime-Env) ist ein Lauf mit echter DB/Env nötig.

### Legende (Status pro Page)

| Status        | Bedeutung                                                          |
| ------------- | ------------------------------------------------------------------ |
| **OK**        | Bei korrekter DB/RLS und gesetzter Env nutzbar                     |
| **Teilweise** | Funktioniert mit Einschränkungen, Demo-Fallback oder fehlender Env |
| **Blockiert** | Env/Platzhalter verhindert Nutzung zuverlässig                     |
| **Nur Info**  | Keine eigene Funktionalität, nur Verweis/Übersicht                 |

---

## 0) Globale technische Voraussetzungen / Blocker

Diese Punkte betreffen viele Pages gleichzeitig (weil Auth/Server-Actions/Integrationen zentral sind).

### 0.1 Supabase Basis-Konfiguration

- **Erforderlich**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Hinweis**: Beide Werte sind in `.env.example` bereits **vorbelegt** (für lokale Setups). Technisch kritisch wird es vor allem, wenn sie in der tatsächlichen Laufzeitumgebung (z. B. Vercel) **nicht gesetzt** oder **falsch** sind.
- **Auswirkung bei Fehlen**: Auth-Checks, DB-Reads/Writes, Middleware/Callback brechen bzw. funktionieren nicht.

### 0.2 App-URL für Links aus E-Mails

- **Benutzt**: `NEXT_PUBLIC_APP_URL`
- **Fallbacks (hardcodiert)**: teils `http://localhost:3000` als Default (z. B. in Actions).
- **Hinweis**: `NEXT_PUBLIC_APP_URL` ist in `.env.example` bereits **vorbelegt**. Wenn die Variable dennoch fehlt/leer ist (oder auf eine falsche Domain zeigt), entstehen kaputte Links (Reset/Einladung/Approval) oder es gibt eine explizite Fehlermeldung.
- **Auswirkung bei Fehlen**: Passwort-Reset/Einladungen/Approval-Links können falsche Ziele erzeugen oder werden blockiert (teils explizite Fehlermeldung).

### 0.3 Resend (E-Mail Versand)

- **Benutzt**: `RESEND_API_KEY` (teils auch `RESEND_FROM`)
- **Hinweis**: `RESEND_API_KEY` und `RESEND_FROM` sind in `.env.example` bereits **gesetzt** (Default/Tests). Für produktive Zustellung braucht `RESEND_FROM` eine verifizierte Absender-Domain.
- **Auswirkung bei Fehlen**: Einladungen/Benachrichtigungen/Workflows, die E-Mails versenden, funktionieren nicht.

### 0.4 OpenAI (KI/Analyse/Extraktion)

- **Benutzt**: `OPENAI_API_KEY` (nur Server-seitig via `process.env`)
- **In `.env.example`**: Platzhalter leer — muss pro Umgebung gesetzt werden
- **Lokal (`.env.local`, Stand Prüfung)**: Key ist **gesetzt**; Dev-Server nach Änderung neu starten
- **Separat**: Supabase Edge Function `supabase/functions/generate-embedding` braucht `OPENAI_API_KEY` als **Supabase Secret** (nicht nur `.env.local`)

**Verdrahtung im Code (Auszug):**

| Feature                           | Modul/Route                                      | Ohne Key                      |
| --------------------------------- | ------------------------------------------------ | ----------------------------- |
| Intelligente Suche (Embeddings)   | `app/dashboard/references/match.ts`              | Harte Fehlermeldung           |
| KI-Zusammenfassung / Magic Import | `lib/document-extraction.ts`, Evidence Form      | Fehler / übersprungen         |
| RFP-Analyse API                   | `app/api/rfp/analyze/route.ts`                   | Deaktiviert (503)             |
| KI-Entwurf Stream                 | `app/api/ki-entwurf/stream/route.ts`             | Fehler                        |
| Deal Desk Analyse                 | `app/api/deal-desk/analyze/route.ts`             | **Mock-Demo** statt echter KI |
| Referenz anonymisieren            | `app/dashboard/evidence/[id]/actions.ts`         | Regel-Fallback ohne KI        |
| Intro-Strategie Market Signals    | `app/api/market-signals/intro-strategy/route.ts` | Heuristik statt OpenAI        |
| DB-Embedding-Trigger              | `supabase/functions/generate-embedding`          | `MISSING_OPENAI_API_KEY`      |

- **Auswirkung bei Fehlen/Quota**: Je nach Feature harte Fehler, Heuristik oder Demo-Fallback (Deal Desk).

### 0.5 Market Signals (org-weite Jobs / Cron)

- **Benutzt**: `SUPABASE_SERVICE_ROLE_KEY` (org-weiter Zugriff), Cron/Feature-Flags (z. B. `CRON_SECRET`, diverse `*_DISABLED` Flags)
- **Hinweis**: `MARKET_SIGNALS_DIGEST_SKIP_TIME_WINDOW` ist in `.env.example` bereits **gesetzt** (speziell für Vercel Hobby / tägliche Cron-Ausführung). Das ist kein Blocker, sondern ein bewusstes Scheduling-Verhalten.
- **Auswirkung bei Fehlen**: Ingest/Digest/Signale abrufen können teilweise nicht funktionieren.

### 0.6 Push Notifications

- **Benutzt**:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Client)
  - `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (Server)
- **Auswirkung bei Fehlen**: Browser-Push (Market Signals) nicht nutzbar.

### 0.7 Stripe Billing

- **Benutzt** (Auszug): `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PRO`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_BILLING_RETURN_URL`
- **Auswirkung bei Fehlen**: Billing/Subscription-Features in Settings nicht funktionsfähig.

### 0.8 Schema/Migrations-/RLS-Stand

- **Auswirkung**: Viele Pages gehen von Tabellen/RPCs/Spalten aus (z. B. `profiles.organization_id`, Onboarding RPCs). Wenn Migration/RPC fehlt oder RLS blockt, sind einzelne Flows technisch nicht funktionsfähig.
- **Neu relevant**: Deal Desk Tabellen (`deal_desk_projects`, `deal_desk_documents` — Migrationen ab `20260520120000_*`)

### 0.9 Aktueller Env-Stand lokal (`.env.local`) — Lücken

Gesetzt (Stand Prüfung): Supabase (URL, Anon, Service Role), Resend, **OpenAI**.

**Noch nicht in `.env.local` — blockiert konkrete Flows:**

| Variable                                      | Betroffene Funktion                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                         | **Passwort-Reset** (`forgot-password/actions.ts` — expliziter Fehler)   |
| `REFERENCE_MANAGER_EMAIL`                     | **Referenzbedarf melden** aus Deal (`deals/actions.ts`)                 |
| `RESEND_FROM`                                 | Fallback `onboarding@resend.dev` in Code (Tests ok, Prod eingeschränkt) |
| `NEXT_PUBLIC_VAPID_*` / `VAPID_PRIVATE_KEY`   | Browser-Push in Settings                                                |
| `STRIPE_*`                                    | Billing/Checkout in Settings                                            |
| `BRANDFETCH_API_KEY` / `BRANDFETCH_CLIENT_ID` | Firmen-Autocomplete/Enrichment                                          |
| `CRON_SECRET`                                 | Vercel-Cron in Production                                               |

---

## 1) Pages – Einstieg & Auth

### `/` – `app/page.tsx`

- **Funktionen**
  - Server-seitiger Auth-Check via Supabase → Redirect nach `ROUTES.home` oder `ROUTES.login`.
- **Kann technisch nicht funktionieren, wenn**
  - Supabase Env fehlt oder Supabase Auth nicht erreichbar ist.
- **Hardcodiert / Demo**
  - Keine (Routing über `ROUTES`).

### `/login` – `app/login/page.tsx`

- **Funktionen**
  - Login UI (`LoginForm`), optional Invite-Token `?invite=...`
  - Wenn bereits eingeloggt: Profil laden (`profiles.organization_id`) → ohne Org Redirect nach `ROUTES.onboarding`, sonst `ROUTES.home`
- **Kann technisch nicht funktionieren, wenn**
  - `profiles` fehlt oder RLS den Read blockiert.
- **Hardcodiert / Demo**
  - Texte sind fix; Invite-Handling ist string-basiert (ok, aber ohne Validierung an dieser Stelle).

### `/register` – `app/register/page.tsx`

- **Funktionen**
  - Registrierung (`RegisterForm`) optional mit Invite-Token
  - Wenn bereits eingeloggt → `ROUTES.home`
- **Kann technisch nicht funktionieren, wenn**
  - Registrierungs-Actions Env/Email/DB benötigen und die Werte in der Laufzeitumgebung nicht korrekt gesetzt sind (Resend/App URL). (`RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_APP_URL` sind in `.env.example` zwar gesetzt, müssen aber pro Umgebung stimmen.)
- **Hardcodiert / Demo**
  - UI-Strings fix.

### `/forgot-password` – `app/forgot-password/page.tsx`

- **Status:** **Blockiert** (lokal: `NEXT_PUBLIC_APP_URL` fehlt in `.env.local`)
- **Funktionen**
  - Passwort-Reset (`ForgotPasswordForm`)
  - Redirect nach `ROUTES.home`, wenn eingeloggt
- **Kann technisch nicht funktionieren, wenn**
  - `NEXT_PUBLIC_APP_URL` fehlt/leer ist → Action meldet: „App-URL (NEXT_PUBLIC_APP_URL) ist nicht konfiguriert.“ (kein localhost-Fallback in `forgot-password/actions.ts`)
- **Hardcodiert / Demo**
  - Keine; Link-Basis ist strikt Env-abhängig.

### `/auth/update-password` – `app/auth/update-password/page.tsx`

- **Funktionen**
  - Neues Passwort setzen (`UpdatePasswordForm`) – erfordert Session
- **Kann technisch nicht funktionieren, wenn**
  - Auth-Callback/Session-Exchange nicht sauber arbeitet → Redirect `?error=session`
- **Hardcodiert / Demo**
  - Keine.

### `/onboarding` – `app/onboarding/page.tsx`

- **Funktionen**
  - Invite-Token aus Query `?invite=...` oder Cookie `invite_token`
  - RPC `get_invite_by_token` → orgName + role (Whitelist: `admin|sales|account_manager`)
  - Übergabe an `OnboardingWizard`
- **Kann technisch nicht funktionieren, wenn**
  - RPC `get_invite_by_token` fehlt oder RLS/RPC-Rechte fehlen.
  - Invite-Cookie nicht gesetzt wird (dann Onboarding ohne Invite-Kontext).
- **Hardcodiert / Demo**
  - Rollen-Whitelist im Code.

### `/auth/callback` – `app/auth/callback/route.ts` (Route Handler)

- **Funktionen**
  - `code` aus Query → `exchangeCodeForSession`
  - Redirect-Ziel wird mit `new URL(next, origin)` sicher gebaut
  - Wenn User keine Org hat → Redirect nach Onboarding
- **Kann technisch nicht funktionieren, wenn**
  - Supabase Env fehlt oder Exchange fehlschlägt.
  - `NEXT_PUBLIC_APP_URL` falsch gesetzt ist (wird normalisiert; Protokoll wird erzwungen, wenn fehlt).
- **Hardcodiert / Demo**
  - Keine; aber „Protokoll erzwingen“ ist eine feste Heuristik.

---

## 2) Pages – Dashboard Home

### `/dashboard` – `app/dashboard/page.tsx`

- **Funktionen**
  - Auth + Profil laden (inkl. Rolle & Org)
  - Dev-Rollen-Preview via Cookie (`DEV_ROLE_COOKIE`) überschreibt Serverrolle
  - `loadDashboardHomeForRole(...)` lädt Home-Daten
  - Rendert role-basiert: `SalesRepDashboard` / `AccountManagerDashboard` / `AdminDashboard`
- **Kann technisch nicht funktionieren, wenn**
  - `profiles`/Org fehlt oder RLS blockt.
  - `loadDashboardHomeForRole`/dazugehörige DB-Reads/RPCs nicht verfügbar sind.
- **Hardcodiert / Demo**
  - Dev-Rolle via Cookie ist explizit „Preview/Demo“-Mechanik.

---

## 3) Pages – Evidence/Referenzen (Hub, Detail, Create/Edit)

### `/dashboard/evidence` – `app/dashboard/evidence/page.tsx`

- **Funktionen**
  - Auth + Profil
  - `getDashboardData(false)` → Referenzen
  - Sales sieht gefiltert (nur `approved`/`internal_only`)
  - Lädt unterstützende Daten: Companies, interne Kontakte (`contact_persons`), externe Kontakte, Deals
  - Rendert `DashboardOverview`
- **Kann technisch nicht funktionieren, wenn**
  - Tabellen fehlen oder RLS blockt (`references`, `companies`, `contact_persons`, `external_contacts`, `deals`).
  - `getDashboardData` intern RPCs/Views erwartet, die fehlen.
- **Hardcodiert / Demo**
  - Sales-Filter ist status-string-basiert.

### `/dashboard/evidence/new` – `app/dashboard/evidence/new/page.tsx`

- **Funktionen**
  - Rollen-Gating: Sales → Redirect nach Evidence-Root
  - Lädt Companies, interne Kontakte, externe Kontakte → `ReferenceForm` (Create)
- **Kann technisch nicht funktionieren, wenn**
  - Dropdown-Tabellen fehlen oder RLS blockt.
- **Hardcodiert / Demo**
  - Rollenregeln fix implementiert.

### `/dashboard/evidence/[id]` – `app/dashboard/evidence/[id]/page.tsx`

- **Funktionen (Auszug)**
  - Referenz-Detail laden (inkl. Approval-Felder + Company-Relation)
  - Zugriffskontrolle: Sales darf nur bestimmte Status (approved/internal_only/anonymized/external/internal…)
  - Favoriten: read aus `favorites`, toggle via `toggleFavorite`
  - Readiness/Approval-Status inkl. Grace-Period & interne Status-Korrektur („staleInternalPending“)
  - Aktionen: Export (PPTX/PDF), Approval anfragen, Share-Link, Bearbeiten, Löschen (Admin)
  - Aktivitäten: Audit-Events (teilweise abhängig von Rolle)
  - Sales-only CRM-Sync-Card
- **Kann technisch nicht funktionieren, wenn**
  - `favorites`/`evidence_events`/Approval-Felder nicht im Schema sind oder RLS blockt.
  - Export/Share/Approval-Actions Integrationen/Env benötigen und fehlen.
- **Hardcodiert / Demo**
  - Status-Mapping und diverse Labels sind string-basiert und setzen DB-Konventionen voraus.
  - Anonymisierung ohne OpenAI nutzt Regel-Fallback (kein Salesforce-Link mehr auf dieser Page).

### `/dashboard/evidence/[id]/edit` – `app/dashboard/evidence/[id]/edit/page.tsx`

- **Funktionen**
  - Rollen-Gating: Sales → Redirect zur Detailseite
  - Ownership-Gating: Account Manager darf nur eigene Referenzen (`created_by === user.id`)
  - Lädt Referenz + Dropdowns → `ReferenceForm` (Edit)
- **Kann technisch nicht funktionieren, wenn**
  - `created_by` fehlt/uneinheitlich ist oder RLS den Read blockt.
- **Hardcodiert / Demo**
  - Ownership-Regel fix implementiert.

---

## 4) Pages – Accounts/Firmen

### `/dashboard/accounts` – `app/dashboard/accounts/page.tsx`

- **Funktionen**
  - Companies laden
  - Fallback: Wenn Spalte `is_favorite` fehlt → Query ohne Spalte und im UI `is_favorite=false`
  - Enrichment über Counts (Deals/References/Stakeholders/Strategies + Market Signals)
  - Rendert `AccountsGrid`
- **Kann technisch nicht funktionieren, wenn**
  - Tabellen fehlen oder RLS blockt (u. a. `companies`, `deals`, `references`, `stakeholders`, `company_strategies`, market-signal Tabellen).
- **Hardcodiert / Demo**
  - Set „aktiver Deal-Statuswerte“ ist fix im Code.

### `/dashboard/accounts/[id]` – `app/dashboard/accounts/[id]/page.tsx`

- **Status:** **Teilweise**
- **Funktionen**
  - Company Detail laden
  - Parallel: Strategy/Stakeholders/Internal Contacts/References/Active Deals + External Contacts
  - Market Signals: Executive Events + Account News → Mapping ins UI-Model
  - Pipeline-Tab: CRM-Sync nur wenn `salesforce_opportunity_id` am Deal gesetzt
  - Optional `?edit=1` öffnet Edit-State im Client
- **Kann technisch nicht funktionieren, wenn**
  - Imports/Actions (`../actions`) intern weitere Tabellen/RPCs erwarten.
  - market-signal Tabellen fehlen.
- **Hardcodiert / Demo**
  - Normalisierung von `event_kind`/`segment` fällt auf Defaults zurück (string-basiert).
  - Ohne `salesforce_opportunity_id`: Deals gelten als „lokal“, kein echter CRM-Sync.

---

## 5) Pages – Deals

### `/dashboard/deals` – `app/dashboard/deals/page.tsx`

- **Status:** **OK** (wieder aktiv — nicht mehr Redirect)
- **Funktionen**
  - Deals-Liste via `getDeals()` → `DealsClientContent`
  - Lädt Companies + Org-Profiles für Filter/Dialoge
- **Kann technisch nicht funktionieren, wenn**
  - `deals`-Tabelle/RLS fehlt oder `getDeals` scheitert.
- **Hardcodiert / Demo**
  - Keine in der Page; nicht in Sidebar (nur per Deep Link / Command Palette prefetch).

### `/dashboard/deals/[id]` – `app/dashboard/deals/[id]/page.tsx`

- **Status:** **Teilweise**
- **Funktionen**
  - Deal laden (`getDealWithReferences`)
  - Orga-Companies/Profiles laden
  - Aktivitäten aus `evidence_events` (Deal-Events) → UI-Timeline
  - Sektionen: RFP, Match, Details, Sidebar
  - Referenzbedarf melden → E-Mail an `REFERENCE_MANAGER_EMAIL`
- **Kann technisch nicht funktionieren, wenn**
  - Deal-Actions/DB Reads scheitern (Schema/RLS).
  - RFP-/KI-Teile OpenAI benötigen (lokal gesetzt, aber Quota/Key kann scheitern).
  - `REFERENCE_MANAGER_EMAIL` fehlt → Referenzbedarf-Mail schlägt fehl.
- **Hardcodiert / Demo**
  - Event-Typ-Mapping ist string-basiert.

### `/dashboard/deals/new` – `app/dashboard/deals/new/page.tsx`

- **Funktionen**
  - Deal anlegen (`DealForm`), lädt Companies + Org-Profile
- **Kann technisch nicht funktionieren, wenn**
  - `deals` Create/Policies fehlen.
- **Hardcodiert / Demo**
  - Keine offensichtlichen Hardcodings in der Page.

### `/dashboard/deals/request/new` – `app/dashboard/deals/request/new/page.tsx`

- **Status:** **Teilweise** (wie Referenzbedarf — `REFERENCE_MANAGER_EMAIL` nötig)
- **Funktionen**
  - Deal auswählen + Referenzanfrage erfassen (`RequestNewClient`)
  - Optional `?dealId=...` für Preselect
- **Kann technisch nicht funktionieren, wenn**
  - `REFERENCE_MANAGER_EMAIL` nicht gesetzt ist.
- **Hardcodiert / Demo**
  - Keine offensichtlichen Hardcodings in der Page.

---

## 6) Pages – Match

### `/dashboard/match` – `app/dashboard/match/page.tsx`

- **Status:** **Teilweise**
- **Funktionen**
  - Tab „Intelligente Suche“ (smart) vs „RFP-Analyse“ (rfp)
  - Optional Deal-Kontext via `?deal=...` → lädt Deal (ungültiger Deal → Redirect zu Deals)
  - Smart: `MatchSmartClient` → `matchReferences` (OpenAI Embeddings + RPC)
  - RFP mit Deal: `MatchRfpClient` → `DealRfpSection` (MVP, leere Companies-Liste)
  - RFP ohne Deal: Hinweis-Card „Deal-Kontext benötigt“
- **Kann technisch nicht funktionieren, wenn**
  - Smart: `OPENAI_API_KEY` fehlt oder Embeddings in DB fehlen (lokal Key gesetzt).
  - RFP: OpenAI für Analyse in `DealRfpSection` / `app/api/rfp/analyze`.
- **Hardcodiert / Demo**
  - RFP im Match-Tab ist MVP (kein vollständiger Standalone-Flow ohne Deal).

---

## 6b) Pages – Deal Desk (Sidebar)

### `/dashboard/deal-desk` – `app/dashboard/deal-desk/page.tsx`

- **Status:** **Teilweise** (Sidebar-Eintrag; mit OpenAI echt, ohne Mock)
- **Funktionen**
  - Auth + Org-Check → `DealDeskClient`
  - RFP-Upload (PDF/DOCX/Excel), Analyse via `POST /api/deal-desk/analyze`
  - Projekte in `deal_desk_projects` / Dokumente in `deal_desk_documents`
  - Optional `?demo=1` lädt Demo-Projekt bei leerer Liste
- **Kann technisch nicht funktionieren, wenn**
  - Migrationen Deal Desk fehlen oder Storage-Bucket `rfp-documents` nicht konfiguriert.
  - Ohne `OPENAI_API_KEY`: Analyse fällt auf **Mock** (`analysis_source: 'mock'`).
  - Bei OpenAI-Quota: Demo-Analyse mit Warnung.
- **Hardcodiert / Demo**
  - `buildDemoDealDeskAnalysis` als Fallback; Demo-Badge; Reference-Incubator-Download „(Demo)“.
  - UI-Hinweis: „OPENAI_API_KEY erforderlich“ für echte Analyse.

---

## 7) Pages – Market Signals

### `/dashboard/market-signals` – `app/dashboard/market-signals/page.tsx`

- **Status:** **Teilweise**
- **Funktionen**
  - Lädt Model via `loadMarketSignalsPageData()` → `MarketSignalsClient`
  - Intro-Strategie: OpenAI optional (`/api/market-signals/intro-strategy`), sonst Heuristik
- **Kann technisch nicht funktionieren, wenn**
  - Ingest: `SUPABASE_SERVICE_ROLE_KEY` fehlt (lokal gesetzt).
  - Push/E-Mail-Toggles ohne VAPID/Resend-Produktion.
- **Hardcodiert / Demo**
  - Salesforce-Quick-Action öffnet `https://login.salesforce.com/` (generisch, kein Deal-Link).

### `/dashboard/market-signals/manage` – `app/dashboard/market-signals/manage/page.tsx`

- **Funktionen**
  - Wenn kein User oder keine Org → leeres UI (kein Redirect)
  - Lädt Companies + Executive Events + News + Champion Watchlist
  - **Bootstrap-Mechanik**: Wenn initial niemand „folgt“, werden bis zu **8** bekannte Companies automatisch auf `is_favorite=true` gesetzt
- **Kann technisch nicht funktionieren, wenn**
  - `is_favorite` fehlt oder Updates durch RLS blockiert werden.
  - market-signal Tabellen fehlen.
- **Hardcodiert / Demo**
  - Bootstrap-Limit **8** ist fix.
  - Normalisierung von Person-Key ist fix (lowercase/whitespace).

---

## 8) Pages – Settings

### `/dashboard/settings` – `app/dashboard/settings/page.tsx`

- **Status:** **Teilweise**
- **Funktionen**
  - Profil + Notification Settings laden
  - Organization Settings laden (Branding, Export, Stripe, Subdomain, API/Workflow Settings)
  - Team-Members via `getTeamMembers()`
  - Audit Logs: nur Admin, max 200 Einträge
  - Rendert `SettingsTabs`
- **Kann technisch nicht funktionieren, wenn**
  - Stripe-Keys fehlen → Billing-Checkout/Portal.
  - VAPID fehlt → Push-Karte zeigt Konfig-Hinweis.
  - Tabellen fehlen (`organizations`, `audit_logs`, etc.) oder RLS blockt.
- **Hardcodiert / Demo**
  - Default-Farben: `#2563EB` / `#1D4ED8`
  - Default API-Key-Maske: `sk_live_************************`
  - Rollen-Vorschau: „nur in dieser Demo möglich“ (`settings-form.tsx`)
  - Salesforce-Integration in Tabs: generischer `login.salesforce.com`-Link
  - Export: „Demo-PDF öffnen“

### `/dashboard/settings/workflow` – `app/dashboard/settings/workflow/page.tsx`

- **Status:** **Nur Info**
- **Funktionen**
  - Statische Übersicht Approval-Prozess (Entwurf → Interner Review → Kundenfreigabe)
  - Verweis auf Settings-Tab „Workflow“ (editierbare Werte dort)
- **Kann technisch nicht funktionieren, wenn**
  - — (keine eigene Persistenz)
- **Hardcodiert / Demo**
  - Englische UI-Strings („Approval Process“); keine Konfiguration auf dieser Route.

---

## 9) Pages – Request/Tickets

### `/dashboard/request` – `app/dashboard/request/page.tsx`

- **Funktionen**
  - Tickets laden aus `tickets`
  - Server Action `createTicket` ruft `submitTicket(...)` und redirectet mit Fehlerparam
  - UI: Ticketliste + Formular
- **Kann technisch nicht funktionieren, wenn**
  - `tickets` Tabelle fehlt oder RLS blockt.
  - `submitTicket` (in `app/dashboard/actions`) nicht korrekt verdrahtet ist.
- **Hardcodiert / Demo**
  - Keine offensichtlichen Hardcodings in der Page; Copy ist fix.

---

## 10) Pages – Public Approval / Public Portfolio

### `/approval/[token]` – `app/approval/[token]/page.tsx`

- **Funktionen**
  - Öffentliche Approval-Ansicht ohne Login: Referenz via `approval_token`
  - Validierung: pending + expiry/grace
  - Org-Branding (Logo/Farben) → UI
  - Entscheidung via `ApprovalDecisionForm`
- **Kann technisch nicht funktionieren, wenn**
  - Approval-Felder/Token fehlen oder RLS/Public Access nicht passt.
  - `ApprovalDecisionForm` Actions Env/Policies benötigen und fehlen.
- **Hardcodiert / Demo**
  - Default-Farben: `#2563EB` / `#1D4ED8`
  - Scope-Labels und Copy sind fix.

### `/p/[slug]` – `app/p/[slug]/page.tsx`

- **Funktionen**
  - Public Portfolio: Portfolio/Branding/Share-Owner laden, Views inkrementieren
  - Zustände: locked → Unlock Gate, expired → Hinweis, disabled/not found → Hinweis
  - Release-Logik: pro Feld „In dieser Freigabe nicht enthalten“, wenn nicht freigegeben
- **Kann technisch nicht funktionieren, wenn**
  - Public Portfolio Actions/RPCs/DB-Views fehlen oder RLS/Public Policies nicht stimmen.
  - View-Inkrement write nicht erlaubt ist.
- **Hardcodiert / Demo**
  - Workspace-Fallback: `RefStack Workspace`
  - ShareOwner-Fallback: `RefStack Team`, `Sales Ansprechpartner`
  - Release-Text: `In dieser Freigabe nicht enthalten`

---

## 11) Pages – Konzepte/Demo

### `/dashboard/concepts/inbox-references` – `app/dashboard/concepts/inbox-references/page.tsx`

- **Funktionen**
  - Konzept-Page: re-used `getDashboardDataImpl(false)` via dynamic import
  - Sales-Filter: `approved`/`internal_only`/`anonymized`
  - Lädt externe Kontakte und rendert `InboxReferencesConceptClient`
- **Kann technisch nicht funktionieren, wenn**
  - Importpfad/Export von `getDashboardDataImpl` sich ändert.
  - Externe Kontakte Tabelle/Policies fehlen.
- **Hardcodiert / Demo**
  - Route ist explizit „concept“ (Konzept/Demo-Natur).

---

## 12) Kurzfazit – „sicher unfertig“ / klar hardcodiert

**Lokal blockiert (konkret):**

- **Passwort-Reset**: `NEXT_PUBLIC_APP_URL` fehlt in `.env.local`
- **Referenzbedarf-E-Mail**: `REFERENCE_MANAGER_EMAIL` fehlt

**Teilweise / Demo / MVP:**

- **Deal Desk**: Mock-Analyse ohne OpenAI oder bei Quota; Demo-Badge
- **Match RFP-Tab**: MVP nur mit Deal-Kontext; ohne Deal nur Hinweis
- **Salesforce**: generische Links in Settings/Market Signals (kein Opportunity-Link)
- **Settings**: Rollen-Vorschau (Demo), Demo-PDF Export, Stripe/Push ohne Keys
- **Workflow-Page** (`/dashboard/settings/workflow`): nur Info, keine Konfiguration

**Funktional (bei DB/RLS ok):**

- Auth (außer Forgot-Password lokal), Dashboard, Evidence, Accounts, **Deals-Liste** (wieder aktiv), Deal Desk mit OpenAI, Match Smart mit OpenAI

**OpenAI:** Lokal angebunden (`OPENAI_API_KEY` in `.env.local`); Supabase Embedding-Function braucht zusätzlich Supabase Secret.

**Weitere Env-Abhängigkeiten:** VAPID, Stripe, Brandfetch, CRON_SECRET (siehe Abschnitt 0.9)

---

## 13) Nächste notwendige Schritte, um „vollständig funktional“ zu werden

Dieser Abschnitt beschreibt die **konkreten technischen Maßnahmen**, damit alle derzeit vorhandenen Screens/Flows in der App in einer realen Umgebung zuverlässig funktionieren (lokal + Deployment).

### 13.1 Umgebungsvariablen & Deployment konsistent machen

**Priorität 1 (lokal sofort — blockiert Flows):**

- `NEXT_PUBLIC_APP_URL` in `.env.local` ergänzen (Passwort-Reset, E-Mail-Links)
- `REFERENCE_MANAGER_EMAIL` setzen (Referenzbedarf aus Deals)

**Priorität 2 (bereits lokal ok, Prod spiegeln):**

- Supabase (URL, Anon, Service Role), Resend, **OpenAI** → auch in Vercel/Prod
- OpenAI zusätzlich als Secret in Supabase für `generate-embedding`

**Priorität 3 (Stretch):**

- `RESEND_FROM` mit verifizierter Domain
- VAPID (Push), Stripe (Billing), Brandfetch (Enrichment), `CRON_SECRET` (Cron)

### 13.2 Datenbank: Migrationen, RPCs, Tabellen, Views – Stand herstellen

- **Migrationen in der Ziel-DB anwenden**
  - Sicherstellen, dass der Ziel-Supabase-Stack die Migrationen aus `supabase/migrations/` wirklich enthält (lokal und Prod).
  - Besonders relevant für Pages in diesem Dokument: `profiles`, `organizations`, `companies`, `references`, `favorites`, `tickets`, `external_contacts`, `contact_persons`, `audit_logs`, `evidence_events` sowie market-signal Tabellen.
- **Erwartete RPCs prüfen**
  - Mindestens: Onboarding lädt Invite-Infos über `get_invite_by_token`. Diese RPC muss existieren und korrekt berechtigt sein.
  - Public/Portfolio/Approval Actions können weitere RPCs/Views nutzen (je nach Implementierung in `app/p/actions.ts`, `app/approval/[token]/actions.ts`).

### 13.3 RLS/Policies: „es funktioniert technisch“ vs. „es ist erlaubt“

Viele Screens sind technisch implementiert, funktionieren aber in der Praxis nur, wenn RLS korrekt ist.

- **Server-Reads/Writes pro Tabelle verifizieren**
  - `profiles`: User muss die eigene Zeile lesen können (inkl. `organization_id`, `role`).
  - `companies`, `references`, `deals`, `tickets`, `external_contacts`: Reads/Writes scoped auf Organization/User.
  - `favorites`: pro User.
  - `audit_logs`: typischerweise Admin-only.
  - Public-Access: `approval_token`-Lookup und `/p/[slug]`-Portfolio müssen gezielt öffentlich lesbar sein (ohne ungewollte Datenleaks).
- **Service-Role nur dort einsetzen, wo nötig**
  - Für org-weite Jobs (market signals ingest/digest) und Admin-Tasks ist `SUPABASE_SERVICE_ROLE_KEY` nötig; UI/Browser darf ihn nie sehen.

### 13.4 Offensichtlich unvollständige / MVP-Features fertigstellen

- **Deal Desk** (`/dashboard/deal-desk`): Mock-Fallback entfernen oder klar als Dev-only markieren; echte Analyse nur mit gültigem OpenAI + Storage
- **Match RFP-Tab**: Standalone-Flow ohne Deal-Kontext oder Tab verstecken; `MatchRfpClient` mit Companies befüllen
- **Deals-Übersicht**: wieder aktiv — optional Sidebar-Eintrag ergänzen (aktuell nur Deep Link)
- **Workflow-Page** (`/dashboard/settings/workflow`): Deutsch + echte Konfiguration oder Route entfernen

### 13.5 Demo-/Hardcodings in produktive Integrationen überführen

- **CRM-Sync (Salesforce)**
  - `salesforce_opportunity_id` am Deal existiert bereits (Account Pipeline-Tab)
  - Generische Links in Settings/Market Signals durch echte Opportunity-URLs ersetzen
  - Optional: org-spezifische CRM-Basis-URL in Settings
- **Default-Brandingfarben / API-Key-Maske**
  - Defaults sind ok als Fallback, aber prüfen, ob sie im Produkt als „echte“ Werte erscheinen sollen oder ob Settings-UI zwingend eine Konfiguration erfordert.

### 13.6 Market Signals (End-to-End): UI + Jobs + Mail/Push

- **Ingest/Digest Jobs in der Zielumgebung aktivieren**
  - Cron-Routen absichern (`CRON_SECRET`) und in Vercel korrekt konfigurieren.
  - `MARKET_SIGNALS_DIGEST_SKIP_TIME_WINDOW` Verhalten bewusst wählen (Hobby vs Pro).
- **E-Mail und Push wirklich ausliefern**
  - Resend + VAPID vollständig konfigurieren, sonst bleiben UI-Toggles „Schein-Funktionen“.

### 13.7 Public Flows absichern und vollständig machen (Approval + Portfolio)

- **Approval-Link-Funktionalität**
  - Sicherstellen, dass Token-Flow nicht nur lesend, sondern auch schreibend korrekt funktioniert (Approve/Reject Actions, Audit-Logs, Status-Transitions).
  - Ablauf/Karenzzeit: prüfen, ob Status-Übergänge mit Datenmodell konsistent sind.
- **Public Portfolio**
  - Unlock/Expiry/Disable-States wirklich testbar machen (DB-Felder, TTL, Password-Gate).
  - `incrementPortfolioViews` braucht eine sichere Write-Policy (ohne generelle Public-Write-Lücke).

### 13.8 QA: „funktional“ als Definition festnageln und verifizieren

- **Build-/Lint-/Test Mindeststandard**
  - `npm run lint`
  - `npm test`
  - `npm run build`
- **Smoke-Test-Checkliste (manuell)**
  - Auth: Login/Register/Forgot/Update Password + Redirects
  - Onboarding: Invite-Token → Org + Rolle setzen
  - Dashboard: role-basiertes Home
  - Evidence: Liste → Detail → Export/Share/Approval → Edit/Delete (rollenabhängig)
  - Accounts: Liste → Detail inkl. Kontakte/Signals
  - Deals: Liste + New + Detail + Referenzbedarf-Mail
  - Deal Desk: Upload → echte Analyse (nicht Mock)
  - Match: Smart-Flow + RFP mit Deal-Kontext
  - Settings: Team/Invites/Notifications/Billing (je nach Env)
  - Public: Approval-Link, Portfolio-Link (locked/expired/ok)
  - Forgot-Password: mit `NEXT_PUBLIC_APP_URL`
