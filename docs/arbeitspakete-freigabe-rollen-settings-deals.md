# Arbeitspakete: Freigabe-Workflow, Rollen, Einstellungen & Deals

**Quelle:** Notizen des Kollegen (Freigabe Workflow, Settings Page, Rollen, Deals Page).  
**Zweck:** Nächste Handlungsschritte ableiten und Arbeitspakete für die Umsetzung vorbereiten.  
**Hinweis:** Keine Umsetzung in diesem Dokument – nur Planung und Strukturierung.

---

## Umsetzungsstand (Prüfung Codebase)

*Stand: Prüfung der aktuellen Codebase. ✅ = umgesetzt, 🔶 = teilweise, ❌ = nicht umgesetzt.*

| Paket | Status | Kurzbeschreibung |
|-------|--------|-------------------|
| **A1** | ❌ | Keine KI-Prüfung auf Anonymisierung/Vollständigkeit bei Entwurf. |
| **A2** | 🔶 | Teilweise: `submitForApproval` + E-Mail an AM (Resend), Token-Link `/approval/[token]`, Status auf internal/external etc. setzbar. Kein expliziter Warnhinweis „Nur für interne Vorbereitung“ im UI. Entwürfe für Sales ausgeblendet (Filter). |
| **A3** | 🔶 | Token-Seite setzt Referenz-Status (auch external); keine getrennte **Kunden-Ansicht** (saubere Case Study + Kunden-OK/Korrekturen). |
| **A4** | ❌ | Keine Pipeline-/Kanban-Seite (`/dashboard/pipeline` o. ä.). |
| **A5** | ❌ | Keine Status-Timeline in der Detailansicht (nur „Historie“ mit „Referenz erstellt“). Kein „Reminder senden“. |
| **B1** | ❌ | **KPI-Cards werden für Sales nicht ausgeblendet** – alle sehen dieselben Karten. Keine Explorer-Startseite, keine RFP-Dropzone, kein Status-Ticker. |
| **B2** | ❌ | Kein One-Click-Anonymisierung (KI), kein gebrandeter PDF-Export, keine Teams-Integration. |
| **B3** | 🔶 | E-Mail bei Freigabeanfrage vorhanden; keine eigene AM-Ansicht („Meine Accounts“). |
| **B4** | 🔶 | Admin sieht Dashboard mit KPIs, Requests-Seite; keine Pipeline-Übersicht, keine Gap Analysis. |
| **B5** | ❌ | Kein Bulk-Editing, kein Audit-Log. |
| **C1** | 🔶 | Profil: Name, E-Mail (read-only), Rolle. Kein Profilbild, kein Passwort ändern, keine 2FA, keine Spracheinstellungen. |
| **C2** | 🔶 | Einladung (InviteCard/Link), Rollen admin/sales. Kein Editor, keine Gruppen. |
| **C3** | ❌ | Kein Branding (Logo, Farben, Fonts, Footer). |
| **C4** | ❌ | Branchen/Länder im Formular fest codiert, keine Einstellungen für Kategorisierung. |
| **C5** | ❌ | Keine Integrationen (CRM, Slack/Teams, API-Key) in den Einstellungen. |
| **D1** | ❌ | Keine Notification-Bell in der Navigation. |
| **D2** | 🔶 | Deals-Seite mit Karte „Aktuelle Deals“, aber nur Platzhalter-Text. |
| **D3** | 🔶 | Karte „Auslaufende Referenzen“, aber nur Platzhalter. |
| **D4** | ❌ | Keine Verknüpfung Deal ↔ auslaufende Referenzen. |
| **E1** | ❌ | Kein Auto-Expiry-Reminder (6 Monate). |
| **E2** | ❌ | Keine One-Click-Eskalation (48 h). |
| **E3** | ❌ | Kein Delegations-Modus. |
| **E4** | ❌ | Anonym ist nur Status-Option, kein Fast-Track (Stufe 3 überspringen). |
| **F1** | ❌ | Kein Hover-Text zur Freigabe, kein Banner für Freigabestatus. |
| **F2** | 🔶 | Favoritenstern wird gelb bei aktiv. Titel nicht deutlich präsenter. |
| **F3** | ❌ | Kein Freigabe-Fortschritt unter dem Titel (ausklappbar). |
| **F4** | 🔶 | Übersicht mit Summary, Tags, Industrie, Region, Projektstatus, Dauer, Website, Erstellt, Aktualisiert. Keine Mitarbeiteranzahl, Volumen, Vertragsart, >3 Jahre, CRM-ID. |
| **F5** | ❌ | Keine Sektion Projektinformationen (Problem/Lösung, Gewinngrund), kein PDF-Download, keine Länder mit Flaggen. |
| **F6** | 🔶 | Interner Kontakt (Account Owner) angezeigt. Kein Tel/Teams, kein Hover, keine Historie, kein „Kontakt Kundenseite“, kein Kunden-Approval-Button. |
| **F7** | 🔶 | Datei-Anzeige und Link „Öffnen“. Kein D&D im Sheet, kein gebrandetes PDF, kein Download nur bei extern freigegeben. |
| **F8** | 🔶 | „Historie“ mit nur „Referenz erstellt“. Kein „zuletzt aktualisiert“, keine Freigabenhistorie, nicht als „Infos zur Referenz“ benannt. |
| **F9** | 🔶 | Button „Einzelfreigabe anfragen“ für Sales (internal/restricted), löst E-Mail aus. Kein Modal (Deal/Kunde, Größe, Frist, Nachricht). |
| **F10** | ❌ | Keine Referenzcalls (E-Mail/Tel-Einverständnis). |
| **F11** | ❌ | Kein „Verified by AM“-Badge. |

