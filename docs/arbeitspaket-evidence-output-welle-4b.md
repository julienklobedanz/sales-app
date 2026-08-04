# Arbeitspaket: Evidence & Output-Qualität (Welle 4b)

**Quelle:** Produkt-Audit, Feature-Umsetzungs-Prüfung & Entscheidungsregister (C6, E2, H8, H4, H7).
**Voraussetzung:** Welle 0–4a umgesetzt. Tests grün.
**Zweck:** Output- und Vertrauens-Qualität (Guardrail 2 „Output = Perceived Value", Guardrail 3 „Proof over Promise"): Compliance sauber einordnen, Originale persistieren, E-Mails einheitlich branden, KI vs. Heuristik ehrlich benennen, Zitat-Status festschreiben.

---

## Vorab lesen (für die Coding-Session)

- **Konventionen:** `docs/ai-coding-agent-guide.md` + `docs/design-system.md` (viel UI).
- **E-Mail-Baustein:** `lib/email/refstack-email-layout.ts` ist der Soll-Wrapper für **alle** ausgehenden Mails.
- **Code vor Edit lesen**; **Vault nicht** heranziehen. Verhaltenserhaltend wo möglich; Tests grün halten.

---

## T1 (C6) — Compliance als eigenes, benanntes Evidence-Segment

**Problem:** `[verifiziert]` Compliance-Dokumente (`organization_compliance_documents`) werden in `evidence/page.tsx` geladen und an den Evidence-Client gereicht — heute als versteckter „Modus/Tab-2" in Lisas Hauptfläche. Das vermischt zwei Beweis-Arten und verletzt „Sales Rep First".
**Soll:** Zwei **klar benannte, gleichrangige Proof-Segmente** im Evidence-Bereich: **„Kundenreferenz"** und **„Unternehmensnachweis" (Compliance/Zertifikate)** — als sichtbarer Umschalter/Filter, nicht als verstecktes zweites Register. Sichtbarkeit/Rechte je Segment beachten (Compliance eher AM/Bid/Legal/Admin; vgl. Capabilities aus Welle 1/2).
**Dateien:** `app/dashboard/evidence/page.tsx`, `app/dashboard/evidence/evidence-client.tsx` (+ Compliance-Unterkomponenten, `compliance-actions.ts`).
**Zuerst verifizieren:** wie Compliance aktuell gerendert wird (Modus/Tab/Sektion), dann auf das Segment-Muster umstellen.
**Akzeptanz:** Beide Proof-Typen klar benannt und gleichwertig erreichbar; kein verstecktes Tab-2; Verhalten/Rechte je Segment korrekt; Tests grün.

---

## T2 (E2) — Original-Dokumente persistieren

**Problem:** `[verifiziert]` Referenz-Originale landen **nicht** im Storage (references-Bucket leer; `reference_assets` nur Lese-/Update-Pfade in `app/dashboard/references/assets.ts`). Folge: kein Re-Embed, schwächere Compliance-Story, „Dokumente"-Suche bleibt leer.
**Soll:** Beim **Erstellen** und **Bulk-Import** das Originaldokument in den `references`-Bucket hochladen und als `reference_assets`-Zeile verknüpfen (org-Pfad-Präfix wie bei anderen Buckets; RLS beachten).
**Dateien:** `app/dashboard/evidence/new/actions.ts`, Bulk-Import (`app/api/bulk-import/*`, `app/dashboard/references/bulk-import*.ts`), `app/dashboard/references/assets.ts`.
**Akzeptanz:** Nach Referenz-Erstellung/Import liegt das Original im Bucket + `reference_assets`-Eintrag; Detailansicht/Download nutzt es; bestehende Referenzen ohne Original brechen nicht (graceful).

---

## T3 (H8) — Output-Qualität: E-Mail-Branding & halb-migrierte Reste

**Problem:** `[verifiziert]` Nicht alle Mails nutzen `refstack-email-layout`: u. a. **Registrierungs-Mail** (`app/register/actions.ts` rohes `html:`, Absender `onboarding@resend.dev`). Volumen-**Filter** fehlt weiter (Spalte/Sortierung vorhanden, aber kein Filter; auf `/dashboard/evidence` ganz ohne).
**Soll:**

