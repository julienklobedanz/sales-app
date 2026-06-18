# Welle 2 — RLS-Baseline (Step 0)

Stand: vor Migration `20260629120000_references_visibility_rls.sql`

## Ausgangslage (code-verifiziert)

### SELECT-Policy auf `public.references`

Aktive Policy: **`Users see references of own org`** ([`20260628120000_references_rls_organization_id.sql`](../supabase/migrations/20260628120000_references_rls_organization_id.sql))

```sql
USING (
  organization_id = current_user_organization_id()
  AND (company_id IS NULL OR companies.organization_id = current_user_organization_id())
)
```

**Kein Filter** auf `status`, `is_nda_deal`, `approval_scope_confidential_sales` oder `created_by`.

### App-Gates (nur Defense-in-Depth, umgehbar per direktem SELECT)

| Datei | Muster |
|-------|--------|
| `app/dashboard/command-center/actions.ts` | `role === 'sales'` → `salesVisibleOnly` |
| `app/dashboard/references/match.ts` | idem |
| `app/api/deal-desk/analyze/route.ts` | idem |
| `app/api/rfp/analyze/route.ts` | idem |

`match_references(p_sales_visible_only)` filtert bei `true` auf `approved`, `internal_only`, `anonymized`, `external` — nur wenn der Parameter gesetzt wird.

### Erwarteter Sales-JWT-Lesetest (vor Fix)

Mit authentifiziertem User (`function_role = sales_rep`, Legacy `role = sales`):

```sql
SELECT id, status, is_nda_deal, approval_scope_confidential_sales
FROM public.references
WHERE organization_id = '<org-id>'
LIMIT 50;
```

**Erwartung vor Fix:** Zeilen mit `status = 'draft'`, `is_nda_deal = true` oder `approval_scope_confidential_sales = true` sind sichtbar (RLS-Loch).

**Erwartung nach Fix:** Nur freigegebene/interne nicht-vertrauliche Zeilen + eigene Entwürfe/vertrauliche (per `created_by`) + ggf. org-Konfiguration (B4).

### Anon-Freigabe (unverändert lassen)

Policy **`Anon can read references with approval token`**: `USING (approval_token IS NOT NULL)`.

Kunden-Freigabe läuft über Token + SECURITY-DEFINER-RPCs (kein Anon-UPDATE mehr seit Epic 10).

### Bekannte Lücke: `references.created_by`

App-Code erwartet die Spalte (`dashboard-home-data.ts`, `evidence/[id]/edit/page.tsx`), Migration fehlte — wird in `20260629120000` ergänzt.

## Supabase Advisors

Manuell im Supabase-Dashboard unter **Database → Security Advisor** und **Performance Advisor** prüfen nach Deployment der neuen Policy.

Typische Prüfpunkte:

- RLS enabled auf `references` (ja)
- Keine SECURITY DEFINER-Funktionen ohne `search_path = public` (neue Helfer setzen `search_path`)
- Policy-Performance: Helfer als `STABLE` markiert

## Nach Fix (Re-Test)

**Automatisiert (lokal):** `npm test` (261 Tests) und `npm run build` grün nach Welle-2-Code.

**Manuell nach Migration `20260629120000` deployen:**

- [ ] Sales-JWT: keine fremden `draft`/NDA/confidential-Zeilen
- [ ] Account Manager / Admin: alle Org-Referenzen lesbar
- [ ] Anon + gültiger `approval_token`: Referenz lesbar
- [ ] Security Advisor: keine neue Warnung auf `references`

### JWT-Rollen-Matrix (Checkliste)

| User | Erwartung |
|------|-----------|
| `sales_rep` | keine fremden `draft`/NDA/confidential; eigene Drafts mit `created_by` |
| `sales_rep` + B4 (`sales_sees_drafts`) | Entwürfe sichtbar (RLS + App-Gate) |
| `account_manager` | alle Org-Referenzen lesbar |
| `owner` / `admin` | alle Org-Referenzen lesbar |
| Anon + Token | unverändert über Approval-Flow |

### Umgesetzte App-Gates (Welle 2)

Die vier Pflicht-Stellen nutzen `loadReferenceVisibilityForUser()` → `getReferenceVisibilityScope()` (kein `role === 'sales'` mehr):

- `app/dashboard/command-center/actions.ts`
- `app/dashboard/references/match.ts`
- `app/api/deal-desk/analyze/route.ts`
- `app/api/rfp/analyze/route.ts`

Zusätzlich: `app/dashboard/evidence/page.tsx` filtert per Capability-Scope.