**Zusammenfassung:** Kein Arbeitspaket ist vollständig umgesetzt. Einige sind **teilweise** umgesetzt (A2, A3, B3, B4, C1, C2, D2, D3, F2, F4, F6, F7, F8, F9). Alle übrigen sind **noch offen**. Erster sinnvoller Schritt: **B1 (KPI-Cards für Sales ausblenden)** – geringer Aufwand, sofort sichtbarer Effekt.

---

## Übersicht der Themenblöcke

| Block | Kurzbeschreibung |
|-------|------------------|
| **A** | Freigabe-Workflow (3 Stufen, Status, Pipeline, Timeline) |
| **B** | Rollen & Ansichten (Sales, Account Manager, Reference Manager) |
| **C** | Einstellungen (Profil, Team, Branding, Kategorisierung, Integrationen) |
| **D** | Deals-Seite & Notifications (aktuelle Deals, auslaufende Referenzen, Nav-Bell) |
| **E** | Smart Features (Reminder, Eskalation, Delegation, Fast-Track anonym) |
| **F** | Referenz-Detailansicht (Detail-Sheet: Freigabe, Übersicht, Ansprechpartner, Dateien, Einzelfreigabe, etc.) |

---

## A. Freigabe-Workflow

### A1 – Stufe 1: Entwurf & KI-Validierung (Intern)

**Ausgangslage:** AM oder Reference Manager legt einen Entwurf an.

**Scope:**
- Referenz wird im Status **Entwurf** gespeichert (wie heute).
- **KI-Prüfung** (neu): Nach Anlegen/Bearbeiten des Entwurfs prüft eine KI (oder ein definierter Check) auf:
  - Anonymisierung (keine unerlaubten personen-/firmenbezogenen Daten in freigegebenen Texten).
  - Vollständigkeit (z. B. fehlende Umsatzangaben, Pflichtfelder).
- Entwurf bleibt **nur für den Ersteller** sichtbar (bzw. wie heute rollenbasiert).

**Abhängigkeiten:** Bestehende Referenz-Erstellung; evtl. KI-/LLM-Anbindung oder regelbasierte Checks.

**Offene Punkte:** Wo läuft die KI (Server, externer Service)? Welche Felder werden geprüft?

---

### A2 – Stufe 2: Fachliche Freigabe (Account Team)

**Trigger:** Reference Manager gibt den Entwurf zur Prüfung an den **Account Owner** frei.

**Scope:**
- **Benachrichtigung** an den AM: in RefStack + optional per E-Mail/Teams.
- AM muss bestätigen:
  - Ist die Story **faktisch korrekt**?
  - Ist die **Kundenbeziehung** aktuell stabil genug für eine Nennung?
- Nach Bestätigung: Status **„Intern freigegeben“** (z. B. `internal`).
- Sichtbarkeit: Sales-Team, mit **Warnhinweis** „Nur für interne Vorbereitung“.

**Abhängigkeiten:** A1 (Entwurf); bestehende Freigabe-Anfragen (approvals); Zuordnung Referenz → Account Owner (contact_id / AM).

**Offene Punkte:** Wo wird „zur Prüfung freigeben“ ausgelöst (Button in Detail/Liste)? Welcher Kanal für Teams (Webhook, Bot)?

