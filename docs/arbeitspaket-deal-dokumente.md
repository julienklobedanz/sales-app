# Arbeitspaket: Deal-Dokumente — allgemeine Dateiablage & Verwaltung am Deal

**Quelle:** Produktlücke (Julien): man kann Dokumente (nicht nur RFP, auch NDA/Vertrag/Angebot/Notizen) an einen Deal hängen und muss sie verwalten können.
**Zweck:** Eine **allgemeine Dokumenten-Sektion** im Deal-Cockpit. Kern-Einsicht: **Die RFP ist nur *ein* Dokumenttyp** — die Dokumentenliste wird die Heimat, „RFP analysieren" ist eine Aktion auf einem Dokument vom Typ *Ausschreibung* (räumt das letzte Upload-Duplikat auf).

---

## 0. Verifizierte Ist-Fakten (DB + Code)

| Fakt | Status |
|------|--------|
| `deal_desk_documents` (id, project_id, organization_id, file_name, storage_path, mime_type, size_bytes, extract_status, sort_order, created_at) | Existiert — **an RFP-Analyse gekoppelt** (`project_id`), kein `deal_id`, **kein Typ**, kein Uploader |
| Storage-Buckets: `rfp-documents, references, compliance-documents, nda-documents, avatars` | Existieren (privat) — Upload-/Signed-URL-Muster im Repo vorhanden |
| `deal_documents`-Tabelle | **Existiert nicht** |
| Cockpit-Dokument-Verwaltung | **Fehlt** (nur RFP-Upload via `/api/rfp/analyze` → `deal_desk_documents`) |
| Wiederverwendbare Muster | Compliance-Docs (`organization_compliance_documents`) + NDA (`nda-actions`, `nda-documents`-Bucket, `nda-pdf-dropzone`) — gleiche Upload-/List-/Delete-UX |

---

## 1. Design-Entscheidungen

1. **`deal_documents` = kanonischer Datei-Speicher des Deals.** `deal_desk_documents` bleibt nur für Bestands-Analysen; **nicht doppelt pflegen**.
2. **Deal-Ebene, nicht RFP-Block.** Die „Dokumente"-Sektion sitzt bei Fakten/Aktivität (relevant für Standard- *und* RFP-Deals), **nicht** im konditionalen RFP-Block.
3. **RFP-Unifizierung.** Der bisherige separate RFP-Uploader entfällt als Sonderweg: Ein Dokument vom `kind='ausschreibung'` bekommt die Aktion **„analysieren"** → startet die bestehende Analyse (`analyzeRfp`), setzt `is_rfp_mode` (Regel existiert bereits), füttert den RFP-Block.
4. **Privater Bucket + Signed-URL-Download** (wie compliance-/nda-documents), kein öffentlicher Zugriff.

---

## 2. Datenmodell (Migration)

```sql
create type public.deal_document_kind as enum
  ('ausschreibung','nda','vertrag','angebot','praesentation','spezifikation','notiz','sonstiges');

create table public.deal_documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  file_name text not null,
  kind public.deal_document_kind not null default 'sonstiges',
  storage_path text not null,          -- ${orgId}/deals/${dealId}/${docId}/${safeName}
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.deal_documents(deal_id);

-- RLS org-scoped (Repo-Guardrail): SELECT/INSERT/UPDATE/DELETE
--   USING/WITH CHECK organization_id = public.current_user_organization_id()
```

**Storage:** neuer **privater** Bucket `deal-documents` + Storage-RLS-Policies org-gescopt am Pfad-Prefix `${orgId}/…` (Muster wie nda-documents).
**`organization_id` beim Insert aus dem Deal ableiten** (nicht allein aus User-Kontext).

---

## 3. Server-Layer

Neu `app/dashboard/deals/document-actions.ts` (Server Actions):
- `listDealDocuments(dealId)` → Zeilen (org-gescopt via RLS).
- `uploadDealDocument(dealId, file, kind)` → Storage-Upload nach `${orgId}/deals/${dealId}/${docId}/${safeName}` + Row-Insert (`uploaded_by`, `size_bytes`, `mime_type`). Größen-/Typ-Validierung (s. §5).
- `renameDealDocument(id, fileName)`, `setDealDocumentKind(id, kind)`.
- `deleteDealDocument(id)` → **erst Storage-Objekt entfernen** (`storage.from('deal-documents').remove([storage_path])`), dann Row löschen (Orphan-Vermeidung).
- `getDealDocumentSignedUrl(id)` → `createSignedUrl` (kurzlebig) für Download.

Wiederverwenden: Upload-/Sanitize-Muster aus `app/api/rfp/analyze/route.ts` (Storage-Pfad, `sanitizeFileName`), Limits aus `lib/extract-document-plain-text.ts`.

---

## 4. UI — Cockpit-Sektion

