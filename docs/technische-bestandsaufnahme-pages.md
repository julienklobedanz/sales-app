# Technische Bestandsaufnahme (Pages) – Refstack

Ziel: Pro Page/Routing-Screen eine **rein technische** Einschätzung, was **derzeit nicht funktionieren kann** (fehlende APIs/DB/RLS/Env/Platzhalter) und was **hardcodiert** bzw. bewusst „Demo“ ist.

Grundlage:
- Next.js **App Router** (`app/**/page.tsx`)
- Auth/Daten primär über **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`)
- Pfade zentral über `lib/routes.ts` (`ROUTES`)

> Hinweis zur Methodik: Diese Bestandsaufnahme basiert auf dem statischen Code-Review der Page-Entry-Points und offensichtlichen Imports/Actions. Für eine „end-to-end“ Verifikation (RLS, RPCs, Migrationsstand, Env in der Laufzeitumgebung) ist ein Lauf mit echter DB/Env nötig.

---

## 0) Globale technische Voraussetzungen / Blocker

Diese Punkte betreffen viele Pages gleichzeitig (weil Auth/Server-Actions/Integrationen zentral sind).

### 0.1 Supabase Basis-Konfiguration

- **Erforderlich**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Auswirkung bei Fehlen**: Auth-Checks, DB-Reads/Writes, Middleware/Callback brechen bzw. funktionieren nicht.

### 0.2 App-URL für Links aus E-Mails

- **Benutzt**: `NEXT_PUBLIC_APP_URL`
- **Fallbacks (hardcodiert)**: teils `http://localhost:3000` als Default (z. B. in Actions).
- **Auswirkung bei Fehlen**: Passwort-Reset/Einladungen/Approval-Links können falsche Ziele erzeugen oder werden blockiert (teils explizite Fehlermeldung).

### 0.3 Resend (E-Mail Versand)

- **Benutzt**: `RESEND_API_KEY` (teils auch `RESEND_FROM`)
- **Auswirkung bei Fehlen**: Einladungen/Benachrichtigungen/Workflows, die E-Mails versenden, funktionieren nicht.

### 0.4 OpenAI (KI/Analyse/Extraktion)

- **Benutzt**: `OPENAI_API_KEY`
- **Auswirkung bei Fehlen**: KI-Features (z. B. Analyse/Entwurf/Extraktion – je nach Feature) können nicht laufen.

### 0.5 Market Signals (org-weite Jobs / Cron)

- **Benutzt**: `SUPABASE_SERVICE_ROLE_KEY` (org-weiter Zugriff), Cron/Feature-Flags (z. B. `CRON_SECRET`, diverse `*_DISABLED` Flags)
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
  - Registrierungs-Actions Env/Email/DB benötigen und fehlen (z. B. Resend/App URL).
- **Hardcodiert / Demo**
  - UI-Strings fix.

### `/forgot-password` – `app/forgot-password/page.tsx`

- **Funktionen**
  - Passwort-Reset (`ForgotPasswordForm`)
  - Redirect nach `ROUTES.home`, wenn eingeloggt
- **Kann technisch nicht funktionieren, wenn**
  - `NEXT_PUBLIC_APP_URL` nicht konfiguriert ist (Actions melden/benötigen Base-URL).
- **Hardcodiert / Demo**
  - Keine direkten Hardcodings in der Page; Link-Basis hängt an Env (teilweise mit localhost-Fallback in Actions).

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
  - **CRM-Sync**: Salesforce-Link ist hardcodiert als Demo (`https://login.salesforce.com`, UI-Label „(Demo)“).
  - Status-Mapping und diverse Labels sind string-basiert und setzen DB-Konventionen voraus.

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
  - Rendert `CompaniesGrid`
- **Kann technisch nicht funktionieren, wenn**
  - Tabellen fehlen oder RLS blockt (u. a. `companies`, `deals`, `references`, `stakeholders`, `company_strategies`, market-signal Tabellen).
- **Hardcodiert / Demo**
  - Set „aktiver Deal-Statuswerte“ ist fix im Code.

### `/dashboard/accounts/[id]` – `app/dashboard/accounts/[id]/page.tsx`

- **Funktionen**
  - Company Detail laden
  - Parallel: Strategy/Stakeholders/Internal Contacts/References/Active Deals + External Contacts
  - Market Signals: Executive Events + Account News → Mapping ins UI-Model
  - Optional `?edit=1` öffnet Edit-State im Client
