# Freigabeflow E2E & Optimierung aus Beratersicht (MSP B2B)

## 1. Was ihr heute habt (Ist-Flow)

```
Referenz anlegen (Portfolio-Stufe: Entwurf / Nur intern / …)
    ↓
Sales: „Freigabe starten“ → AM bekommt internen Link
    ↓
AM: interne Freigabe bestätigen
    ↓
AM: Kundenfreigabe vorbereiten → Magic Link an Kundenkontakt
    ↓
Kunde: /approval/{token}
    • 4 Karten (namentlich / anonym / Änderungen / keine Freigabe)
    • Optional: Referenzanrufe-Checkbox
    • 2 Einwilligungs-Checkboxen
    • Optional: Zitat bearbeiten
    ↓
Freigabe → status external + Bestätigungs-Mail mit Sperrlink
    ↓
Kunde: jederzeit bearbeiten (Approval-Link) oder sperren (Sperrlink)
```

**Stärken im Produkt:**

- Klarer interner Gatekeeper (AM) vor dem Kundenkontakt
- Gute Scope-Datenbank (`approval_scope_*`, Call-Frequenz im Modell)
- Kunden-UX mit Quick-Choice statt Formular-Wüste
- Control-Loop mit Sperrlink (Vertrauen + DSGVO-relevant)
- Deal Desk hat bereits **Referenz-Klauseln** (`lib/deal-desk/legal-clauses.ts`) — „Rundum-Sorglos“, „Mittel“, „Anonym“

**Kernproblem im MSP-Vertrieb:**  
In Ausschreibungen wird oft „Reference Call verfügbar“ verlangt — tatsächlich passieren die selten. Kunden fürchten eine **unbegrenzte Verpflichtung**. Wenn Freigabe und Call-Bereitschaft in einem Schritt landen, sagen viele **gar nichts zu**.

---

## 2. Diagnose: Wo es bricht

| Phase | Reibung | Warum das im MSP-Kontext weh tut |
|-------|---------|----------------------------------|
| **Vor Projektende** | Referenz-Thema kommt zu spät | Kunde ist im Delivery-Modus, nicht im Marketing-Modus |
| **Vertrag** | Klauseln existieren, aber nicht im Account-/Projekt-Flow | AM verhandelt mündlich, Sales fragt später nochmal digital |
| **Freigabe-Start** | Sales sieht Portfolio-Stufe, Workflow in separater Card | Unklar, was der Kunde später wirklich bestätigen muss |
| **Kundenfreigabe** | Referenzcalls als Checkbox *nach* großer Freigabe | Wirkt wie Zusatzrisiko, nicht wie Option |
| **Einwilligungen** | Zwei juristische Checkboxen | Kunde denkt: „Ich gebe mein Unternehmen frei“ |
| **Nach Freigabe** | Showcase + Sperrlink gut — aber Kunde hat oft nie gesehen, wie die Referenz im Pitch aussieht | Überraschung = Widerruf |

---

## 3. Optimierung in drei Dimensionen

### Dimension A — Vor dem Projektabschluss: „Reference Readiness“ einpflanzen

Ziel: Der Kunde soll **nicht zum ersten Mal** über Referenzen sprechen, wenn die Referenz in RefStack steht.

**A1. Vertrags- & Angebots-Templates (ihr habt den Inhalt schon)**  
Die drei Pakete aus dem Deal Desk (`Rundum-Sorglos`, `Mittel`, `Anonym`) sollten nicht nur im Bid sitzen, sondern:

- Beim **Account** als „vereinbartes Referenz-Paket“ hinterlegt werden (z. B. `reference_package: anonym | standard | premium`)
- Beim **Projektabschluss** automatisch vorschlagen: „Welches Paket wurde vereinbart?“
- Beim **Freigabe-Start** vorausfüllen: Kunde sieht in der Freigabeansicht genau das, was schon im Vertrag stand

→ Reduziert kognitive Dissonanz: *„Das steht schon in unserem Rahmenvertrag.“*

**A2. Mid-Project „Success Story Draft“ (4–6 Wochen vor Go-Live)**  
Unterstützende Unterlagen für eure User:

