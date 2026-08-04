# RefStack — Deals-Detailseite, neu gedacht (Greenfield)

> **Stand:** 2. Juli 2026
> **Auftrag:** Die Deals-Detailseite schonungslos analysieren (produktseitig + technisch, je aus optimaler Fachexpertenrolle) und per Greenfield-Ansatz neu konzipieren. Ausgangslage: „zu viel vermischt, vieles überflüssig, Gesamtstruktur fragwürdig."
> **Grundlage:** Code (`app/dashboard/deals/*`, `app/dashboard/deal-desk/*`) + Screenshots der Live-App.

---

## 0. Meine zwei Expertenrollen

- **Produkt:** _Principal Product Manager für B2B-Sales-Execution-Software_ — Denkweise: Jobs-to-be-Done, klare Primärnutzer je Fläche, Informationsarchitektur, Feature-Fokus vor Feature-Fülle.
- **Technik:** _Principal Frontend-/Full-Stack-Architekt (Next.js App Router)_ — Denkweise: Separation of Concerns, Modul-/Route-Grenzen, Ladepfade & Caching, Wiederverwendung statt Duplikat.

---

## 1. Ist-Zustand (verifiziert am Code)

Die Detailseite `deals/[id]` rendert **zwei Tabs**:

**Tab „Übersicht"** (linke Spalte, gestapelt) lädt drei große Komponenten übereinander:

1. `DealRfpSection` — RFP-Dokument-Upload + Coverage-Matrix + „Als PDF exportieren" + „RFP-Response-Baustein generieren".
2. `DealMatchSection` — ein eigenes semantisches Suchfeld („Match-Ergebnisse").
3. `DealDetailContent` — Anforderungen (Freitext), Verknüpfte Referenzen (mit Feedback), Letzte Aktivitäten.
   Rechte Spalte: „Deal-Informationen" + `RfpSidebarPanel` (Aktionen: Bearbeiten, Referenz verknüpfen, Ausgang festhalten, Referenzbedarf melden).

**Tab „KI-Analyse"** = `DealDeskTabPanel` → der komplette **Deal Desk** (`deal-desk-client.tsx`, **1135 Zeilen**) mit vier Untertabs: Bid-Übersicht (Win-Probability-Gauge, „Empfehlung: NO-BID", ICP-Fit, Red Flags, Nächste Schritte, Deadlines), Antwort-Entwürfe (First Draft Engine), SME Routing, Referenz-Inkubator (Legal-Templates, PDF-Templates, AI-Case-Study-Preview, „Deal gewonnen — Harvesting starten").

**Die Seite lädt serverseitig upfront:** Deal + Referenzen, RFP-Section-Daten, **alle** Org-Referenzen, alle Companies, alle Profile, 25 Events — alles `force-dynamic`, ungecacht.

---

## 2. Produkt-Analyse (schonungslos)

**A. Der Deal ist 4 Produkte in einem.** Auf einer Route liegen übereinander: (1) Opportunity-Verwaltung, (2) eine RFP-Analyse-Suite, (3) eine semantische Referenz-Suche, (4) eine komplette Bid-Management-Suite (Deal Desk). Das hat **keinen klaren Primärnutzer und kein klares Primär-Job**. Ein Sales Rep, der schnell den Deal-Stand sehen und Beweis anhängen will, landet in einem Analyse-Cockpit.

**B. Doppelt gebaute Kernfunktionen.** `DealRfpSection` ≈ die neue **Smart-Match-RFP-Coverage**; `DealMatchSection` ≈ **Smart Search**. Beide existieren seit dieser Woche als dedizierte, bessere Smart-Match-Seite (inkl. Reranking, LLM-Relevanz-Verdikt, Filter). Im Deal liegen ältere Zweit-Implementierungen desselben Jobs — doppelte Wartung, doppelte Wahrheit, divergierende UX.

**C. „Übersicht" ist keine Übersicht.** Der Tab **führt mit einem großen RFP-Uploader**, nicht mit Deal-Status/Nächstem-Schritt. Das Wichtigste (Wo steht der Deal? Was ist zu tun? Welcher Beweis hängt dran?) steht unten oder gar nicht.

**D. Der Deal Desk ist ein eigenes Produkt — und Default für jeden Deal.** Bid/No-Bid-Empfehlung, Red Flags, SME-Routing, Antwort-Entwürfe, Referenz-Harvesting sind **formale Ausschreibungs-Workflows** für eine **Bid-Manager-Rolle** und nur für die Teilmenge „echte RFPs". Sie als zweiten Tab auf **jedem** Deal zu zeigen (auch einem simplen 1,2-Mio-Deal ohne Ausschreibung) ist Overkill und verwässert den Fokus. Das Screenshot-Beispiel zeigt „NO-BID" + „Red Flags (5)" für einen Test-Deal — Analyse-Theater ohne Handlungsbezug für den Normalfall.

**E. Referenzen erscheinen an drei Orten.** Coverage-Matrix („In Deal übernehmen"), Match-Ergebnisse, und „Verknüpfte Referenzen" — drei getrennte Flächen für dieselbe Sache (Beweis am Deal). Dazu Aktionen mehrfach: „Referenz verknüpfen" als Rechts-Aktion, als Matrix-Button, als Select unten.

**F. Proof-over-Promise-Risiko.** Win-Probability „39 %", „Benchmark-Risiko 0 %", „Starker ICP-Fit" — wirken präzise, sind aber (wie schon bei der hartkodierten Win-Rate) potenziell Schein-Metriken. Für einen Test-Deal wirkt das unglaubwürdig und untergräbt Vertrauen genau dort, wo Entscheidungen fallen.

**Kernbefund:** Der Deal hat seinen **eigentlichen Job verloren** — Opportunity vorantreiben und Beweis anhängen — unter einer Schicht aus Analyse-Werkzeugen, die (a) woanders besser existieren oder (b) einer anderen Rolle/Teilmenge gehören.

---

## 3. Technik-Analyse (schonungslos)

**A. Monolith.** `deal-desk-client.tsx` = **1135 Zeilen** Client-Komponente; die Deal-Detail-Seite komponiert zusätzlich fünf schwere Teilkomponenten. Schlecht testbar, schlecht ladbar, hohe Kognitionslast.

**B. Duplizierte Logik.** Match- und RFP-Coverage-Pfade existieren zweimal (Deal-Komponenten vs. `lib/rfp-coverage`/`matchReferences` in Smart Match). Zwei Stellen für dieselbe Regel = Divergenz-Garantie (z. B. wurde der Threshold-Bug in `rfp-coverage.ts` separat gefunden).

**C. Teurer, ungecachter Erstload.** `force-dynamic` + upfront: alle Org-Referenzen, alle Companies, alle Profile, RFP-Daten, Events — für **jeden** Deal-Aufruf, auch wenn der Nutzer nur den Status sehen will. Nichts davon ist lazy.

**D. Route-Grenzen verwischt.** Der Deal Desk hat eine **eigene Route** (`/dashboard/deal-desk`) **und** wird als Tab in `deals/[id]` eingebettet (`DealDeskTabPanel`). Zwei Einstiege, ein 1135-Zeilen-Client — unklare Ownership.

**E. Kopplung an Deal-Desk-Persistenz.** Der RFP-Pfad im Deal hängt an `deal_desk_projects` (Storage-Upload, Snapshots) — genau die Kopplung, die ich für die entkoppelte Smart-Match-RFP bewusst umgangen habe.

---

## 4. Reframe: drei getrennte Belange

| Belang                    | Was                                                                                         | Primärnutzer        | Wo es hingehört                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------- |
| **Deal**                  | Opportunity vorantreiben: Status, Fakten, **angehängter Beweis**, nächster Schritt, Outcome | Sales Rep           | schlanke `deals/[id]`                                                     |
| **Beweis finden/matchen** | Suche, RFP-Coverage                                                                         | Sales Rep / Bid Mgr | **Smart Match** (existiert) — aus dem Deal _aufgerufen_, nicht dupliziert |
| **Bid Desk**              | Formale Ausschreibung: Bid/No-Bid, Red Flags, SME-Routing, Antwort-Entwürfe, Harvesting     | Bid/Tender Manager  | **eigene, opt-in Fläche** — nur für Deals im RFP-Modus                    |

**Leitsatz:** _Der Deal ist ein Behälter für eine Opportunity — er zeigt Status, Beweis und nächste Aktion. Er ist nicht der Ort, an dem die Werkzeuge leben._

---

## 5. Greenfield: die neue Deal-Detailseite

**Kein Tab-Wust. Ein fokussiertes Cockpit** (Sales Rep First), das den Deal-Job in Sekunden beantwortet.

```
┌ Deals / Pipeline Data ────────────────────────────────────────────────┐
│ Pipeline Data           [Verhandlung ▾]        FinanzCorp · 1,2 Mio €  │
│ Software & Tech · Close 06.05.2026 · Owner: Sam                        │
│                                       [ Beweis finden ]  [ ⋯ Aktionen ]│
├───────────────────────────────────────────────────────────────────────┤
│ ① NÄCHSTER SCHRITT                                                     │
│   „Angebot bis 06.05. finalisieren"           [ erledigt ] [ ändern ] │
├───────────────────────────────────────────────────────────────────────┤
│ ② BEWEIS AM DEAL (3)                          [ + Beweis finden → ]    │
│   ● Managed XDR @ Fujitsu      81%  hat geholfen ✓   [öffnen][entfernen]│
│   ● Zero-Trust @ Apple         62%  Feedback?        [öffnen][entfernen]│
│   ⚠ Lücke: „ISO 27001"  → [ Referenz anfragen ]                        │
├──────────────────────────────────┬────────────────────────────────────┤
│ ③ DEAL-FAKTEN                     │ ④ AKTIVITÄT                         │
│   Account · Volumen · Branche ·   │   02.07. Referenz gematcht          │
│   AM · Sales Lead · Anforderungen │   07.04. Deal erstellt              │
├──────────────────────────────────┴────────────────────────────────────┤
│ ⑤ Formale Ausschreibung?   [ Als RFP/Bid bearbeiten → Bid Desk ]  (opt)│
└───────────────────────────────────────────────────────────────────────┘
```

**① Nächster Schritt** — das, was ein Rep zuerst sehen will. Ein Feld, editierbar, mit „erledigt". (Ersetzt das Analyse-Theater als Einstieg.)

**② Beweis am Deal** — die _eine_ Fläche für Referenzen am Deal (fusioniert die heutigen drei: Coverage / Match / Verknüpfte). Zeigt angehängte Referenzen mit Match-Score + „hat geholfen?"-Feedback (Data Compounds) + ehrliche Lücken. Der Button **„Beweis finden"** öffnet **Smart Match mit Deal-Kontext** (`?deal=`, existiert bereits!) — kein zweites Suchfeld im Deal. Treffer landen per „→ In Deal übernehmen" hier zurück.

**③ Deal-Fakten** — kompakt: Account, Volumen, Branche, AM, Sales Lead, Anforderungen. Inline-Edit statt Extra-Dialog wo möglich.

**④ Aktivität** — die Timeline (inkl. Outcome-Events). Hier sitzt auch der **Outcome-Capture** beim Abschluss (warum gewonnen/verloren, welcher Beweis war entscheidend) → speist Wissens-Erhalt [[arbeitspaket-wissens-erhalt-account-gedaechtnis]].

**⑤ Bid-Desk-Einstieg (opt-in)** — nur ein Verweis: „Diesen Deal als Ausschreibung bearbeiten". Erst dann öffnet sich der schwere Bid-Workflow — als **eigene Fläche**, nicht als Default-Tab. Für Nicht-RFP-Deals taucht der ganze Block gar nicht auf.

**Aktionen konsolidiert** in _ein_ Menü (⋯): Bearbeiten, Ausgang festhalten, Referenzbedarf melden, Löschen. Keine dreifach verstreuten „Verknüpfen"-Knöpfe.

---

## 6. De-Duplizierungs-Karte (was wandert wohin)

| Heute im Deal                             | Neu                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `DealRfpSection` (RFP-Coverage)           | → **Smart Match / RFP** (gebaut) bzw. **Bid Desk**; im Deal nur „Beweis finden"-Einstieg |
| `DealMatchSection` (Suche)                | → **Smart Match** (`?deal=` Kontext); im Deal entfällt                                   |
| Coverage / Match / Verknüpfte (3 Flächen) | → **eine** Fläche „Beweis am Deal"                                                       |
| „KI-Analyse"-Tab (Deal Desk, 1135 Z.)     | → **Bid Desk** als opt-in Fläche, nur RFP-Deals                                          |
| Win-Prob / Benchmark / ICP-Fit            | → in den Bid Desk; **nur mit echten Daten** zeigen (Proof over Promise), sonst weglassen |
| Rechts-Aktionen (4×)                      | → ein ⋯-Menü                                                                             |

---

## 7. Technische Empfehlungen

1. **Deal-Detail dünn machen:** nur Deal + angehängte Referenzen + Aktivität initial laden (cachefähig statt `force-dynamic`). Companies/Profile/Alle-Referenzen nur im Edit-/Such-Kontext (lazy, on demand).
2. **Duplikate abbauen:** `DealMatchSection`/`DealRfpSection` durch Verweis auf Smart Match ersetzen; die Referenz-Match-Logik hat _eine_ Quelle (`matchReferences`/`rfp-coverage`).
3. **Bid Desk entkoppeln:** klare eigene Route/Produktfläche; `deal-desk-client.tsx` (1135 Z.) in Feature-Module splitten (Bid-Übersicht, Antwort-Entwürfe, SME-Routing, Inkubator je eigenes Modul); erst bei „Als RFP bearbeiten" laden (`next/dynamic`).
4. **RFP im Deal-Kontext:** den entkoppelten `/api/rfp/coverage` wiederverwenden (Deal-Kontext optional als Parameter), statt der `deal_desk_projects`-Kopplung — eine RFP-Pipeline für App + Deal.
5. **Metriken ehrlich:** Win-Probability & Co. nur rendern, wenn belastbar berechenbar; sonst „Noch nicht aussagekräftig" (wie im Insights-Konzept).

---

## 8. Offene Entscheidungen

1. **Bid Desk: Umfang jetzt?** Behalten (nur entkoppeln/opt-in) oder auf das Nötige eindampfen (Red Flags + Antwort-Entwürfe sind stark; Win-Prob/ICP-Fit fraglich)?
2. **„Nächster Schritt" & Stages:** braucht der Deal ein echtes Stage-Modell (Pipeline) oder reicht Status + ein Freitext-Nextstep? (Nicht zum CRM werden — vgl. Account-Proof-Linse-Entscheidung.)
3. **Outcome-Capture-Ort:** im Deal-Aktivität-Block (empfohlen) — bestätigt?
4. **Bid-Manager-Rolle:** eigene Funktions-Rolle/Capability für den Bid Desk (vgl. Rollenmodell)?

---

## 9. Revision v2 — Juliens Edits eingearbeitet

Julien hat 10 konkrete Umbau-Ideen ergänzt. Bewertung aus den beiden Expertenrollen und Konsolidierung:

| #   | Juliens Idee                                                    | Verdikt                                   | Anmerkung                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | KI-Analyse-Reiter entfernen, Features in Übersicht integrieren  | **Übernommen, mit Leitplanke**            | Revidiert meinen „Bid Desk als eigene Route" → **eine Seite, kein Tab**. Aber: Bid-Features nur **konditional** (RFP-Deal) und sekundär rendern, sonst kehrt die Überladung zurück.                                                                                            |
| 2   | SME Routing mit Red Flags kombinieren                           | **Übernommen**                            | Ein Panel **„Risiken & offene Punkte"**: Red Flags (Vertrag/Compliance) + SME-Routing (fachliche Klärung), beide mit Routing an Legal/Experte.                                                                                                                                 |
| 3   | Referenz-Inkubator entfernen; Vertragsvorlagen als Trust Center | **Teilweise**                             | Inkubator raus: ja (Harvesting = [[arbeitspaket-wissens-erhalt-account-gedaechtnis]]). Trust Center: gute Idee, aber **org-Ebene, nicht Deal-Detail** — eigenes wiederverwendbares Ding (Zertifikate/NDAs/Legal-Templates); separat konzipieren, vom Deal höchstens verlinken. |
| 4   | Antwort-Entwürfe behalten, Anbindung/Layout überdenken          | **Übernommen + Präzisierung**             | An die **RFP-Coverage-Anforderungen** binden, keine separate Extraktion. Ist faktisch die **„KI-Antwort je Anforderung"**, die wir in Smart-Match-RFP schon gebaut haben → **eine** Engine, inline im Coverage-Kontext statt eigener breiter Tab.                              |
| 5   | Deal Deadlines nach oben                                        | **Übernommen**                            | Deadlines als action-kritischer Kopf-Block (Countdown zur nächsten Frist).                                                                                                                                                                                                     |
| 6   | „Nächster Schritt" ganz entfernen                               | **Übernommen — revidiert meinen Entwurf** | Deadlines + offene Punkte tragen das „was ist zu tun"; kein manuelles Task-Feld (kein CRM-Todo).                                                                                                                                                                               |
| 7   | Eignung & Rahmenbedingungen erweitern                           | **Übernommen, konditional**               | Teil des RFP-Blocks, aus dem Dokument angereichert; bei Nicht-RFP-Deals ausgeblendet.                                                                                                                                                                                          |
| 8   | Executive Briefing behalten, PPTX-Export raus                   | **Übernommen**                            | Briefing als generierte Zusammenfassung (Ansicht/optional PDF); PPTX streichen.                                                                                                                                                                                                |
| 9   | Smart Search + RFP-Analyse in die Sidebar                       | **Übernommen — als Drawer**               | Rechts-Panel/Slide-over, das die **bestehenden Smart-Match-Komponenten wiederverwendet** (eine Implementierung, zwei Einstiege: Vollseite + Deal-Drawer mit `?deal=`-Kontext). Bleibt im Deal-Kontext, kein zweites Suchfeld.                                                  |
| 10  | „Anforderungen"-Abschnitt entfernen                             | **Übernommen, mit Korrektur**             | Nicht hardcodiert, sondern `deal.requirements_text` (Freitext). Als eigener Block raus; Anforderungen kommen bei RFP-Deals aus der Coverage-Extraktion, sonst als Deal-Fakt.                                                                                                   |

### Konsolidiertes Zielbild (v2)

```
┌ Header: Titel · Status · Account · Volumen · Owner   [Beweis finden ▸] [⋯] ┐
│ ⏱ DEADLINES — nächste Frist prominent, Countdown (aus RFP/Deal)            │
├───────────────────────────────────────────────────────────────────────────┤
│ BEWEIS AM DEAL (eine Fläche) — angehängte Referenzen + Score + „geholfen?" │
│   + ehrliche Lücken · [ Beweis finden ] → Smart-Match-Drawer (Deal-Kontext)│
├──────────────────────────────────┬────────────────────────────────────────┤
│ DEAL-FAKTEN (Account/Vol./AM/…)   │ AKTIVITÄT + Outcome-Capture             │
├──────────────────────────────────┴────────────────────────────────────────┤
│ ▼ AUSSCHREIBUNG (nur wenn RFP-Deal) — konditional, sekundär:               │
│    · Eignung & Rahmenbedingungen (angereichert)                           │
│    · Risiken & offene Punkte  (Red Flags + SME-Routing kombiniert)        │
│    · Antwort-Entwürfe  (an Coverage-Anforderungen gebunden = 1 Engine)    │
│    · Executive Briefing  (ohne PPTX)                                      │
└───────────────────────────────────────────────────────────────────────────┘
  Rechts-Drawer (on demand): Smart Search + RFP-Analyse = Smart-Match-Komponenten
```

**Netto:** kein „KI-Analyse"-Tab, kein separater Bid-Desk-Route mehr — **ein** Deal-Cockpit; die Bid-Fläche ist ein **konditionaler, zusammengefasster Block** (5 → 3 Bausteine: Eignung, Risiken&offene Punkte, Antwort-Entwürfe + Briefing). Werkzeuge (Suche/RFP) leben im Drawer, wiederverwendet. Entfernt: Inkubator, „Nächster Schritt", Freitext-Anforderungen, PPTX-Export, doppelte Such-/RFP-Sektionen.

### Offene Punkte nach v2

- **Trust Center** als eigenes org-Level-Konzept (nicht Deal): separat andenken?
- **Antwort-Entwürfe-Engine:** die in Smart-Match-RFP gebaute „KI-Antwort je Anforderung" als _die_ First-Draft-Engine konsolidieren (die alte deal-desk-Engine ablösen)?
- **Win-Probability/ICP-Fit/Benchmark:** Julien will sie behalten. **Entscheidung: ehrlich implementieren statt streichen.** Code-Befund: `computeDeliveryWinProbability` ist **schon real** (Portfolio-Abdeckung + Match-Tiefe + Compliance-Docs − Red-Flag-Penalty, „keine KI-Schätzung"); Problem = nur der Name.
  - **„Win Probability" → „Angebots-Reife"**: Rechnung behalten, umbenennen, Breakdown zeigen (Formatter existiert), „noch nicht berechenbar" bei fehlender Coverage.
  - **„Benchmark-Risiko" → „Bietfähigkeit / Eignungs-Check" (K.O.-Kriterien)** — Präzisierung durch Kollegen: _keine_ Vergleichszahl, sondern harte Eignungshürden. Extrahiere Eignungskriterien aus dem RFP (Mindestumsatz, Mitarbeiterzahl, geforderte Referenzen, Pflicht-Zertifikate, geforderte Spezialisten/Rollen, Standort/Versicherung) → prüfe gegen **Org-Fähigkeitsprofil** (Zertifikate = Compliance-Library ✓, Referenz-Bestand = references ✓, + kleines Org-Profil in Settings für MA-Zahl/Umsatz/Spezialisten). Je Kriterium ✓/✗/unbekannt; Gesamt: **bietfähig / K.O. (≥1 Pflicht ✗) / nur mit Partner**; „erfordert Großanbieter-Klasse"-Signal bei Enterprise-Skala. Sitzt im (nun gefüllten) Block **„Eignung & Rahmenbedingungen"** (= Edit #7) und begründet die Bid/No-Bid-Empfehlung. Unterscheidet sich von Red Flags (Vertragsrisiko, verhandelbar) — hier: „können wir überhaupt bieten". Konservativ: „unbekannt" ist nie K.O.; peer-Benchmark (vs. ähnliche Deals) bleibt separates Später-Thema.
  - **„ICP-Fit" → Rubrik** gegen [[goals]]-ICP (Branche/Volumen/Region/Größe), erfüllte/offene Kriterien sichtbar, Config-getunt; fehlende Felder = „unbekannt".
  - **Prinzip:** Rubrik-Metriken (jetzt prüfbar) vs. Vorhersage-Metriken (Kalibrierung nötig). Jede Zahl mit Breakdown + „nicht aussagekräftig"-Degradation.
  - **Kalibrierung (Data Compounds):** via Outcome-Capture ([[arbeitspaket-wissens-erhalt-account-gedaechtnis]]) Reife→echte Win-Rate korrelieren; erst dann darf „Wahrscheinlichkeit" draufstehen.

---

## Verknüpfte Dokumente

- [[account-bereich-neugedacht]] · [[finden-page-neugedacht]] · [[insights-neugedacht]] — Schwester-Greenfield-Entwürfe, gleiche Haltung (Fokus, Ehrlichkeit, Wiederverwendung)
- [[arbeitspaket-wissens-erhalt-account-gedaechtnis]] — Outcome-Capture (gewonnener Deal → Referenzentwurf), gehört in ④
- [[rollen-rechte-dashboards-navigation]] — Bid-Manager-Rolle, Sichtbarkeit
- [[produktaudit-juni-2026]] — Deal/Deal-Desk-Fusion, Proof-over-Promise (hartkodierte Metriken)