- **Kann technisch nicht funktionieren, wenn**
  - Imports/Actions (`../actions`) intern weitere Tabellen/RPCs erwarten.
  - market-signal Tabellen fehlen.
- **Hardcodiert / Demo**
  - Normalisierung von `event_kind`/`segment` fällt auf Defaults zurück (string-basiert).

---

## 5) Pages – Deals

### `/dashboard/deals` – `app/dashboard/deals/page.tsx`

- **Funktionen**
  - **Deaktiviert**: Redirect nach `ROUTES.home` (Kommentar: „Übersicht vorübergehend ausgeblendet“)
- **Kann technisch nicht funktionieren, weil**
  - Absichtlich nicht erreichbar als echte Übersicht.
- **Hardcodiert / Demo**
  - Redirect ist fix.

### `/dashboard/deals/[id]` – `app/dashboard/deals/[id]/page.tsx`

- **Funktionen**
  - Deal laden (`getDealWithReferences`)
  - Orga-Companies/Profiles laden
  - Aktivitäten aus `evidence_events` (Deal-Events) → UI-Timeline
  - Sektionen: RFP, Match, Details, Sidebar
- **Kann technisch nicht funktionieren, wenn**
  - Deal-Actions/DB Reads scheitern (Schema/RLS).
  - RFP-/KI-Teile in Sub-Komponenten OpenAI/Env benötigen und fehlen.
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

- **Funktionen**
  - Deal auswählen + Referenzanfrage erfassen (`RequestNewClient`)
  - Optional `?dealId=...` für Preselect
- **Kann technisch nicht funktionieren, wenn**
  - Ticket/Request-Flows (Actions/DB/RLS) fehlen.
- **Hardcodiert / Demo**
  - Keine offensichtlichen Hardcodings in der Page.

---

## 6) Pages – Match

### `/dashboard/match` – `app/dashboard/match/page.tsx`

- **Funktionen**
  - Tab „smart“ vs „rfp“
  - Optional Deal-Kontext via `?deal=...` → lädt Deal (sonst Redirect zu Deals)
- **Kann technisch nicht funktionieren / ist absichtlich unfertig**
  - **RFP-Analyse** ist explizit „Noch nicht verfügbar“ (Platzhalter-Card).
  - Smart-Match hängt an implementierten Actions/DB und ggf. OpenAI (je nach internem Flow).
- **Hardcodiert / Demo**
  - „Noch nicht verfügbar“ Copy ist fix.

---

## 7) Pages – Market Signals

### `/dashboard/market-signals` – `app/dashboard/market-signals/page.tsx`

- **Funktionen**
  - Lädt Model via `loadMarketSignalsPageData()` → `MarketSignalsClient`
- **Kann technisch nicht funktionieren, wenn**
  - Data-Loader Integrationen/Env/Tabellen erwartet (market signals).
- **Hardcodiert / Demo**
  - Keine offensichtlichen Hardcodings in der Page.

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

- **Funktionen**
  - Profil + Notification Settings laden
  - Organization Settings laden (Branding, Export, Stripe, Subdomain, API/Workflow Settings)
  - Team-Members via `getTeamMembers()`
  - Audit Logs: nur Admin, max 200 Einträge
  - Rendert `SettingsTabs`
- **Kann technisch nicht funktionieren, wenn**
  - Org Settings/Billing/Push/Invite-Actions Env/Integrationen brauchen und fehlen.
  - Tabellen fehlen (`organizations`, `audit_logs`, etc.) oder RLS blockt.
- **Hardcodiert / Demo**
  - Default-Farben: `#2563EB` / `#1D4ED8`
  - Default API-Key-Maske: `sk_live_************************`
  - Defaultwerte für Workflow/Notifications sind fix (werden genutzt, wenn DB-Settings fehlen/leer sind)

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

- **RFP-Analyse** (`/dashboard/match?tab=rfp`): expliziter Platzhalter „Noch nicht verfügbar“
- **Deals-Übersicht** (`/dashboard/deals`): absichtlich deaktiviert (Redirect)
- **CRM-Sync** auf Referenz-Detail: **Salesforce-Link hardcodiert** als Demo
- Mehrere Defaultwerte/Masken/Branding-Farben in Settings & Public/Approval sind **hardcodiert** (Fallback-Defaults)
- Mehrere Flows hängen zwingend an Env/Integrationen (Resend/OpenAI/Service Role/VAPID/Stripe)