---

### A3 – Stufe 3: Externe Freigabe (Kunden-OK)

**Trigger:** Sales Rep fragt **Einzelfreigabe** für einen Deal an **oder** AM startet den **generellen Freigabeprozess**.

**Scope:**
- RefStack generiert einen **Share-Link** für den Kundenansprechpartner.
- Kunde sieht eine **saubere Ansicht** der Case Study (ohne interne Infos).
- Kunde kann per Klick **zustimmen** oder **Korrekturen markieren**.
- Nach Zustimmung: Status **„Extern freigegeben“** (z. B. `external`) – grünes Licht für alle Sales-Aktivitäten.

**Abhängigkeiten:** A2 (intern freigegeben); bestehende Status-Werte; öffentliche/geschützte Route für Kunden-Link.

**Offene Punkte:** Token-basierter Link? Speicherung der Kunden-Antwort (Datum, optional Kommentar). Wie werden „Korrekturen markieren“ umgesetzt (Freitext, vordefinierte Optionen)?

---

### A4 – Approval-Dashboard (Pipeline/Kanban)

**Ziel:** Reference Manager sieht alle Referenzen im Freigabeprozess in einer **Pipeline-Ansicht** (Kanban).

**Spalten (Vorschlag):**
1. **Neu / Vorschläge** (KI-Entwürfe oder neu angelegt).
2. **Wartet auf AM** (interne Validierung durch Account Owner).
3. **Wartet auf Kunde** (externe Verifizierung).
4. **Live** (vollständig freigegeben).

**Scope:**
- Neue Seite oder Bereich z. B. `/dashboard/pipeline` oder in Dashboard integriert.
- Karten pro Referenz mit Kerninfos (Unternehmen, Titel, Status, ggf. Fristen).
- Drag & Drop optional (Verschieben zwischen Spalten = Statusänderung + ggf. Benachrichtigung).

**Abhängigkeiten:** A1–A3 (Status-Logik und Benachrichtigungen).

---

### A5 – Status-Timeline in der Detailansicht

**Ziel:** In der **Detailansicht** einer Referenz (Sidebar/Sheet) eine kleine **vertikale Status-Timeline** rechts in der Sidebar.

**Inhalt (Beispiel):**
- **Erstellt** (Datum, User) ✅
- **AM-Check** (z. B. „Alex Stoepel, vor 2 Tagen“) ✅ – bei >10 Tage exaktes Datum anzeigen.
- **Kunden-Freigabe** (Ausstehend – Button: „Reminder senden“) ⏳

**Scope:**
- Timeline-Komponente mit Zuständen (erledigt / ausstehend).
- Buttons wie „Reminder senden“ nur bei Berechtigung und sinnvollem Status.

**Abhängigkeiten:** A2, A3 (Daten: wer hat wann freigegeben); Audit-/Historie-Daten falls vorhanden.

---

## B. Rollen & Ansichten

**Rollen (3):** Sales, Account Manager (AM), Reference Manager (Ref. Mgr).  
**Hinweis:** Aktuell gibt es im Code vermutlich `admin` und `sales`. Die Notizen führen „Editor“ und „Ref. Mgr“ ein; AM kann eigene Rolle oder Untertyp sein – muss mit bestehender `profiles.role` abgeglichen werden.

---

### B1 – Sales: Explorer-Startseite & Suchfokus

**Ziel:** Sales sieht eine **Explorer-Startseite** (Home) mit maximaler Geschwindigkeit „rein und raus“.

**Scope:**
- **KPI-Cards ausblenden:** Die KPI-Karten (Gesamt, Entwürfe, Ausstehend, Freigegeben) werden in der **Sales-Rep-Rolle nicht angezeigt** – nur für Reference Manager / Admin sichtbar.
- **Zentrale Suchleiste** prominent (wie Suchmaschine) mit Filtern (Branche, Tech-Stack, Region).
- **RFP-Dropzone** daneben: Ausschreibungsdokument hochladen → KI schlägt passende Referenzen gerankt vor.
- **Status-Ticker:** Kurzinfo zu laufenden Einzelfreigabe-Anfragen.
- **Freigabeanfrage an AM** pro Referenz + Icon für Vertraulichkeits-/Freigabestufe.
- **Sidebar:** Explorer (globale Suche), Quick-Access („Zuletzt genutzte Referenzen“, „Meine Favoriten“), „Meine Anfragen“, „Aktuelle & auslaufende Deals“.

