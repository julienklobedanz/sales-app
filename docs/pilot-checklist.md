# Pilot-Checkliste: Erster Testkunde (RefStack)

Kurz-Dokument für **Design-Partner / kontrollierten Piloten**. Aus dem aktuellen Code abgeleitet; vor Go-Live Punkt für Punkt abhaken.

---

## 1. Pilot-Scope festlegen (1 Seite, verbindlich)

- [ ] **In-Scope** (empfohlen für Pilot v1): Referenzen (Evidence), Freigabe-Flow, Share-Links, PDF/PPTX-Export, Accounts, Deals, Match/Request, Rollen (Admin / Sales / Account Manager), Basis-Einstellungen.
- [ ] **Out-of-Scope oder „Beta“ kennzeichnen**: Marktsignale (siehe Punkt 8), CRM-Sync (Salesforce/HubSpot nur Platzhalter), SSO „Salesforce Login“ auf Login-Seite.
- [ ] **Erfolgskriterien**: z. B. „10 Referenzen angelegt, 3 Freigaben durchgespielt, 2 Share-Links mit Kunde getestet“.

---

## 2. Infrastruktur & Umgebungen

- [ ] **Eigenes Supabase-Projekt** für den Piloten (nicht Dev-DB teilen); Migrationen aus `supabase/migrations` anwenden.
- [ ] **Vercel (oder gleichwertig)** mit `NEXT_PUBLIC_APP_URL` = produktive App-URL (Magic-Link, Redirects).
- [ ] **Secrets nur in der Hosting-Umgebung**; `.env.example` dient als Vorlage – **keine** echten Keys committen; nach Exponierung Keys rotieren.

---

## 3. Umgebungsvariablen (Minimum)

| Variable | Zweck |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (öffentlich) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (z. B. Registrierung/E-Mail-Flows – nur Server) |
| `RESEND_API_KEY` | Transaktionsmails (Freigaben, Einladungen) |
| `RESEND_FROM` | Verifizierte Absender-Domain für Pilot empfohlen |
| `NEXT_PUBLIC_APP_URL` | Basis-URL der App |

**Optional / feature-abhängig:**

| Variable | Zweck |
|----------|--------|
| `OPENAI_API_KEY` | Magic Import (PDF/PPTX), KI-Zusammenfassungen, Marktsignal-„Strategie“-API |
| `BRANDFETCH_API_KEY` / `BRANDFETCH_CLIENT_ID` | Account-/Logo-Anreicherung |
| `REFERENCE_MANAGER_EMAIL` | Routing „Referenzbedarf melden“ |

Stripe: in Settings vorhanden – Checkout/Portal nur nutzen, wenn `STRIPE_*` in eurer Implementierung gesetzt und getestet sind (siehe `app/dashboard/settings/stripe-actions.ts`).

---

## 4. Kern-Routen zum Abnahmetest

| Bereich | Route (`lib/routes.ts`) |
|---------|-------------------------|
| Dashboard | `/dashboard` |
| Referenzen | `/dashboard/evidence`, `/dashboard/evidence/new`, `/dashboard/evidence/[id]` |
| Accounts | `/dashboard/accounts`, `/dashboard/accounts/[id]` |
| Deals | `/dashboard/deals`, `/dashboard/deals/[id]`, `/dashboard/deals/new` |
| Match | `/dashboard/match` |
| Referenzbedarf | `/dashboard/request` |
| Marktsignale | `/dashboard/market-signals`, `/dashboard/market-signals/manage` |
| Einstellungen | `/dashboard/settings` |
| Öffentlich | `/p/[slug]` (Share), `/approval/[token]` (Freigabe aus Mail) |

---

## 5. Onboarding der Testorganisation

- [ ] Admin-User anlegen (Registrierung + Onboarding oder Einladung, je nach eurem Flow).
- [ ] **Rollen** vergeben (wer legt Referenzen an, wer Freigaben auslöst).
- [ ] **Freigabe-Owner / Ansprechpartner** pro Referenz klären (Feld `approval_owner_name` etc.).
- [ ] Optional: kleines **Seed-/Import-Skript** oder manuell erste 5–10 Referenzen (siehe `docs/seed/` falls nutzbar).

---

## 6. E-Mail & Freigaben (kritisch für Pilot)

- [ ] Resend-Domain **verifiziert**, Testmail an Kundenpostfach.
- [ ] End-to-End: **Freigabe anfordern → Mail → `/approval/[token]`** durchspielen.
- [ ] Klären: wer **intern freigibt** vs. **Kunde** (UI: Freigabestatus / Approval Actions).

---

## 7. Exporte & Shares

- [ ] PDF-Export (`/api/pdf?referenceId=…`) mit Pilot-Referenz testen.
- [ ] PPTX One-Pager (`/api/reference-onepager-pptx?referenceId=…`) aus Referenzdetail testen.
- [ ] Share-Link: Passwort, Ablauf, öffentliche Seite `/p/...` mit Pilotdaten testen.

---

## 8. Was ist noch „Demo“ / heuristisch? (Erwartung managen)

| Bereich | Stand im Code |
|---------|----------------|
| **Marktsignale – Stakeholder** | `app/dashboard/market-signals/actions.ts`: feste **Adapter** (The Org / CIO.de / LinkedIn) liefern **synthetische** Kandidaten; **gemeinsame Kontakte** inkl. Brückentexte sind **Mock**. |
| **Marktsignale – ICP-Score** | Heuristik im Client, keine konfigurierbare ICP-DB. |
| **Marktsignale – Strategietext** | `/api/market-signals/intro-strategy`: Regeln + optional OpenAI. |
| **CRM (Sales)** | Referenzdetail: „Salesforce Deal öffnen (Demo)“ → externer Link, **keine** Org-Anbindung. |
| **Login „Salesforce“** | Platzhalter-Toast (kein OAuth). |
| **Konzept-Route** | `/dashboard/concepts/inbox-references` – laut `ROUTES` Demo/Inbox-Konzept. |

Pilot-Text für Kunden: *„Marktsignale & CRM-Deep-Integration sind Beta / folgen.“*

---

## 9. Security & Compliance (Minimum vor Kundendaten)

- [ ] **RLS**: Zugriff nur über eigenes `organization_id` (Supabase-Policies aktiv lassen).
- [ ] **Keine Produktionsdaten** in Logs mit vollem PII; Audit-Felder prüfen (`lib/audit`).
- [ ] **DSGVO / AVV**: Vertrag mit Supabase/Vercel/Resend/OpenAI je nach Nutzung klären.

---

## 10. Support & Feedback im Pilot

- [ ] **Ansprechpartner** und Reaktionszeit (z. B. 24–48 h) festlegen.
- [ ] **Bug-Channel** (Slack/E-Mail) + Sammeln von Screenshots und Referenz-IDs.
- [ ] Nach Pilot: **Retro** – was in Scope v2 (CRM, echte Signale, Stepper-Freigabe, ICP).

---

## 11. Go / No-Go Kurzform

**Go**, wenn: Supabase + App-URL + Resend + mindestens ein Admin durch den kompletten Freigabe- und Share-Flow kommt.

**No-Go**, wenn: Mails kommen nicht an, Freigabe-Token nicht erreichbar, oder Pilot erwartet „echte“ Marktsignale/CRM ohne Vorwarnung.

---

*Letzte Ausrichtung an Codebasis: App Router, `ROUTES` in `lib/routes.ts`, Marktsignale in `app/dashboard/market-signals/`.*