Neu `app/dashboard/deals/cockpit/deal-documents-section.tsx` — in `deal-cockpit-client.tsx` auf **Deal-Ebene** (bei Fakten/Aktivität) einhängen.
- Kopf: „Dokumente · N" + Upload (Drag-Drop / Datei wählen) mit **Typ-Auswahl**.
- Liste je Dokument: `file_name` · Typ-Badge · Größe · Uploader · Datum · **[Download]** · ⋯ (Typ ändern, umbenennen, löschen).
- **Typ „ausschreibung":** zusätzliche Aktion **„analysieren →"** (bzw. „neu analysieren"). Löst `analyzeRfp` mit diesem Dokument aus → RFP-Block + `is_rfp_mode`.
- Leerzustand: „Noch keine Dokumente — RFP, NDA, Vertrag, Angebot … hochladen."
- Tokens/Primitives des Design-Systems; keine hardcodierten Farben.

---

## 5. RFP-Unifizierung (Refactor)

- `analyzeRfp` / `/api/rfp/analyze` so anpassen, dass die Quelle ein **`deal_documents`-Eintrag (`kind='ausschreibung'`)** ist (Analyse liest dessen `storage_path`), statt eine Extra-Kopie in `deal_desk_documents` anzulegen.
- Bestehender RFP-Block-Uploader → auf „Ausschreibung analysieren" reduzieren: entweder ein vorhandenes Ausschreibungs-Dokument wählen **oder** direkt hochladen (legt `deal_documents`-Row mit `kind='ausschreibung'` an, dann analysieren).
- `deal_desk_documents` bleibt lesend für Alt-Analysen; keine Neuschreibung.

---

## 6. Randfälle & Risiken

| Randfall | Regel |
|----------|-------|
| **Storage-Orphans** | Löschen (Doc *und* Deal) muss Storage-Objekte entfernen. Deal-Delete-Action: erst `deal_documents.storage_path`-Liste `remove()`, dann Deal löschen. (FK-Cascade räumt nur DB-Zeilen.) |
| **Analysiertes RFP-Doc gelöscht** | Snapshot (`deal_desk_projects`) **behalten** (Audit); Doc-Referenz verweist auf „Dokument entfernt". `is_rfp_mode` bleibt. |
| **Typ eines analysierten RFP geändert** | Erlaubt, aber Hinweis „Analyse basiert auf diesem Dokument". Analyse nicht automatisch invalidieren. |
| **Größen-/Typ-Limits** | Analysierbare Docs ≤ Extraktions-Limit (~4,5 MB, PDF/DOCX/PPTX); reine Ablage-Docs größeres Limit (z. B. 25 MB) + erlaubte MIME-Whitelist. |
| **Rechte** | Upload/Löschen für Deal-Bearbeiter (System-/Funktions-Rolle); Read für Deal-Viewer. RLS org-gescopt; UI-Gating an vorhandener `useRole`-Logik. |
| **Download** | Nur Signed-URL (privater Bucket), kurzlebig; keine öffentlichen Links. |

---

## 7. Phasen (klein, mergebar)

1. **DB + Server:** Migration (`deal_documents` + enum + RLS + Index), Bucket `deal-documents` + Storage-RLS, `document-actions.ts` (list/upload/delete mit Storage-Cleanup/signed URL). Test: Fremd-Org sieht nichts; delete entfernt Storage-Objekt.
2. **UI:** `deal-documents-section.tsx` (Upload + Liste + Typ + Download + ⋯), in Cockpit einhängen, Leerzustand.
3. **RFP-Unifizierung:** Analyse liest aus `deal_documents`; RFP-Block-Uploader → „Ausschreibung analysieren". `deal_desk_documents` nur noch lesend.
4. **Cleanup + Tests:** Deal-Delete räumt Storage; Unit/Integration (RLS, Orphan-Freiheit, kind-Wechsel), typecheck.

Nach jeder Phase: `npm run typecheck` + `npm test`; keine hardcodierten Farben/Legacy-Pfade.

---

## Cursor-Prompt
> Setze `docs/arbeitspaket-deal-dokumente.md` um, Phase für Phase als getrennte Commits. **Phase 1:** Migration `deal_documents` (enum `deal_document_kind`, org-scoped RLS, Index) + privater Storage-Bucket `deal-documents` mit org-gescopten Policies + Server-Actions `document-actions.ts` (list/upload/rename/setKind/delete mit **Storage-Objekt-Cleanup vor Row-Delete** + `getDealDocumentSignedUrl`). `organization_id` aus dem Deal ableiten. **Phase 2:** `deal-documents-section.tsx` (Upload mit Typ, Liste mit Download/⋯, Leerzustand) im Deal-Cockpit auf Deal-Ebene einhängen. **Phase 3:** RFP-Analyse auf `deal_documents(kind='ausschreibung')` als Quelle umstellen; RFP-Block-Uploader zu „Ausschreibung analysieren" (Doc wählen/hochladen → analysieren) reduzieren; `deal_desk_documents` nur noch lesend. **Phase 4:** Deal-Delete räumt Storage-Objekte; Tests (RLS Fremd-Org, keine Storage-Orphans, kind-Wechsel invalidiert Analyse nicht). Wiederverwenden: Upload-/Sanitize-Muster aus `app/api/rfp/analyze/route.ts`, Limits aus `lib/extract-document-plain-text.ts`, UX-Muster von Compliance-/NDA-Dokumenten. Design-System-Tokens, keine hardcodierten Farben. Nach jeder Phase `npm run typecheck` + `npm test`.
