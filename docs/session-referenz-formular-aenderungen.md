# Übersicht: Änderungen am Referenz-Erstellungsformular (Session)

Diese Datei fasst alle in dieser Session umgesetzten Anpassungen am Referenz-Formular und den zugehörigen Backends zusammen.

---

## 1. Pflichtfelder & Validierung

- **Pflichtfelder** (mit rotem Stern `*` markiert):
  - Titel
  - Unternehmen
  - Ansprechpartner intern
  - Projektstatus
  - Projektstart
- Rest der Felder optional.
- **Client- und Server-Validierung** für diese Pflichtfelder in `createReference` und `updateReference`.

---

## 2. Interner Kontakt (Ansprechpartner intern)

- **Neu angelegter Kontakt wird sofort ausgewählt:** Nach dem Anlegen im Dialog wird der neue Kontakt in der Liste angezeigt und automatisch im Dropdown ausgewählt.
- **Technik:** Lokale Liste `additionalContacts` wird mit den vom Server geladenen `contacts` zusammengeführt; neue Kontakte werden per ID **dedupliziert**, damit niemand doppelt erscheint.

---

## 3. Kundenansprechpartner (externer Kontakt)

- **Dropdown wie beim internen Kontakt:** Kundenansprechpartner wird über ein Dropdown gewählt (nicht mehr Freitext).
- **Eigene Tabelle für externe Kontakte:** Externe Kontakte liegen in der Tabelle `external_contacts` (nicht mehr in `contact_persons`).
  - Spalten: `id`, `organization_id`, `company_id`, `first_name`, `last_name`, `email`, `role`, `created_at`, `updated_at`.
  - Jeder externe Kontakt ist einem **Unternehmen** (`company_id`) zugeordnet.
- **Neu angelegter externer Kontakt** wird nach dem Anlegen automatisch ausgewählt.
- **Unternehmen zuerst nötig:** Der „+“-Button zum Anlegen eines Kundenansprechpartners ist deaktiviert, bis ein Unternehmen gewählt ist.
- **Rolle** wird nur noch im Create-Contact-Dialog (beim Anlegen des externen Kontakts) vergeben; das zusätzliche Rollen-Feld im Referenz-Formular wurde entfernt.
- **Keine Dopplung in der Liste:** Anzeige-Liste wird nach Kontakt-ID dedupliziert (Server-Kontakte + neu angelegte).

---

## 4. Formular-Verhalten beim Anlegen von Kontakten

- **Referenz wird nicht mehr mitgespeichert:** Beim Anlegen eines neuen internen oder externen Kontakts bleibt man im Formular; das Referenz-Formular wird nicht abgeschickt.
- **Kein `router.refresh()`** nach Kontakt-Anlage; neue Kontakte werden nur im lokalen State ergänzt.
- **+ Buttons:** Öffnen den Dialog zuverlässig (kein `stopPropagation()` am Trigger-Button, nur `type="button"` zur Vermeidung von Form-Submit).

---

## 5. Create-Contact-Dialog (intern & extern)

- **Formatprüfung** für alle relevanten Felder:
  - Vorname / Nachname: mind. 2 Zeichen, nur Buchstaben (inkl. Umlaute), Leerzeichen, Bindestrich, Apostroph.
  - E-Mail: gültiges Format.
  - Telefon (optional): falls ausgefüllt, nur Ziffern, Leerzeichen, `+ - ( )`, mind. 6 Zeichen.
- **Feldbezogene Fehlermeldungen:** Pro Feld eine Meldung unter dem Eingabefeld + roter Rahmen bei Fehlern; zusätzlich ein Toast mit der ersten Fehlermeldung.
- **Externer Kontakt:** Zusätzliches Feld **Rolle** im Dialog; Speicherung in `external_contacts.role`.
- **Externer Kontakt:** Verwendung der neuen Server-Action `createExternalContact` mit Pflicht-Parameter `companyId`.

---

## 6. Weitere Formular-Anpassungen

- **Entwurf speichern:** Button „Entwurf speichern“ entfernt; Entwurf wird nur noch über die Status-Auswahl „Entwurf“ gespeichert.
- **Vertraulicher NDA-Deal:** Text geändert auf: „Deal unter NDA; Status bleibt auf ‚Nur Intern‘.“ – Zusatz „verhindert versehentliche externe Freigaben“ entfernt.
- **Storytelling:** Keine farbliche Abhebung mehr (amber-Rahmen/Hintergrund entfernt); Zwischenüberschriften „EXTERNER KONTAKT“ und „STORYTELLING – KERN DES PROJEKTS“ entfernt.
- **Industrie:** Alle Optionen auf **Deutsch** (z. B. „Finanzdienstleistungen & Versicherung“, „Handel & Konsumgüter“); Brandfetch-Mapping in den Actions angepasst.
- **Unternehmen:** Anonymisieren-Switch neben dem Feld „Unternehmen“ entfernt (Anonymisierung weiterhin über Freigabestufe „Anonymisiert“).
- **Logo:** Zusatz „(optional)“ beim Label entfernt.
- **Vertragsart:** Statt Freitext ein **Dropdown** mit z. B. Time & Material, Festpreis, Rahmenvertrag, Projektvertrag, Wartungsvertrag, SaaS / Subscription, Sonstige.
- **Projektende:** Hinweistext „Optional, bei aktivem Projekt leer lassen“ entfernt.