| Asset | Zweck |
|-------|--------|
| **1-Pager „Projekterfolg auf einen Blick“** (Template) | Mit Kunde gemeinsam ausfüllen — wird später die Referenz |
| **E-Mail-Vorlage an Executive Sponsor** | „Dürfen wir den Erfolg anonym/namentlich teilen?“ |
| **Referenz-Koordinator-Rolle** | Wer beim Kunden ist Ansprechpartner? (ihr habt `internal_reference_approval_contact` auf Account-Ebene — gut, aber noch nicht „Reference Champion“ beim Kunden) |
| **Mutual Success Review Agenda** | 30-Min-Call: keine Freigabe, nur Inhalt validieren |

**A3. Account-Feld „Referenz-Reife“**  
Einfache Skala für AM/Sales im Account:

- 🔴 nicht ansprechbar (NDA, schlechte Erfahrung, Procurement blockiert)
- 🟡 Case Study möglich, Calls unwahrscheinlich
- 🟢 call-bereit (Champion + Sponsor identifiziert)

Das steuert später, **ob** überhaupt „Reference Call“ in der Freigabe angeboten wird.

**A4. Procurement-/Legal-Frühwarnung**  
Checkliste vor Freigabe-Anfrage:

- Steht Referenznutzung im MSA/SOW?
- Gibt es Marketing-Opt-out der Muttergesellschaft?
- Ist der richtige Unterzeichner identifiziert (nicht nur Projektleiter)?

---

### Dimension B — Kunden „reference-call-ready“ machen (ohne sie zu überfordern)

Das Kernproblem: **RFP verlangt Calls → Kunde will keine unbegrenzte Pflicht.**

**B1. Zwei-Stufen-Modell (produktisch und vertraglich)**

| Stufe | Was der Kunde gibt | Was Sales in RFPs schreiben darf |
|-------|-------------------|----------------------------------|
| **Stufe 1: Written Reference** | Anonyme oder namentliche Case Study, Zitat, ggf. Logo | „Referenzprojekt verfügbar“, „Kundenerfolg dokumentiert“ |
| **Stufe 2: Call Pool** | Max. 1–2 Calls/Jahr, Named Contact, Ersatzperson | „Reference Call auf Anfrage, nach Terminabstimmung“ |

Heute: Stufe 1+2 in einem Formular (`referenceCallsEnabled` Checkbox).  
Besser: **Stufe 2 erst nach Stufe 1** oder als separater, optionaler Schritt.

**B2. „Call Pool“ statt „unbegrenzte Verfügbarkeit“**  
Im Datenmodell habt ihr `approval_reference_call_frequency` — in der Kunden-UI wird das **nicht** gezeigt. Empfehlung:

- Wenn Calls aktiviert: Frequenz wählen (1×/Jahr default)
- Klarer Text: *„Sie verpflichten sich nicht zu jedem Anruf — Sie können einzelne Anfragen ablehnen.“*
- Optional: „Schriftliche Referenz-Antwort statt Call“ als Alternative

Das entspricht der MSP-Realität: In Ausschreibungen steht „Reference available“, tatsächlich reicht oft eine **schriftliche Bestätigung**.

**B3. Champion früh benennen**  
Ihr sammelt `reference_giver_name` / `title` in der Freigabe — zu spät. Schon im Projekt:

- Externer Kontakt mit Rolle **„Reference Champion“** (neben Projektleiter)
- Wenn Champion ≠ Unterzeichner: Delegation in der Freigabe (habt ihr via `approval_delegated_to_*`)

**B4. Internes Playbook für AM/Sales**

1. **Nie** im ersten Kundenkontakt Calls + Presse + Logo gleichzeitig anfragen
2. Erst **anonyme Freigabe** sichern (für 80 % der Pitches ausreichend)
3. Calls nur anfragen, wenn Deal/RFP es **wirklich** braucht
4. Nach mündlichem Ja: digitale Freigabe senden (RefStack bestätigt nur)

**B5. Deal Desk ↔ Referenzen verknüpfen**  
Wenn RFP „3 Reference Calls“ verlangt:

- System zeigt: „2 Referenzen mit Call-Consent, 1 nur anonym — Lücke“
- Vorschlag: anonyme Referenz + schriftliche Referenz-Antwort für die dritte Anforderung

---

### Dimension C — Kundenfreigabeansicht: Hürde senken

Heute ist die Seite schon überdurchschnittlich — aber für MSP-Kunden noch zu „groß“.

**C1. Default-Pfad nach Risikoprofil**

