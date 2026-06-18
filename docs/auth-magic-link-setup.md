# Magic Link – Supabase & Resend Setup

Magic Links nutzen `signInWithOtp` (Invite) bzw. **Resend + `generateLink`** (bestehende Konten) – analog zur Registrierungs-Bestätigung.

## 1. Supabase Dashboard

### Authentication → Providers → **Email**

| Einstellung | Empfehlung |
|-------------|------------|
| **Enable Email provider** | ✅ An |
| **Confirm email** | Nach Bedarf (bei Passwort-Registrierung oft an; Magic Link funktioniert in beiden Fällen) |
| **Secure email change** | Optional |

Es gibt **keinen separaten Menüpunkt „Magic Link“** – der Flow läuft über den E-Mail-Provider.

### Authentication → **URL Configuration**

| Feld | Wert (Staging) |
|------|----------------|
| **Site URL** | `https://sales-app-fawn.vercel.app` |
| **Redirect URLs** | `https://sales-app-fawn.vercel.app/auth/callback` |
| | `http://localhost:3000/auth/callback` (lokal) |

Ohne diese URLs lehnt Supabase den Redirect nach Klick auf den Link ab.

### Authentication → **SMTP Settings** (optional)

Nur nötig, wenn **kein Resend** verwendet wird (Fallback in der App).  
Mit `RESEND_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` verschickt die App Magic Links selbst über Resend.

---

## 2. Vercel / `.env.local`

```bash
NEXT_PUBLIC_APP_URL=https://sales-app-fawn.vercel.app   # Prod/Staging
# lokal: http://localhost:3000

RESEND_API_KEY=re_...
SUPABASE_SERVICE_ROLE_KEY=...   # für generateLink (Server only)
# Optional: RESEND_FROM=RefStack <team@deine-domain.de>
# Optional (Dev): RESEND_DEV_OVERRIDE_TO=deine@email.de
```

**SSO (SAML)** erfordert Supabase **Pro** – bis dahin bleibt der SSO-Button aus (`NEXT_PUBLIC_AUTH_SSO_ENABLED` nicht setzen). Bei Pro: `NEXT_PUBLIC_AUTH_SSO_ENABLED=1` setzen.

---

## 3. Ablauf in der App

```
Login → E-Mail eintragen → „Magic Link“
  ├─ Mit Invite (?invite=): Supabase signInWithOtp (legt ggf. Konto an)
  └─ Ohne Invite: Resend-Mail mit Link von admin.generateLink(type: magiclink)
       └─ Fallback: Supabase signInWithOtp (Rate-Limits im Free Tier)
```

Klick auf den Link → `/auth/callback?code=…` → Session → Dashboard (oder Onboarding bei Invite).

---

## 4. Test-Checkliste

### Staging (Vercel)

1. `NEXT_PUBLIC_APP_URL` = `https://sales-app-fawn.vercel.app`
2. Redirect URL in Supabase eingetragen
3. Bestehendes Konto: Login → E-Mail → **Magic Link**
4. E-Mail von RefStack (Resend) mit Button „Bei RefStack anmelden“
5. Klick → eingeloggt im Dashboard

### Lokal

1. `NEXT_PUBLIC_APP_URL=http://localhost:3000`
2. `RESEND_DEV_OVERRIDE_TO=deine-verifizierte@email.de` (Resend Sandbox)
3. Oder `RESEND_MOCK_SUCCESS=true` – Link erscheint in der Server-Konsole

### Invite-Flow

1. Team-Einladung mit Link `/login?invite=TOKEN`
2. E-Mail eintragen → Magic Link
3. Nach Klick: Redirect zu `/onboarding?invite=TOKEN`

### Typische Fehler

| Symptom | Ursache |
|---------|---------|
| Keine E-Mail | `RESEND_API_KEY` oder `SUPABASE_SERVICE_ROLE_KEY` fehlt |
| Resend „only testing emails…“ | Nur verifizierte Empfänger – `RESEND_DEV_OVERRIDE_TO` oder Domain verifizieren |
| „Für diese E-Mail gibt es noch kein Konto“ | Nutzer muss sich registrieren (ohne Invite) |
| Link öffnet, aber kein Login | Redirect URL fehlt in Supabase |
| Falscher Host nach Klick | `NEXT_PUBLIC_APP_URL` stimmt nicht mit Deployment überein |

---

## 5. E-Mail-Vorlage (optional)

Unter **Authentication → Email Templates → Magic Link** kann die Supabase-Standardmail angepasst werden – greift nur beim **Fallback** ohne Resend.

Mit Resend nutzt die App `lib/auth/send-magic-link-email.ts` (RefStack-Layout).

---

## 6. SSO später (Pro Plan)

Wenn SAML verfügbar:

1. Authentication → SAML 2.0 aktivieren
2. IdP pro Kunde per CLI: `supabase sso add --type saml --domains kunde.de`
3. In Vercel: `NEXT_PUBLIC_AUTH_SSO_ENABLED=1`

Siehe auch Supabase-Docs: [Enterprise SSO (SAML)](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml).
