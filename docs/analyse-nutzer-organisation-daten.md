# Analyse: Nutzer- und Organisationsverwaltung sowie Datenhaltung/-zugriff

**Stand:** aktueller Codebase (Mandanten-Isolierung, Einladungen, RLS)

---

## 1. Nutzerverwaltung

### 1.1 Registrierung
- **Pfad:** `/register` (optional `?invite=TOKEN`)
- **Daten:** E-Mail, Passwort (min. 6 Zeichen), ggf. Einladungstoken (versteckt)
- **Ablauf:** `signUp()` → bei Session sofort Redirect zu Onboarding oder Dashboard; bei E-Mail-Bestätigung Erfolgsmeldung, `emailRedirectTo` zeigt auf `/auth/callback`
- **Profil/Organisation:** Noch keine – wird erst im Onboarding angelegt

### 1.2 Login
- **Pfad:** `/login` (optional `?invite=TOKEN`)
- **Daten:** E-Mail, Passwort; bei Einladung wird Token durchgereicht
- **Nach Login:** Redirect zu `/dashboard` oder bei Einladung zu `/onboarding?invite=TOKEN`

### 1.3 Onboarding (Profil + Organisation)
- **Pfad:** `/onboarding` (optional `?invite=TOKEN` oder Cookie `invite_token`)
- **Daten:** Vollständiger Name, Rolle (sales/admin), ggf. Firmenname (nur ohne Einladung)
- **Logik:**
  - Gültiger Einladungstoken → Nutzer wird der eingeladenen Organisation zugeordnet (`organization_id` aus `get_invite_by_token`).
  - Kein Token, aber bestehendes Profil mit `organization_id` (z. B. nach Migration) → diese Organisation bleibt.
  - Sonst → neue Organisation über RPC `create_organization(org_name)`, Profil mit dieser `organization_id` anlegen/aktualisieren.
- **Profil:** `profiles`: id (auth.uid), organization_id, role, full_name

### 1.4 Einstellungen (Profil bearbeiten)
- **Pfad:** `/dashboard/settings`
- **Änderbar:** nur `full_name` und `role` – **nicht** `organization_id`
- Nutzer können ihre Organisation nicht selbst wechseln oder entfernen (kein versehentliches Verlassen der Org).

---

## 2. Organisationsverwaltung

### 2.1 Modell
- **Tabelle:** `organizations` (id, name, created_at, updated_at)
- **Zuordnung Nutzer → Org:** `profiles.organization_id` (FK, ON DELETE SET NULL)
- **Neue Organisation:** nur über Onboarding (neuer Nutzer ohne Einladung) per RPC `create_organization` (umgeht RLS beim ersten Anlegen)

### 2.2 Einladungen (Teammitglieder)
- **Tabelle:** `organization_invites` (organization_id, token, invited_by, expires_at, optional email)
- **Erstellen:** Einstellungen → „Einladungslink erstellen“ → Link (7 Tage gültig)
- **Einlösen:** Registrierung oder Login mit `?invite=TOKEN` → Onboarding mit Token → Zuordnung zur eingeladenen Organisation
- **Validierung:** RPC `get_invite_by_token(token)` (SECURITY DEFINER), prüft Ablaufdatum
- **Cookie:** Bei Besuch von `/register?invite=` oder `/login?invite=` wird Token 24 h im Cookie gespeichert (für E-Mail-Bestätigungs-Flow)

### 2.3 Was es (bewusst) nicht gibt
- Kein Wechsel der Organisation durch den Nutzer in den Einstellungen
- Kein Entfernen von Nutzern aus einer Organisation (kein „Team verwalten“)
- Keine Anzeige/Verwaltung offener Einladungen (kein „Einladungen widerrufen“ / Liste)
- Kein separates „Organisationsname ändern“ in den Einstellungen (nur bei Erstellung im Onboarding)

---

## 3. Datenhaltung und Mandanten-Isolierung

### 3.1 Tabellen und organization_id

| Tabelle                 | organization_id      | Bedeutung                                      |
|-------------------------|----------------------|------------------------------------------------|
| organizations           | –                    | Mandant (Firma)                                |
| profiles                | FK → organizations   | Nutzer gehört genau einer Organisation         |
| companies               | FK → organizations   | Referenz-Firma gehört einer Organisation       |
| references              | über company_id      | Referenz gehört zur Org der Company            |
| contact_persons         | FK → organizations   | Kontakt gehört einer Organisation              |
| organization_invites    | FK → organizations   | Einladung gilt für eine Organisation           |
| approvals               | über reference → company | Freigabe zu Referenz (indirekt org-gebunden) |
| favorites               | user_id + reference_id | User-spezifisch; Referenzzugriff über RLS  |

### 3.2 Row Level Security (RLS)

- **Hilfsfunktion:** `current_user_organization_id()` (SECURITY DEFINER) liefert `profiles.organization_id` für `auth.uid()`.
- **references:** SELECT/INSERT/UPDATE/DELETE nur, wenn die zugehörige Company zur eigenen Organisation gehört; zusätzlich Anon-Policies für Zeilen mit `approval_token` (Freigabe-Links).
- **companies:** SELECT/INSERT/UPDATE/DELETE nur mit `organization_id = current_user_organization_id()`; Anon SELECT nur, wenn Referenz mit approval_token auf Company verweist.
- **organizations:** SELECT/UPDATE nur eigene Org; INSERT über Policy bzw. RPC `create_organization`.
- **profiles:** SELECT eigenes Profil oder gleiche Organisation; INSERT/UPDATE nur eigenes Profil (id = auth.uid()), dabei wird `organization_id` in der App nicht geändert.
- **contact_persons, approvals, favorites:** org- bzw. user-gebunden wie oben beschrieben.