---

## 7. Tags

- **Trennung im Formular:** Tags werden im Formular durch **Leerzeichen** getrennt (nicht mehr durch Komma).
- **Eingabe:** Neue Tags mit Leerzeichen bestätigen; Placeholder angepasst.
- **Speichern:** Tags werden mit Leerzeichen zusammengefügt (`tags.join(' ')`).
- **Laden:** Tags werden mit `split(/\s+/)` geparst.
- **Anzeige (Dashboard, Reference-Reader):** Tags mit `split(/[\s,]+/)` geparst, damit sowohl leerzeichen- als auch kommagetrennte bestehende Daten funktionieren.

---

## 8. Datenbank & Migrationen

### 8.1 `20250307120000_references_nda_and_customer_contact_id.sql`

- **is_nda_deal:** Spalte in `public.references` sicherstellen (Schema-Cache-Probleme vermeiden).
- **customer_contact_id:** Spalte in `references` (zunächst FK auf `contact_persons`; siehe nächste Migration).

### 8.2 `20250307140000_external_contacts_table.sql`

- **Neue Tabelle `external_contacts`:**
  - `id`, `organization_id`, `company_id` (FK zu `companies`), `first_name`, `last_name`, `email`, `role`, `created_at`, `updated_at`.
  - RLS-Policies für SELECT/INSERT/UPDATE/DELETE nach `organization_id`.
- **references.customer_contact_id:** Bestehende Verknüpfungen auf `contact_persons` aufgehoben (NULL); FK umgebogen auf `external_contacts(id)`.

---

## 9. Backend (Actions)

- **createReference / updateReference:** Lesen und Speichern von `customer_contact_id`; Pflichtfeld-Validierung (Titel, Ansprechpartner intern, Projektstatus, Projektstart).
- **createExternalContact:** Neue Server-Action; schreibt in `external_contacts` mit `companyId`, `firstName`, `lastName`, `email`, `role`.
- **getDashboardData (actions.ts):** `customer_contact_id` und `customer_contact` in den Selects; Typ `ReferenceRow` um `customer_contact_id` ergänzt.
- **Edit-Seite & New-Seite:** Laden von `external_contacts` (nach `organization_id`) und Übergeben als `externalContacts` an das Referenz-Formular.
- **Dashboard (page.tsx):** Lädt `external_contacts` und übergibt sie an `DashboardOverview` für das „Neue Referenz“-Modal.

---

## 10. Bugfixes in der Session

- **TypeScript:** Zugriff auf `result.error` im Create-Contact-Dialog typ-sicher gemacht (`'error' in result`).
- **+ Buttons:** Dialog öffnet wieder zuverlässig durch Entfernen von `onClick` mit `stopPropagation()` am Trigger-Button.
- **Doppelte Einträge:** Interne und externe Kontaktlisten werden nach ID dedupliziert, damit jeder Kontakt nur einmal in den Dropdowns erscheint.

---

## Betroffene Dateien (Auswahl)

- `app/dashboard/new/reference-form.tsx` – Formular-Logik, Pflichtfelder, Dropdowns, Tags, Deduplizierung.
- `app/dashboard/new/create-contact-dialog.tsx` – Validierung, interne/externe Variante, Rolle, Submit-Verhalten.
- `app/dashboard/new/actions.ts` – `createReference`, `createContact`, `createExternalContact`, Industrie-Mapping.
- `app/dashboard/actions.ts` – `updateReference`, Dashboard-Selects, Typen.
- `app/dashboard/new/page.tsx` – Laden von `externalContacts`.
- `app/dashboard/edit/[id]/page.tsx` – Laden von `external_contacts`, `customer_contact_id` in initialData.
- `app/dashboard/page.tsx` – `externalContacts` für Dashboard.
- `app/dashboard/dashboard-overview.tsx` – `externalContacts`-Prop, Tags-Split für Filter/Anzeige.
- `app/dashboard/reference-reader.tsx` – Tags-Split für Anzeige.
- `supabase/migrations/20250307120000_references_nda_and_customer_contact_id.sql`
- `supabase/migrations/20250307140000_external_contacts_table.sql`

---

*Stand: Session-Zusammenfassung Referenz-Formular.*
