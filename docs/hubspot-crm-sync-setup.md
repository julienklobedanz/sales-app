# HubSpot CRM Sync — Setup & offene Schritte

Stand: HubSpot als MVP-Provider (OAuth, Discovery, Import, Brandfetch-Anreicherung).

**Code-Status:** Implementiert (Migration, API-Routen, UI).  
**Betrieb:** Die Schritte unten sind **manuell** und in der Regel noch **offen**, bis ihr sie in eurer Umgebung durchgeführt habt.

---

## Voraussetzungen (bereits im Repo)

- Migration: `supabase/migrations/20260627120000_organization_crm_connections.sql`
- OAuth: `/api/integrations/hubspot/connect` → Callback → Token in `organization_crm_connections`
- Nur **Admins** (`profiles.role = 'admin'`) dürfen verbinden, trennen und importieren
- Import-Flow: Discovery offener Deals → Vorschau → Accounts + Deals anlegen → Brandfetch

---

## Offene Schritte (noch nicht automatisch erledigt)

### Schritt 1 — Migration ausführen (Pflicht)

Die Tabelle `organization_crm_connections` und die CRM-Felder an `companies` / `deals` existieren erst nach der Migration.

```bash
# Supabase SQL Editor oder CLI — Datei ausführen:
supabase/migrations/20260627120000_organization_crm_connections.sql
```

**Check:** Tabelle `organization_crm_connections` sichtbar; Spalten `companies.crm_provider`, `companies.crm_account_id`, `deals.crm_opportunity_id` vorhanden.

---

### Schritt 2 — Umgebungsvariablen setzen (Pflicht)

In `.env.local` (lokal) bzw. **Vercel / Staging / Prod**:

```env
HUBSPOT_CLIENT_ID=...
HUBSPOT_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=...
```

| Variable | Zweck |
|----------|--------|
| `HUBSPOT_CLIENT_ID` | OAuth Client ID aus der HubSpot-App |
| `HUBSPOT_CLIENT_SECRET` | OAuth Client Secret (nur Server) |
| `NEXT_PUBLIC_APP_URL` | Basis-URL für Redirect-URI und Callback (lokal z. B. `http://localhost:3000`, Prod eure Domain) |
| `SUPABASE_SERVICE_ROLE_KEY` | Tokens werden serverseitig über Service Role geschrieben/gelesen — **nicht** ans Frontend |

Kopie-Vorlage: siehe `.env.example` (Abschnitt „HubSpot CRM Sync“).

Optional prüfen:

```bash
npm run verify:launch-env
```

(`HUBSPOT_*` erscheinen als optional; für CRM-Sync müsst ihr sie trotzdem setzen.)

**Hinweis Tokens (MVP):** Access/Refresh-Tokens liegen in `access_token_enc` / `refresh_token_enc` aktuell **unverschlüsselt**. Vor Produktions-Härtung Verschlüsselung einplanen.

---

### Schritt 3 — HubSpot App anlegen (Pflicht)

1. [HubSpot Developer Account](https://developers.hubspot.com/) → **App erstellen**
2. **Redirect URI** eintragen (exakt, inkl. Pfad):
   - **Lokal:** `http://localhost:3000/api/integrations/hubspot/callback`
   - **Prod:** `https://<deine-domain>/api/integrations/hubspot/callback`
3. **Scopes** aktivieren:
   - `crm.objects.companies.read`
   - `crm.objects.deals.read`
   - `oauth`
4. **Client ID** und **Client Secret** in die Env-Variablen (Schritt 2) kopieren

Die Redirect-URI muss **bytegenau** mit `NEXT_PUBLIC_APP_URL` + `/api/integrations/hubspot/callback` übereinstimmen.

---

### Schritt 4 — Als Admin testen (Pflicht)

| # | Aktion | Erwartung |
|---|--------|-----------|
| 1 | Als **Admin** einloggen | Sales / Account Manager: kein Connect, API → 403 |
| 2 | **Settings → Integrationen → HubSpot → Verbindung einrichten** | Redirect zu HubSpot OAuth |
| 2b | Alternativ: **Accounts-Empty-State** → HubSpot-Button | Gleicher OAuth-Flow |
| 3 | OAuth abschließen | Redirect zu `/dashboard/accounts?crm_connected=success&crm_import=1` |
| 4 | **Import-Dialog** öffnet sich | Liste: Accounts mit offenen Opportunities |
| 5 | Accounts auswählen → **Importieren** | Toast mit Anzahl; Seite aktualisiert |
| 6 | `/dashboard/accounts` | Neue/verknüpfte Accounts sichtbar |
| 7 | Account-Detail → Tab **Pipeline** | Deals mit HubSpot-Sync-Link (wenn Portal-ID bekannt) |

**Dev-Preview Empty State** (nur `NODE_ENV=development`):

```
http://localhost:3000/dashboard/accounts?previewOnboarding=1
```

**Manueller Import** (nach bereits erfolgter Verbindung):

- Settings → HubSpot → „Accounts importieren“, oder  
- `/dashboard/accounts?crm_import=1`

**Verbindung trennen:** Settings → HubSpot → „Verbindung trennen“

---

## API-Routen (Referenz)

| Route | Methode | Admin | Beschreibung |
|-------|---------|-------|--------------|
| `/api/integrations/hubspot/connect` | GET | ja | OAuth-Start |
| `/api/integrations/hubspot/callback` | GET | ja | Token speichern |
| `/api/integrations/hubspot/status` | GET | ja | Verbindungsstatus |
| `/api/integrations/hubspot/disconnect` | POST | ja | Trennen |
| `/api/integrations/hubspot/discover` | GET | ja | Accounts mit offenen Deals |
| `/api/integrations/hubspot/import` | POST | ja | Ausgewählte Accounts importieren |

---

## Bekannte Grenzen (bewusst nicht umgesetzt)

- Kein **Delta-Sync** (laufende Aktualisierung von Deal-Stages)
- Kein **Bidirektionaler** Sync (RefStack → HubSpot schreiben)
- Kein **Kontakt-Sync**
- Andere CRMs (Salesforce, Pipedrive, Zoho, Dynamics) weiterhin „Demnächst“

---

## Fehlerbehebung

| Symptom | Ursache | Lösung |
|---------|---------|--------|
| HubSpot-Button disabled / „nicht konfiguriert“ | `HUBSPOT_CLIENT_ID` / `SECRET` fehlen | Env setzen, App neu starten |
| OAuth redirect error | Redirect-URI stimmt nicht | HubSpot-App + `NEXT_PUBLIC_APP_URL` abgleichen |
| `crm_connected=error` | Token-Austausch oder State-Cookie | Logs `[hubspot/callback]`; erneut als Admin verbinden |
| Discovery leer | Keine offenen Deals in HubSpot | In HubSpot Deals mit `hs_is_closed = false` prüfen |
| Import 403 | Kein Admin | Mit Admin-Account testen |
| Tokens nicht gespeichert | `SUPABASE_SERVICE_ROLE_KEY` fehlt | Key in Server-Env setzen |

---

## Siehe auch

- `.env.example` — Variablen-Vorlage
- `lib/crm/types.ts` — Provider-agnostische Typen
- `app/dashboard/accounts/components/crm-import-preview-dialog.tsx` — Import-UI
