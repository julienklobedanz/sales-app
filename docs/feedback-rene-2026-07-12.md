# Feedback-Backlog: Rene (Demo 12.07.)

**Quelle:** Feedback / Demo Rene, 12.07.  
**Erfasst:** 26.07.2026 (nach Smart-Match-/Bell-/Share-Fixes)  
**Zweck:** Wichtige Punkte für spätere Umsetzung festhalten — kein Hotfix-Sprint, sondern Roadmap-/Pilot-Backlog.

---

## Ops / Sales (kein Code, aber priorisieren)

| Punkt                                          | Status    | Nächster Schritt                                                                                   |
| ---------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| Rene Account / Zugang auf aktuelles Deployment | offen     | Zugang auf `sales-app-fawn.vercel.app` geben, kurz Walkthrough                                     |
| Pitchen bei Kunden des Vertrauens              | offen     | Feedback-Schleife; ggf. kostenloser Prototyp bei **OEDIV**                                         |
| Warum SaaS statt Download-App?                 | Strategie | Pitch-Antwort vorbereiten: SaaS jetzt, optional VPC / containerisiert on-prem später (Daten in DE) |

---

## P0 — Produktqualität (als Nächstes sinnvoll)

### 1. Evaluation Sets für Semantic Search / Smart Match

**Warum:** Einziges Feedback-Item, das explizit „damit das richtig funktioniert“ adressiert. Ohne Gold-Set bleibt Match-Qualität subjektiv.

**Zielbild (v0):**

- 20–50 reale Queries (DE) mit erwarteten Top-Referenzen / Hard-Negatives
- Automatisierbarer Check (Score/Recall@k) gegen `matchReferences`
- Regression bei Parser-/Embedding-/Filter-Änderungen

**Anknüpfung:** `lib/references/library/match.ts`, `lib/match/*`, Smart-Match-Shell

---

## P1 — Pilot-Readiness / Trust

### 2. NDA-Cases: Zugriff einschränken + optional Passwort pro Opportunity

**Ist:** NDA-Deal → Status Intern, Visibility/RLS, NDA-UI/Bell-Teile vorhanden.  
**Fehlt:** Möglichkeit, sensible Opps zusätzlich mit Passwort / Extra-Gate abzusichern, sodass andere MA keinen Zugriff haben.

**Richtung:** Auf bestehendem NDA-/Visibility-Modell aufbauen (kein paralleles Rechtesystem).

### 3. Indexing-Latenz / Datenintegration

**Pain:** Kunden wollen, dass Daten schneller indexiert/eingebettet werden.  
**Richtung:** Pipeline sichtbar machen (Status „wird eingebettet…“), Incremental Embed, Queue — eher Architektur als Einzel-Feature.  
**Bezug:** `docs/arbeitspaket-perf-4-match.md`, `docs/arbeitspaket-perf-7-infra-latenz.md` (wo relevant)

---

## P2 — Enterprise-Integrationen (nach klarem Pilot-Scope)

### 4. Bulk-Uploads mit Frontier-Modell

**Pain:** Qualität/Scale beim Massen-Ingest von Referenzdokumenten.  
**Richtung:** Stärkeres Modell nur für Bulk-/schweren Extract; Kosten vs. Qualität messen.  
**Anknüpfung:** bestehende Bulk-/Compliance-Upload-Flows (`ComplianceBulkUploadDialog` u. a.)

### 5. SharePoint direkt integrieren + automatisch reinladen

**High value, hoher Aufwand** (Auth, Sync, Permissions, Delta-Import).  
**Voraussetzung:** konkreter Pilot-Dokumentenfluss (z. B. OEDIV) — nicht spekulativ bauen.

---

## Strategie (nicht als Feature-Ticket führen)

- **SaaS vs. containerisierte Application (Daten in DE):** GTM-/Compliance-Story. Produktentscheidung / Deployment-Option später; kein Must-implement für aktuellen SaaS-Pfad.
- **Stress Datenintegration:** mit P1 Indexing und P2 SharePoint/Bulk zusammen denken.

---

## Bewusst nicht als Blocker für aktuelle Pushes

- SharePoint-Integration
- Frontier-Bulk-Umschaltung
- Eval-Set-Infrastruktur (kann parallel geplant werden)
- Passwort-Opps
- Container-Distribution

Demo-/Bugfixes (Smart Match Filter, Deal-Toggle, Share-Toast, Notification Moves) sind davon unabhängig.

---

## Vorgeschlagene Reihenfolge nach nächstem Push

1. Rene Zugang + Walkthrough (Feedback > Features)
2. Eval-Set v0 für Smart Match
3. Indexing-Status / Latenz-Feedback in der UI
4. NDA + Passwort nur wenn Visibility explizit bemängelt wird
5. SharePoint / Frontier-Bulk erst mit konkretem OEDIV-/Pilot-Dokumentenfluss

---

## Verwandte Docs

- `docs/pilot-checklist.md`
- `docs/arbeitspaket-rechte-sichtbarkeit-welle-2.md`
- `docs/arbeitspaket-perf-4-match.md`
- `docs/arbeitspaket-deal-dokumente.md`