1. **Alle** `resend.emails.send`-Aufrufe auditieren und auf `refstack-email-layout` umstellen (Registrierung sicher; weitere Kandidaten: `deals/actions.ts`, `market-signals/actions.ts`-Digest, `evidence/[id]/actions.ts` prüfen). Branded Absender-Domain statt `resend.dev`, wo möglich.
2. **Volumen-Filter** ergänzen: als Filter-Popover analog Branche/Status auf der Startseiten-Tabelle **und** unter `/dashboard/evidence` (Spalten-/Filter-Parität beider Referenz-Oberflächen).
   **Dateien:** `app/register/actions.ts`, `lib/email/*`, jeweilige Action-Dateien mit Mailversand; `app/dashboard/overview/*` (Tabelle/Filter), `app/dashboard/evidence/*`.
   **Akzeptanz:** Kein ungebrandeter Produktiv-Mailversand mehr; Volumen-Filter auf beiden Referenz-Oberflächen verfügbar; Tests grün.

---

## T4 (H4) — KI vs. Heuristik transparent benennen

**Problem:** `[verifiziert]` `benchmark-risk-metric.tsx` zeigt „Risiko-Analyse (KI-Indikatoren)", obwohl `lib/deal-desk/benchmark-risk.ts` eine **deterministische, gewichtete Kriterien-Formel** ist (kein LLM). Intro-Strategie hat einen Heuristik-Fallback ohne OpenAI-Key.
**Soll:** Labels ehrlich machen — Regelwerk nicht als „KI" ausgeben (z. B. „Benchmark-Risiko (Kriterien-basiert)" statt „KI-Indikatoren"); bei Heuristik-Fallback (kein Key) sichtbar kennzeichnen. Keine Funktionsänderung, nur Wording/Transparenz.
**Dateien:** `app/dashboard/deal-desk/components/benchmark-risk-metric.tsx`, ggf. Intro-Strategie-Komponenten/`market-signals/intro-strategy`.
**Akzeptanz:** Kein heuristisches Feature wird als „KI" beworben; Fallback-Modus erkennbar.

---

## T5 (H7) — Kundenzitat: Status festschreiben

**Problem:** `[verifiziert/Entscheidung]` Zitat ist aus dem Anlegeformular entfernt, lebt aber im Freigabe-Flow (`approval-decision-form.tsx`), in der Detailanzeige nach Freigabe und als KI-Vorschlag (`generate-approval-quote.ts`). Entscheidung H7: **im Freigabe-Flow behalten, nicht ins Anlegeformular zurück.**
**Soll:** Den Ist-Zustand bestätigen/sichern — sicherstellen, dass kein Zitat-Feld im Create-/Edit-Formular auftaucht; kurzer Guardrail-Kommentar. Reines Aufräumen, falls Reste existieren.
**Akzeptanz:** Zitat nur im Freigabe-Flow + Anzeige; Anlegeformular ohne Zitat-Feld.

---

## Cleanup (Boy-Scout dieser Welle)

- Beim Anfassen von `evidence-client.tsx`/`overview/*` (C6/H8) opportunistisch entwirren; Volumen-Filter als wiederverwendbare Filter-Komponente (keine Dublette zu Branche/Status-Filter).
- Keine neuen Ad-hoc-Badges/Chips — bestehende `components/*-status-badge.tsx` nutzen (Design-Guide).

---

## Out of Scope (→ andere Pakete)

- Welle 4c (Legacy-Routen-Aufräumen, `market-signals/manage`-Frage), Welle 5 (references/evidence-Umbenennung, Legacy-`role`-Spalte).
- Supabase-Standardmails (Passwort-Reset) — nur soweit über Resend brandbar; native Supabase-Templates separat.

---

## Verifikation

```bash
npm run test
npm run build
```

- T1 manuell: beide Proof-Segmente sichtbar/benannt; je Rolle korrekte Sichtbarkeit.
- T2 manuell: neue Referenz → Original im Bucket + `reference_assets`.
- T3: `grep -rnE "resend.emails.send" app lib` → jeder Treffer nutzt das Layout; Volumen-Filter auf beiden Oberflächen.
- T4: keine „KI"-Beschriftung über Heuristik-Features.

---

## Reihenfolge

T4 + T5 (klein, schnell) → T1 (Compliance-Segment) → T3 (E-Mail + Volumen-Filter) → T2 (Storage; eigener PR wegen Upload/RLS). Größtes: T1 und T2.
