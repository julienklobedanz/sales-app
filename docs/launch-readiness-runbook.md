# Launch Readiness Runbook (Staging/Prod)

Dieses Runbook deckt die noch offenen, zielumgebungsabhängigen Punkte aus der technischen Bestandsaufnahme ab.

## 1) Environment in Zielumgebung prüfen

### Baseline (muss gesetzt sein)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `RESEND_FROM` (mit verifizierter Absenderdomain)

### Optional je Feature-Scope
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PRO`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_BILLING_RETURN_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

### Automatischer Check
In der jeweiligen Runtime (Staging/Prod Shell):

```bash
npm run verify:launch-env
```

## 2) Migrationen/RPCs/RLS in Ziel-Supabase verifizieren

In Supabase SQL Editor (Staging/Prod) ausführen:

- `supabase/checks/launch_readiness.sql`

Damit werden geprüft:
- kritische Spalten/Tabellen aus den aktuellen Flows,
- zentrale RPCs/Funktionen,
- RLS-Aktivierung auf Kern-Tabellen,
- Policy-Footprint (Drift-Indikator).

## 3) Market Signals End-to-End

### Cron + Secrets
- Sicherstellen, dass `CRON_SECRET` gesetzt ist.
- Cron-Job für `GET /api/cron/market-signals-digest` aktiv.

### Funktionstest
Mit gültigem Secret:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "$NEXT_PUBLIC_APP_URL/api/cron/market-signals-digest"
```

Erwartung: `ok: true` und sinnvolle Zähler (`sent`, `skipped`, `errors`).

### Delivery
- Resend: Mails kommen an.
- Push: Browser-Abos vorhanden + VAPID korrekt + Push-Nachrichten kommen an.

## 4) Approval/Public E2E

### Approval-Flow
- Freigabe anfordern.
- Link öffnen.
- Approve/Reject durchführen.
- Status-Transition in App prüfen.
- Audit-Events prüfen.

### Public Portfolio
- Locked-State, Unlock, Expired-State, Disabled/NotFound prüfen.
- View-Increment/Share-Link-Logging prüfen (ohne Seitenabbruch bei Telemetriefehlern).
- PDF-Download prüfen.

## 5) Deals-Übersicht

- `/dashboard/deals` ist wieder als echte Übersicht aktiv.
- Smoke prüfen:
  - Liste lädt,
  - Filter/Suche funktionieren,
  - Navigation zu Detail/New funktioniert.

## 6) Kompakter QA Gate

```bash
npm run lint
npm test
npm run build
```

Manuell:
- Auth, Onboarding, Dashboard, Evidence, Accounts, Deals, Match (inkl. RFP), Settings, Public Approval/Portfolio.