| Kundentyp | Vorauswahl |
|-----------|------------|
| Enterprise / Procurement-stark | **Anonyme Freigabe** vorausgewählt |
| Vertrags-Paket „Mittel“ | Namentlich vorausgewählt, Calls **aus** |
| Vertrags-Paket „Rundum-Sorglos“ | Namentlich + Calls vorausgewählt (aber Frequenz sichtbar) |

Technisch: `initialScope` aus Account/Vertrags-Paket, nicht nur DB-Defaults.

**C2. Referenzcalls entkoppeln**

Aktuell (`approval-decision-form.tsx`):

> „Gerne stehe ich für Referenzanrufe … zur Verfügung“

Besser als **eigener Block nach Freigabe** oder Accordion:

- Hauptentscheidung: namentlich / anonym / nein (3 Klicks)
- Darunter eingeklappt: „Optional: Für Ausschreibungen bereitstehen“
- Mit Erklärung: *„In den meisten Fällen werden keine Anrufe angefragt. Sie behalten ein Veto pro Anfrage.“*

**C3. „So sieht es aus“-Preview**

Vor dem Button „Freigeben“:

- Mini-Vorschau: anonymisierte vs. namentliche Darstellung im Pitch-PDF
- Reduziert Angst vor unbekannter Nutzung

**C4. Einwilligungen in Klartext**

Statt zwei Checkboxen mit Juristendeutsch:

- Eine Zeile: **„Ich erlaube die Nutzung wie oben gewählt.“**
- Zweite Zeile (nur bei namentlich): **„Mein Name/Logo dürfen in Angeboten an andere Kunden von [Org] erscheinen.“**
- Link „Details & Widerruf“ → Sperrlink-Hinweis

**C5. Änderungen als Erfolg, nicht als Blockade**

„Änderungen nötig“ ist gut — AM sollte vorab Inhalte mit dem Kunden abstimmen, sodass der Kunde fast nur noch **bestätigt**.

**C6. Mobile & Zeitbudget**

Ziel: **< 3 Minuten**, ein Daumen, kein Scroll-Marathon.  
Quick-Choice-Karten sind richtig — Zitat und Name/Position nur bei namentlicher Freigabe zeigen (teilweise schon so).

**C7. Nach Freigabe**

Ihr habt den Sperrlink-Loop — stark. Ergänzen:

- In der Bestätigungs-Mail: *„So haben wir Ihre Freigabe verstanden“* (Scope in 3 Bulletpoints)
- Link zur Showcase-Vorschau, nicht nur Sperrlink

---

## 4. Priorisierte Roadmap (wenn ich Product Owner wäre)

### Quick Wins (hoher Impact, wenig Aufwand)

1. **Call-Frequenz in Kunden-UI** anzeigen, wenn Calls aktiviert
2. **Vertrags-Paket → Freigabe-Vorauswahl** (Deal-Desk-Klauseln mit Account verknüpfen)
3. **Copy-Optimierung** Referenzcalls: „selten, jederzeit ablehnbar, Veto pro Anfrage“
4. **Account „Referenz-Reife“** + Checkliste vor „Freigabe starten“

### Mittelfristig (strategischer Hebel)

5. **Zwei-Stufen-Freigabe** (Written → optional Call Pool)
6. **Mid-Project Success-Story-Templates** im Account/Projekt
7. **RFP-Gap-Analyse**: Referenzanforderung vs. tatsächlicher Call-Consent
8. **Pitch-Preview** in der Kundenfreigabe

### Langfristig (Differenzierung)

9. **Reference Champion** als eigene Kontaktrolle + Lifecycle-Reminder
10. **„Schriftliche Referenz-Antwort“** als Call-Ersatz für Ausschreibungen (standardisiertes PDF/Formular vom Champion)
11. **Benchmark**: „X % eurer Branche geben anonyme Cases frei, Y % auch Calls“ — sozialer Beweis für AM-Gespräche

---

## 5. Die eine strategische These

> **Referenzcalls gewinnt man nicht in der Freigabemaske — sondern im Projektverlauf.**  
> RefStack sollte weniger „Freigabe-Tool“ und mehr **„Reference Readiness System“** sein:  
> Vertrag → Champion → gemeinsamer Story-Entwurf → digitale Bestätigung → kontrollierte Nutzung.

Die Freigabeansicht ist dann der **letzte, leichte Schritt** — nicht der erste Konflikt.

---

*Erstellt: 2026-05-27 — RefStack Freigabeflow-Analyse*