**Abhängigkeiten:** Bestehende Suche/Filter; Favoriten; Approvals; ggf. Deals-Daten (D).

---

### B2 – Sales: Exklusive Features

**Scope:**
- **One-Click-Anonymisierung (KI):** Kundennamen in neutrale Beschreibung umwandeln.
- **One-Click-Export:** Gebrandetes PDF oder Textbaustein mit Logo (eigen + Kundenlogo wenn freigegeben).
- **Teams-Integration:** Aus Referenz heraus AM per Teams kontaktieren (One-Click-Call).

**Abhängigkeiten:** B1; Einstellungen Branding (C); evtl. externe APIs (Teams).

---

### B3 – Account Manager: E-Mail-first & eigene Ansicht

**Ausgangslage:** Freigaben laufen **E-Mail-first** (RefStack schickt Mails an AM).

**Scope:**
- Bestätigen: E-Mail-Benachrichtigungen für Freigabeanfragen (bereits teilweise vorhanden?).
- **Optionale eigene Ansicht** für AM: Übersicht „Meine Accounts“ / Referenzen, die ich freigeben muss – sinnvoll, wenn ein AM mehrere Accounts betreut.

**Abhängigkeiten:** A2; Zuordnung Referenz → AM (contact_id / Account Owner).

---

### B4 – Reference Manager: Management-Dashboard & Sidebar

**Ziel:** Ref. Mgr hat Governance, Compliance, Pflege des Datenbestands.

**Scope:**
- **Home (Management-Dashboard):**
  - KPI-Karten: Gesamtanzahl Referenzen, im Entwurf, ausstehende Freigaben, bald ablaufende Cases (Expiry).
  - Approval-Pipeline-Übersicht (Liste der Referenzen, die auf OK warten).
  - **Daten-Lücken (Gap Analysis):** KI-Hinweis, in welchen Branchen/Tech-Bereichen Referenzen fehlen (basierend auf Sales-Suchanfragen).
- Anlegen/Bearbeiten von Referenzen (bereits vorhanden).
- **Sidebar:** Dashboard, Alle Referenzen, Pipeline, Einstellungen/Templates.

**Abhängigkeiten:** A4 (Pipeline); bestehende Dashboard-KPIs; evtl. Logging von Suchanfragen für Gap Analysis.

---

### B5 – Reference Manager: Exklusive Features

**Scope:**
- **Bulk-Editing:** Mehrere Referenzen gleichzeitig (z. B. neuen AM zuweisen, Tags ändern).
- **Review-Workflow:** Korrigieren und Freigeben von Entwürfen (von Sales/AM).
- **Audit-Log:** Historie, wer wann welche Referenz geändert oder exportiert hat.

**Abhängigkeiten:** B4; DB/Logging für Audit-Events.

---

## C. Einstellungen

### C1 – Profil & Account (persönlich)

**Scope:**
- **Nutzerprofil:** Name, E-Mail, Profilbild.
- **Passwort & Sicherheit:** Passwort ändern, 2FA aktivieren.
- **Spracheinstellungen:** Interface-Sprache (und ggf. Standard-Referenzsprache).

**Abhängigkeiten:** Bestehende Settings-Seite; Auth (Supabase Passwort, 2FA).

---

### C2 – Team-Management (Rollen & Rechte)

**Scope:**
- **Mitglieder einladen:** E-Mail-Versand (bereits Einladungslink?).
- **Rollen-Definition:** Admin (alles), Editor (Referenzen erstellen/bearbeiten), Sales/Viewer (nur suchen, lesen, exportieren).
- **Gruppen:** Zuweisung zu Abteilungen (z. B. „Vertrieb DACH“, „Marketing USA“).

**Abhängigkeiten:** C1; bestehende `profiles.role` und `organization_invites`; ggf. neue Tabelle `groups` und Zuordnung User ↔ Gruppe.

---

### C3 – Branding & Design

**Scope:**
- **Logo-Upload** für Export-Kopfzeile.
- **Primärfarben** (Hex).
- **Schriftarten** (Auswahl oder Upload).
- **Footer-Text** (Disclaimer/Kontakt für Exporte).

**Abhängigkeiten:** Einstellungen-Seite; Speicherung pro Organisation; Export/PDF-Generierung (B2).

---

### C4 – Kategorisierung & Metadaten (global)

**Scope:**
- **Branchen-Liste** (eigene Kategorien, z. B. Pharma, Automotive).
- **Produkt-Tags** (Produkte/Dienstleistungen verknüpfbar).
- **Regionen** (DACH, EMEA, Global).

