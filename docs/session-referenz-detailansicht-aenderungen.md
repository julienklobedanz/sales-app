# Änderungen an der Referenz-Detailansicht

Kurzdokumentation der Anpassungen am Referenz-Detail-Modal im Dashboard.

---

## 1. Logo

- **Logo vorübergehend ausgeblendet:** Der Bereich mit Firmenlogo (bzw. anonymisiertem Platzhalter) ist nur auskommentiert, nicht gelöscht. Kann bei Bedarf durch Entfernen der Kommentare wieder eingeblendet werden.

---

## 2. Marktumfeld

- **Nur Anzeige, keine Bearbeitung:** Die Felder „Aktueller Dienstleister“ und „Beteiligte Wettbewerber“ sind in der Detailansicht nicht mehr editierbar (keine Inputs, kein „Änderungen speichern“).
- Bearbeitung erfolgt ausschließlich im Bearbeitungsmodus (z. B. über „Bearbeiten“ / Edit-Seite).

---

## 3. Kontaktdaten

- **Alle Kontaktdaten werden angezeigt:**
  - **Interner Kontakt:** Anzeige von Name (contact_display), E-Mail als klickbarer Link und Rolle („Account Owner“) unterhalb des Namens.
  - **Kundenansprechpartner (extern):** Anzeige von Name (aus Referenz oder external_contacts), E-Mail (aus external_contacts) und Rolle (aus external_contacts) in derselben Formatierung wie beim internen Kontakt – Rolle unterhalb des Namens in kleiner, dezent formatierter Schrift.

---

## 4. Historie

- Angezeigt werden:
  - **Referenz erstellt** (created_at)
  - **Letzte Änderung** (updated_at), nur wenn abweichend von created_at
- Hinweis: Eine detaillierte Historie (welche Felder, Status- oder Ansprechpartner-Wechsel) würde ein eigenes Audit-Log in der DB erfordern (siehe Konzept Variante B in der Dokumentation).

---

## 5. Storytelling / Herausforderung & Lösung

- **„STORYTELLING – KERN DES PROJEKTS“ entfernt:** Die Überschrift und der bisherige Abschnitt existieren nicht mehr.
- **Herausforderung des Kunden** und **Unsere Lösung** werden weiterhin angezeigt, aber:
  - ohne farbliche Hervorhebung (kein Amber-Kasten),
  - mit neutraler Optik wie der restliche Inhalt (z. B. gleicher Rahmen/Hintergrund wie andere Blöcke).
- Abschnittsüberschrift lautet nun: **„Herausforderung & Lösung“**.

---

## 6. Schriftzug Unternehmen

- Der Firmenname unter dem Referenz-Titel (DialogDescription) ist etwas größer und klarer lesbar: `text-sm font-medium`, bleibt aber bewusst kleiner als der Titel (`text-lg`).

---

## 7. Auge / Vorschau (Kundenansicht)

- **Entfernt:** Der Button „Vorschau (Kundenansicht)“ (Auge-Icon) im Header des Detail-Modals und der zugehörige Einzel-Vorschau-Dialog wurden entfernt.
- Die Tabellen-Funktionen „Vorschau“ (Portfolio-Vorschau mit mehreren Referenzen) bleiben unverändert.

---

## 8. Status-Dropdown (Projektstatus)

- **Entfernt:** Das Projektstatus-Dropdown (Aktiv / Abgeschlossen) ist aus der Detailansicht entfernt – für alle Rollen (inkl. Admin).
- Der aktuelle Projektstatus wird nur noch als Badge angezeigt.
- Änderung des Projektstatus erfolgt nur noch im Bearbeitungsmodus.

---

## 9. Projektdetails

- **Eine gemeinsame Card:** Die bisher getrennten Blöcke (Volumen/Vertragsart einerseits, Projektstart/-ende, Letzte Änderung, Erstellt andererseits) sind in **eine** „Projekt-Details“-Card zusammengeführt.
- Enthalten sind: Volumen (€), Vertragsart, Projektstart, Projektende/Dauer, Letzte Änderung, Erstellt.

---

## 10. Rolle externer Ansprechpartner

- Die Rolle des Kundenansprechpartners wird in derselben Formatierung wie die Rolle des internen Kontakts (z. B. „Account Owner“) angezeigt: unterhalb des Namens, klein und dezent (`text-muted-foreground`, `text-[10px]`).
- Quelle der Rolle: `external_contacts.role` (Lookup über `customer_contact_id`).

---

## Technische Anpassungen

- Ungenutzter State und der Import von `updateReferenceDetailFields` wurden entfernt.
- TypeScript-Anpassung für die Ermittlung des externen Kontakts (Ternary statt `&&`, um den Typ von `ext` korrekt zu inferieren).