Alle Lese-/Schreibzugriffe der App laufen über den normalen Supabase-Client (Session des Nutzers) → RLS filtert konsistent nach Organisation bzw. User.

### 3.3 App-seitige Prüfungen

- **createReference / createContact:** Vor dem Anlegen wird `organization_id` aus dem Profil geholt; bei fehlender Zuordnung klare Fehlermeldung. Neue Companies/Kontakte erhalten explizit `organization_id` der aktuellen Org.
- **getDashboardData, getRequests, deleteReference, updateReference, submitForApproval, reviewRequest, toggleFavorite:** Keine zusätzliche Filterlogik in der App – RLS begrenzt die sichtbaren/bearbeitbaren Zeilen.

---

## 4. Datenzugriff – Übersicht

- **Dashboard (Referenzen, Favoriten):** Nur Referenzen der eigenen Organisation (RLS auf `references`/`companies`).
- **Neue Referenz / Bearbeiten:** Nur Companies der eigenen Org wählbar; neue Company wird mit `organization_id` angelegt; Referenz-Insert/Update durch RLS abgesichert.
- **Kontakte:** Nur Kontakte der eigenen Org (RLS + `organization_id` beim Anlegen).
- **Freigaben (Requests):** Nur Approvals zu Referenzen der eigenen Org (RLS auf `approvals`/`references`/`companies`).
- **Freigabe-Link (/approval/[token]):** Anon kann Referenz (und zugehörige Company) nur lesen/aktualisieren, wenn `approval_token` gesetzt ist – unabhängig von Organisation.
- **Auth-Callback:** Tauscht Code gegen Session; Redirect-URL sicher aus `NEXT_PUBLIC_APP_URL` abgeleitet.

---

## 5. Bewertung und Handlungsbedarf

### 5.1 Stand: ausreichend für fokussierten Einsatz

- Nutzer- und Organisationsmodell sind konsistent: Ein Nutzer gehört einer Organisation, alle fachlichen Daten (Referenzen, Companies, Kontakte, Approvals) sind organisationsgebunden und über RLS geschützt.
- Registrierung, Login, Onboarding und Einladungsflow sind geschlossen; Profiländerungen betreffen nur Name und Rolle, nicht die Organisation.
- Datenzugriff erfolgt einheitlich über den Session-Client; RLS erzwingt die Mandantentrennung. Es gibt keine Stellen, an denen bewusst „alle“ Daten ohne Org-Filter geladen werden.

Du kannst dich damit **erstmal anderen Themen der App** widmen, ohne dass die Nutzer- und Organisationsverwaltung oder die Datenhaltung/-zugriff offensichtliche Lücken haben.

### 5.2 Optionaler / späterer Handlungsbedarf

| Thema | Priorität | Kurzbeschreibung |
|-------|-----------|------------------|
| **Storage (Referenz-PDFs)** | Niedrig | Bucket `references`: Prüfen, ob RLS/Policies so gesetzt sind, dass nur Nutzer der richtigen Organisation Dateien lesen/schreiben können. Aktuell wird nur hochgeladen; Leserechte und Listen-Zugriff sollten mandantenfähig sein. |
| **Einladungen verwalten** | Niedrig | Offene Einladungen anzeigen, Einladung widerrufen (Token ungültig machen), ggf. Ablaufdatum anzeigen. |
| **Organisationsname ändern** | Niedrig | In Einstellungen „Firmenname“ bearbeitbar machen (nur für eigene Org, RLS/Policy prüfen). |
| **Nutzer aus Organisation entfernen** | Optional | Nur sinnvoll, wenn es mehrere Admins pro Org gibt; würde Änderung an `profiles.organization_id` oder „deaktiviert“-Status erfordern. |
| **Rolle „Admin“ pro Organisation** | Optional | Heute: Rolle im Profil (sales/admin). Wenn „Admin“ nur innerhalb der Org gelten soll (z. B. Einladungen nur für Admins), ist das bereits über Profil-Rolle abbildbar; feinere Rechte (nur eigene Referenzen löschen etc.) wären zusätzliche Logik. |

### 5.3 Kein akuter Handlungsbedarf

- Kein Wechsel der Organisation durch Nutzer nötig für den beschriebenen Use-Case.
- Abgelaufene Einladungen: `get_invite_by_token` prüft bereits `expires_at`; abgelaufene Links führen einfach zu „normale Registrierung“ (neue Org).
- Migration/Backfill: Bestehende Daten wurden der Default-Organisation zugeordnet; neue Nutzer erhalten eigene Organisation oder Einladungs-Org – konsistent mit dem Modell.

---

## 6. Kurzfassung

- **Nutzerverwaltung:** Registrierung, Login, Onboarding und Profil (Name, Rolle) sind konsistent und an die Organisation angebunden.
- **Organisationsverwaltung:** Eine Organisation pro Nutzer (bei Einladung geteilt), Erstellung nur über Onboarding/RPC, Einladungen mit Token und Ablauf.
- **Datenhaltung:** Alle relevanten Tabellen haben eine klare Zuordnung zur Organisation; RLS erzwingt die Trennung.
- **Datenzugriff:** Lesezugriffe und Schreibzugriffe laufen über den Session-Client und RLS; keine Stellen mit bewusster org-übergreifender Sicht.

**Fazit:** Für den aktuellen Stand gibt es **keinen zwingenden Handlungsbedarf** in Nutzer-/Organisationsverwaltung und Datenhaltung/-zugriff. Du kannst dich zunächst anderen Themen der App widmen. Die genannten optionalen Punkte (Storage, Einladungsverwaltung, Organisationsname) können bei Bedarf später ergänzt werden.