**Abhängigkeiten:** Einstellungen; Referenz-Formular nutzt diese Listen (derzeit evtl. fest codierte Industrien/Länder).

---

### C5 – Integrationen & API

**Scope:**
- **CRM:** HubSpot, Salesforce, Pipedrive.
- **Slack/Teams:** Benachrichtigungen in Channel bei neuer Referenz.
- **API-Key-Management** für Einbettung in eigene Website.

**Abhängigkeiten:** C; externe Dienste; sichere Speicherung von Keys.

---

## D. Deals-Seite & Notifications

### D1 – Notification-Bell in der Navigation

**Scope:**
- **Notification-Bell** oben in der Navbar.
- Beim Klick: **Popover** mit z. B. zwei Bereichen/Switchern:
  - „Expiring Deals“ (auslaufende Referenzen/Freigaben).
  - (weiterer Switcher aus Notizen offen – z. B. „Meine Anfragen“ oder „Team-Anfragen“).

**Abhängigkeiten:** Layout/Navbar; Daten für „expiring“.

---

### D2 – Deals-Seite: Layout & linke Spalte (Aktuelle Deals)

**Scope:**
- **Responsive Grid:** `grid-cols-1 lg:grid-cols-2`.
- **Linke Spalte – Aktuelle Deals (Sales-Fokus):**
  - Table oder Cards mit: Unternehmen & Titel, Status-Badge (z. B. „In Verhandlung“, „RFP Phase“), **Match-Indikator** (wie viele passende Referenzen), Action: **„Passende Referenzen finden“** → springt in gefilterte Referenz-Suche.
- Optional **Tabs:** „Meine Deals“ / „Team Deals“.

**Abhängigkeiten:** Deals-Datenquelle (noch zu definieren: eigene Tabelle „deals“ oder Anbindung CRM?); Referenz-Matching-Logik.

---

### D3 – Deals-Seite: Rechte Spalte (Auslaufende Referenzen)

**Scope:**
- **Rechte Spalte – Auslaufende Referenzen (Manager-Fokus):**
  - **Progress Bar** (z. B. shadcn Progress): wie viel Zeit bis Ablauf der Freigabe (z. B. 180-Tage-Balken, wird rot bei nahem Ende).
  - **Farbige Datums-Badges:** rot „Läuft in 30 Tagen ab“, gelb „90 Tage“.
  - **Verantwortlicher AM** (Avatar/Name).
- Optional **Alert** oben, wenn eine wichtige Referenz heute abläuft.

**Abhängigkeiten:** A2/A3 (Freigabe-Fristen, Ablaufdatum); Speicherung „Freigabe gültig bis“.

---

### D4 – Verknüpfung Deal ↔ auslaufende Referenzen

**Scope:**
- Wenn in der linken Spalte ein **neuer Deal** erscheint (z. B. „Cloud Projekt bei BMW“), in der rechten Spalte **hervorheben**, wenn dafür relevante Referenzen bald ablaufen.
- Sales sieht: „BMW-Referenz jetzt verlängern, sonst für diesen Deal nicht nutzbar.“

**Abhängigkeiten:** D2, D3; Definition „relevant“ (Branche, Tags, Unternehmen).

---

## E. Smart Features (Freigabe-Beschleunigung)

### E1 – Auto-Expiry-Reminder

**Scope:**
- **6 Monate vor Ablauf** einer Freigabe: AM erhält automatisch Aufgabe/Benachrichtigung: „Referenz bei Kunde X noch aktuell? Bitte re-validieren.“

**Abhängigkeiten:** A2/A3; Ablaufdatum pro Freigabe; Cron/Job oder Edge Function für zeitgesteuerte Mails/Tasks.

---

### E2 – One-Click-Eskalation

**Scope:**
- Wenn AM **48 h nicht reagiert:** Reference Manager kann mit einem Klick:
  - Anfrage an Vorgesetzten/Head of Sales **eskalieren**, oder
  - Referenz temporär auf **„Limited“** setzen.

**Abhängigkeiten:** A2; Fristen-Tracking; Rollen/Vorgesetzten-Zuordnung.

---

### E3 – Delegations-Modus (AM abwesend)

**Scope:**
- Wenn AM im Urlaub (z. B. Outlook-Sync oder manuell „Abwesend“):
  - Freigabeanfrage wird automatisch an **hinterlegten Stellvertreter** oder andere hinterlegte AMs geleitet.

