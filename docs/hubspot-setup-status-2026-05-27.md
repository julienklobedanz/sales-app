# HubSpot Setup — Stand 27.05.2026

Kurzprotokoll, um später nahtlos weiterzumachen. Code in RefStack ist fertig; blockiert ist nur die HubSpot-Developer-Konfiguration.

---

## Erledigt ✅

| Bereich       | Status                                                                      |
| ------------- | --------------------------------------------------------------------------- |
| DB-Migration  | `20260627120000_organization_crm_connections.sql` ausgeführt                |
| RefStack-Code | OAuth-Routen, Import-Dialog, Empty States (Accounts + Deals), Settings-Card |
| Env lokal     | `SUPABASE_SERVICE_ROLE_KEY` gesetzt                                         |
| Onboarding UX | Wizard → `?welcome=1`, CRM `returnTo` (accounts/deals/settings)             |

---

## Offen / blockiert ⏸️

### HubSpot Developer App (OAuth)

**Problem:** Neues HubSpot Developer Portal ohne „Legacy Apps“. Die im UI angelegte App **„RefStack CRM Sync“** ist eine **Static/Private-App**:

- Auth-Tab zeigt nur **PAT-Token** (`pat-eu1-...`) + **Client-Geheimnis**
- **Keine** OAuth **App-ID** (UUID) und **keine** Redirect-URL-Felder im UI
- Webhooks-Tab verlangt öffentliche HTTPS-URL (`localhost` wird abgelehnt) — für RefStack **irrelevant**

**RefStack braucht OAuth (nicht PAT):**

```env
HUBSPOT_CLIENT_ID=<UUID App-ID>
HUBSPOT_CLIENT_SECRET=<Client Secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Redirect URI (muss in HubSpot registriert sein):

```
http://localhost:3000/api/integrations/hubspot/callback
```

Scopes: `oauth`, `crm.objects.companies.read`, `crm.objects.deals.read`

### CLI-Weg (nächster Versuch)

```bash
npm install -g @hubspot/cli@latest
hs account auth
mkdir ~/hubspot-refstack && cd ~/hubspot-refstack
hs project create    # Typ: App
# redirectUrls in src/app/app-hsmeta.json setzen
hs project upload
# App-ID + Secret unter developers.hubspot.com → Projects → Auth
```

**Abbruch heute:** Terminal-Fehler bei CLI-Setup — nicht weiter debuggt.

### Noch nicht gesetzt (vermutlich)

- `HUBSPOT_CLIENT_ID`
- `HUBSPOT_CLIENT_SECRET`

Prüfen mit: `npm run verify:launch-env` (HubSpot-Variablen unter „Optional“).

---

## Wenn OAuth steht — Test-Checkliste

1. Als **Admin** einloggen
2. Settings → Integrationen → HubSpot → Verbindung einrichten
3. OAuth abschließen → Toast „HubSpot erfolgreich verbunden“
4. Import-Dialog öffnet sich → Accounts mit offenen Deals wählen → Importieren
5. `/dashboard/accounts` und `/dashboard/deals` prüfen

Alternativ: Accounts-/Deals-Empty-State → HubSpot-Button.

---

## Referenzen

- Ausführliche Anleitung: `docs/hubspot-crm-sync-setup.md`
- OAuth-Helfer: `lib/crm/hubspot/oauth-return.ts`
- Env-Vorlage: `.env.example` (Abschnitt HubSpot CRM Sync)

---

## Roadmap danach (Reihenfolge)

1. ~~Migration~~ ✅
2. ~~Onboarding Wizard ↔ Dashboard-Checkliste~~ ✅ (Code)
3. **Evidence Empty State** ← umgesetzt (27.05.)
4. HubSpot Härtung (Token-Verschlüsselung, Re-Import, Prod)
5. Zweites CRM