**Abhängigkeiten:** A2; Stellvertreter-/Delegations-Konzept (Datenmodell); ggf. Outlook-Integration.

---

### E4 – Fast-Track für anonyme Referenzen

**Scope:**
- Wenn Referenz von vornherein als **„Anonymisiert“** markiert wird:
  - **Stufe 3 (Kunden-OK) entfällt** – keine geschützten Markendaten.
  - Referenz wird nach interner Freigabe (Stufe 2) sofort für Sales nutzbar.

**Abhängigkeiten:** A2, A3; Status-Logik (anonymous → Skip Kunden-Freigabe).

---

## F. Referenz-Detailansicht (Detail-Sheet)

*Alle Punkte nochmal hinterfragen – Darstellung und Struktur als Vorschlag.*

---

### F1 – Freigabenanzeige & Sichtbarkeit

**Scope:**
- **Oben rechts:** Freigabenanzeige (Freigabestatus).
- **Hover:** Erklärung anzeigen, z. B. *„Limited external use – the reference needs to be approved by the account first. Click the button at the bottom of this page to start.“*
- **Option:** Freigabestatus als **Banner oben prominent** machen, damit er nicht übersehen wird (aktuell etwas versteckt).

**Offen:** Texte final formulieren; ob Banner immer oder nur bei eingeschränkten Status.

---

### F2 – Favoriten & Titel

**Scope:**
- **Favoritenstern:** Gelb darstellen, wenn als Favorit markiert (bereits teilweise vorhanden – einheitlich gelb bei „angeklickt“).
- **Titel:** Deutlich präsenter machen (z. B. größer/gewichtet, z. B. „Cloud …“ klar hervorgehoben).

---

### F3 – Freigabe-Fortschritt unter dem Titel

**Scope:**
- **Direkt unter dem Titel:** Fortschritt des Freigabeprozesses sichtbar.
- **Nur der aktuelle Step** wird standardmäßig angezeigt; **Rest ausklappbar** (Darstellung mit Kreisen und Linien, wie im „Kreise und Linien“-Bild rechts in den Notizen).

**Abhängigkeiten:** A5 (Status-Timeline); Daten zu Erstellt, AM-Check, Kunden-Freigabe.

---

### F4 – Übersicht (Kurzinfos)

**Scope:**
- **Kurzzusammenfassung:** Beibehalten, oder durch **Kurzbeschreibung des Unternehmens** ersetzen (z. B. was für ein Unternehmen, wie viele Mitarbeiter, wo HQ). Noch klären: Zusammenfassung rausnehmen und in „Projektinformationen“ aufgehen lassen?
- **Bereiche:** Mit Tags der Projektbereiche (Cloud, E-Commerce, etc.) – Tags wie bereits im Formular.
- **Blöcke nebeneinander mit Icons** (getrennt z. B. durch „///“):
  - **Industrie** /// **Region** („HQ“)
  - **Website** /// **Mitarbeiteranzahl** des Referenz-Unternehmens
  - **Projektstart von–bis** /// **Gesamtdauer** (z. B. 48 Monate)
  - **Volumen in €** (z. B. €5 Mio) /// **Vertragsart** (Time & Material, Fixed Term Contract)
  - **Älter als 3 Jahre?** (Haken oder X) /// **CRM-ID** (typischerweise eine Zahl, als Link hinterlegt, damit direkter Sprung ins CRM – z. B. 9001349718; Hinweis: CRM-Anbindung ist bei vielen Unternehmen sensibel).

**Offen:** Neue Felder im Datenmodell (Mitarbeiteranzahl, Volumen, Vertragsart, „älter als 3 Jahre“, CRM-ID, Länder des Einsatzes); ob CRM nur als Link oder echte Anbindung.

---

### F5 – Neue Sektion: Projektinformationen

**Scope:**
- **Das Problem unseres Kunden** (max. xxx Zeichen).
- **Unsere Lösung** (max. xxx Zeichen).
- Beide evtl. **nebeneinander**.
- **Gewinngrund** (Preis, gute Partnerschaft, Kundenbeziehung, etc.) – **nur intern sichtbar**, nicht im PDF-Export.
- **PDF-Download-Button** hier integrieren.
- **Land/Länder**, in denen der Service/das Projekt erbracht wird/wurde: DE, AT, CH etc., evtl. mit Emoji-Flaggen; **Hover** mit Text, bei PDF-Export lesbar (keine reinen Emojis ohne Text).

**Abhängigkeiten:** Neue Felder (Problem, Lösung, Gewinngrund, Länder); Export/PDF (B2, C3).

---

### F6 – Ansprechpartner (intern & Kunde)

**Scope:**
- **Interner Kontakt** → Bezeichnung evtl. „Interner Ansprechpartner“ / „Interne Verantwortliche“.
  - **Firmen-E-Mail + Tel + Teams-Icon:** Infos beim Hover anzeigen, **klickbar** für direkte Interaktion (E-Mail, Anruf, Teams).
  - **Historie interner Ansprechpartner** hinterlegen, damit Nachfolger beim Kunden direkt Anschluss finden können.
- **Rechts daneben: Kontakt auf Kundenseite**
  - Kundenname, Titel, Kontaktdaten (E-Mail, Telefon).
  - **Button:** Approval direkt beim Kunden anfragen – Sinn und **Datenschutz** noch klären.
- **Struktur:** Evtl. Absatz „Interner Kontakt“ und „Kontakt Kundenseite“ zu **„Infos zu Ansprechpartnern“** zusammenfassen; **Abfolge und Struktur** nochmal durchdenken.

**Offen:** Datenschutz bei Kunden-Approval-Button; ob Einzelfreigabe vs. übergreifende Freigabe (s. F9).

---

### F7 – Dateien

**Scope:**
- **Drag & Drop Upload** für Dateien (nur von **Reference Managern** verwaltbar bzw. freigebbar?).
- **Button:** Infos wie im Screenshot als **gebrandetes PDF** (Firmenlogo + Kundenlogo) herunterladen – **Download-Pfeil-Icon**.
- **Dokumentendownload:** Hinterlegte Case Study (PowerPoint/Word) – **nur wenn extern freigegeben**.

**Abhängigkeiten:** Rollen (Ref. Mgr); Freigabestatus; Branding (C3).

---

### F8 – Historie → „Infos zur Referenz“

**Scope:**
- **Referenz erstellt** (Datum, ggf. User).
- **Referenz zuletzt aktualisiert** (Datum).
- **Freigabenhistorie** (inkl. individuelle Freigaben).

Bezeichnung der Sektion: **„Infos zur Referenz“** (statt nur „Historie“).

---

### F9 – Einzelfreigabe-Button & Modal

**Scope:**
- **Button „Einzelfreigabe anfragen“** (mit Papierflieger-Icon): **prominenter**, **immer sichtbar** (z. B. fix unter der letzten Sektion oder sticky), nicht versteckt.
- **Sichtbarkeit:** Nur anzeigen, wenn die Referenz **noch nicht „extern“ freigegeben** ist und/oder eine **Einzelfreigabe benötigt** wird.
- **Beim Klick:** **Neues Fenster/Modal** mit Abfrage:
  - Was soll das Account Team beim Kunden freigeben lassen?
  - Um welchen Kunden/Deal, in welcher Größe?
  - Bis wann wird die Freigabe benötigt?
  - Nachricht an Account Manager.
- **Button im Modal:** Sendet **sofort eine E-Mail** an den eingetragenen AM bzw. alle gelisteten internen Ansprechpartner (falls einer Out of Office ist), mit Bitte um Kunden-OK für die Nutzung der Referenz. **E-Mail-Text und -Design noch formulieren und gestalten.**
- **Offen:** Soll unterschieden werden zwischen **„Einzelfreigabe anfragen“** (für einen konkreten Deal) und **„Übergreifende Freigabe anfragen“** (Referenz allgemein extern freigeben)?

**Abhängigkeiten:** A2, A3; E-Mail-Versand; evtl. OoO-Logik (E3).

---

### F10 – Referenzcalls

**Hintergrund:** Manche (Neu-)Kunden verlangen in Ausschreibungen **Referenzcalls** – d. h. sie möchten mit dem Referenz-Kunden **persönlich telefonieren** (direkte Durchwahl). **Datenschutz- und Freigabethema.**

**Scope:**
- **Option:** Kästchen vom Kunden auswählbar: **„Einverstanden mit Kontakt per: ○ E-Mail   ○ Tel“** – um festzuhalten, ob Kontakt per E-Mail und/oder Telefon erlaubt ist.
- Freigabe für Referenzcalls ggf. separat abbilden (analog zu Einzelfreigabe).

**Offen:** Datenschutz; ob als Teil der bestehenden Freigabe oder eigener Freigabe-Typ.

---

### F11 – „Verified by AM“ Badge / Watermark

**Scope:**
- **Badge oder Watermark** in der Referenz: z. B. *„Daten verifiziert durch [Name AM] am [Datum]“* (z. B. „Daten verifiziert durch Alex Stoepel am 20.02.2026“).
- **Zweck:** Gibt dem Sales Rep psychologische Sicherheit; spart unnötigen Check-Anruf oder Teams-Nachricht – Sales kann „mit Vollgas weitermachen“.

**Abhängigkeiten:** A2 (AM-Check); Speicherung Verifizierungsdatum und -person.

---

## Empfohlene Reihenfolge (Phasen)

Ohne Anspruch auf finale Priorisierung – als Diskussionsgrundlage:

1. **Phase 1 – Grundlagen**
   - **B1** (KPI-Cards für Sales ausblenden) – schneller UX-Gewinn.
   - **A2** (Fachliche Freigabe) verfeinern (Benachrichtigung, Status „internal“, Warnhinweis).
   - **A4** (Approval-Dashboard/Pipeline) in einfacher Form (Listen pro Status).
   - **A5** (Status-Timeline in Detailansicht).
   - **F1, F2, F3** (Detail-Sheet: Freigabenanzeige/Banner, Favoriten/Titel, Freigabe-Fortschritt).
   - **B3** (AM E-Mail-first prüfen/ausbauen).
   - **E4** (Fast-Track anonym) – geringer Aufwand, großer Nutzen.

2. **Phase 2 – Stufe 3 & Detail-Sheet**
   - **A3** (Externe Freigabe, Share-Link, Kunden-OK).
   - **F4–F8** (Detail-Sheet: Übersicht, Projektinformationen, Ansprechpartner, Dateien, Historie).
   - **F9** (Einzelfreigabe-Button & Modal inkl. E-Mail-Text).
   - **F11** (Verified-by-AM Badge).
   - **D1** (Notification-Bell), **D2**, **D3** (Deals-Seite mit aktuelle + auslaufende Referenzen).

3. **Phase 3 – KI, Rollen & Erweiterungen**
   - **A1** (KI-Validierung Entwurf).
   - **B1** (Sales Explorer-Startseite), **B2** (Export, Anonymisierung, Teams).
   - **B4**, **B5** (Ref. Mgr Dashboard, Bulk, Audit-Log).
   - **F10** (Referenzcalls: Einverständnis Kontakt per E-Mail/Tel, Datenschutz klären).

4. **Phase 4 – Einstellungen & Integration**
   - **C1–C5** (Profil, Team, Branding, Kategorisierung, Integrationen).
   - **D4** (Deal ↔ auslaufende Referenzen verknüpfen).

5. **Phase 5 – Automatismen**
   - **E1** (Auto-Expiry-Reminder), **E2** (Eskalation), **E3** (Delegation).

---

## Offene Klärungspunkte (vor Umsetzung)

- **Rollen:** Abbildung Sales / AM / Ref. Mgr auf bestehende `admin` / `sales` oder neue Rollen/Flags?
- **Datenmodell:** „Deals“ – eigene Tabelle in RefStack oder nur CRM-Anbindung?
- **Freigabe-Ablaufdatum:** Wo wird „gültig bis“ gespeichert (Referenz vs. Approval)?
- **KI:** Welcher Dienst für Anonymisierung, Vollständigkeit, RFP-Matching (intern vs. extern)?
- **Teams/Mail:** Konkrete Kanäle (Webhook-URLs, E-Mail-Templates) pro Organisation konfigurierbar?
- **Detail-Sheet (F):** Neue Felder (Mitarbeiteranzahl, Volumen, Vertragsart, Problem/Lösung, Gewinngrund, Länder, CRM-ID) – Datenmodell und Pflicht optional. CRM nur Link oder Anbindung?
- **Einzelfreigabe vs. übergreifend:** Getrennte Flows „Einzelfreigabe anfragen“ und „Übergreifende Freigabe“ (allgemein extern)?
- **Referenzcalls & Datenschutz:** Freigabe für Kontakt per E-Mail/Tel; eigener Freigabe-Typ oder Teil der bestehenden?
- **E-Mail-Text Einzelfreigabe:** Finale Formulierung und Layout der Mail an AM(s) für Kunden-OK.

---

*Ende des Dokuments. Nächster Schritt: Priorisierung mit dem Team und Auswahl der ersten Arbeitspakete für die Umsetzung.*
