# Arbeitspaket: service-role-Sicherheitsaudit (Engineering E4)

**Quelle:** Engineering-Audit (Vault) E4. Vor der Pilotphase abzuschließen (Cross-Tenant-Leck-Risiko).
**Zweck:** Jede Nutzung des Service-Role-Clients (umgeht RLS) **rechtfertigen** und ihre **Sicherheitsgrenze verifizieren** — nicht pauschal entfernen.
**Charakter:** Review/Verifikation + gezielte Härtung. Überwiegend lesend; Änderungen nur wo eine Grenze fehlt.

---

## Vorab lesen

- `docs/ai-coding-agent-guide.md`. Sicherheitsmodell: RLS-first; `lib/supabase/service-role.ts` **umgeht RLS vollständig**.
- Grundregel: **Normaler (RLS-)Client ist Default.** Service-Role nur mit (a) dokumentiertem Grund **und** (b) expliziter Sicherheitsgrenze pro Query/Write.

---

## Ist-Stand (verifiziert): 18 Nutzungsstellen

Kategorisiert nach **Sicherheitsgrenze** (warum der RLS-Bypass legitim wäre) — pro Datei zu verifizieren:

### A — Token-gated (anonym/extern; Grenze = gültiges Token)

- `app/approval/[token]/actions.ts`
- `app/internal-approval/[token]/actions.ts`
- `app/p/actions.ts`
- `lib/public-portfolio/resolve-public-pdf-export-context.ts`
- `lib/references/resolve-approval-edit-url-for-manage.ts`
  **Check:** Token wird **vor** jedem Zugriff validiert; es werden **ausschließlich** die zum Token gehörenden Zeilen gelesen/geschrieben (kein org-weiter Zugriff über das Token hinaus); abgelaufene/zurückgezogene Token greifen nicht.

### B — System-Cron (org-übergreifend per Design; Grenze = Cron-Auth + per-Zeile-org)

- `app/api/cron/customer-approval-reminder/route.ts`
- `app/api/cron/company-news/route.ts`
- `app/api/cron/market-signals-digest/route.ts`
- `app/api/cron/brandfetch-accounts/route.ts`
  **Check:** Route ist gegen unbefugten Aufruf geschützt (Cron-Secret/Header, nicht öffentlich auslösbar); Verarbeitung scoped Writes je Datensatz korrekt auf dessen `organization_id`; keine Vermischung über Orgs.

### C — Auth-Admin (legitim, keine RLS-Daten; Grenze = nur Auth-Operationen)

- `lib/auth/resolve-user-emails.ts` (E-Mails via `auth.admin.getUserById`)
- `lib/auth/send-magic-link-email.ts`
- `app/register/actions.ts`
  **Check:** ausschließlich Auth-/User-Admin-Operationen; keine Querschnitts-Selects über fremde Org-Daten; E-Mail-Auflösung nur für berechtigte Empfänger.

### D — Interner App-Datenzugriff mit Bypass (höchste Aufmerksamkeit)

- `app/dashboard/market-signals/actions.ts` (18 org_id-Treffer)
- `lib/evidence/approvals.ts` (8)
- `lib/crm/connections.ts` (7)
- `lib/reference-manager-email.ts` (1)
- `lib/references/approval-workflow-notify-recipients.ts` (0)
  **Check (je Stelle):** (1) **Warum** wird RLS umgangen — ginge der normale Client? Wenn ja → umstellen. (2) Wenn Bypass nötig: ist **jede** Query/jeder Write explizit auf die richtige `organization_id` (bzw. den berechtigten Nutzer) gefiltert? Besonders die **0-org_id**-Datei (`approval-workflow-notify-recipients.ts`) genau prüfen.

---

## Aufgaben

1. **Pro Datei**: Kategorie bestätigen, Grenze verifizieren, Befund notieren (Tabelle unten). Wo eine Grenze fehlt → härten (explizites `.eq('organization_id', …)` / Token-Check / Empfänger-Filter).
2. **Wo Bypass unnötig** (Kat. D): auf den normalen RLS-Client zurückführen.
3. **Dokumentieren**: an jeder verbleibenden service-role-Stelle ein kurzer Kommentar „Service-Role weil … / Grenze: …".
4. **Konvention** in `docs/ai-coding-agent-guide.md` ergänzen: Service-Role nur mit Begründung + expliziter Grenze.

**Status 2026-08-06:** Audit durchgeführt; kritische Härtungen gelandet (Notify-Recipients erfordert `organizationId`; Revoke-Reset filtert `organization_id`; Cache asserted Org-ID). Guide-Konvention bereits vorhanden. Rest: Kommentare an verbleibenden Call-Sites Boy-Scout + optional Public-Portfolio-Session enger.

**Ergebnis-Tabelle (2026-08-06):**

| Datei | Kategorie | Grenze verifiziert? | Bypass nötig? | Aktion |
| ----- | --------- | ------------------- | ------------- | ------ |
| `app/approval/[token]/actions.ts` | A | ja | ja | keep+comment |
| `app/internal-approval/[token]/actions.ts` | A | ja | ja | keep+comment |
| `app/internal-approval/[token]/page.tsx` | A | ja | ja | keep+comment |
| `app/p/actions.ts` + `reset-after-customer-access-revoke` | A | ja (gehärtet) | ja | org-Filter auf Update |
| `lib/references/resolve-approval-edit-url-for-manage.ts` | A | ja | ja | keep+comment |
| `lib/public-portfolio/resolve-public-pdf-export-context.ts` | A | ja | ja | keep+comment |
| `app/api/public-portfolio/session/route.ts` | A | partial | ja | Boy-Scout Kommentar / Rate-Limit später |
| Cron `customer-approval-reminder` / `company-news` / `market-signals-digest` / `brandfetch-accounts` | B | ja (Bearer `CRON_SECRET`) | ja | keep+comment |
| `app/register/actions.ts` / `lib/auth/send-magic-link-email.ts` | C | n/a Auth | ja | keep+comment |
| `lib/auth/resolve-user-emails.ts` | C | Caller-Vertrauen | ja | Doku verschärft |
| `lib/references/approval-workflow-notify-recipients.ts` | C/D | ja (gehärtet) | ja | `organizationId` Pflicht |
| `lib/reference-manager-email.ts` | C | ja | ja | keep+comment |
| `app/dashboard/settings/actions.ts` | C | ja | ja | keep+comment |
| `app/dashboard/settings/settings-workspace-actions.ts` | D | ja | ja | keep+comment |
| `app/dashboard/market-signals/signal-ingest-impl.ts` | D | ja (Session-Org) | prüfen | investigate später |
| `lib/cache/cached-org-reads.ts` | D | ja (gehärtet) | ja | `assertOrgId` + Kommentar |

Nicht mehr im Scope (kein Service-Role mehr): `lib/evidence/approvals.ts`, `lib/crm/connections.ts`.

---

## Akzeptanz

- Alle 18 Stellen kategorisiert + Grenze bestätigt oder gehärtet.
- Keine service-role-Query ohne explizite org-/Token-/Empfänger-Grenze.
- Cron-Routen gegen unbefugten Aufruf geschützt.
- Kommentar-Begründung an jeder verbleibenden Stelle; Konvention dokumentiert.
- `npm run typecheck` / `test` / `build` grün.

## Verifikation

```bash
npm run typecheck && npm test && npm run build
grep -rlnE "createServiceRoleSupabaseClient" app lib --include=*.ts   # Soll: jede Datei mit Begründungs-Kommentar
```

- Stichprobe Kat. A: mit ungültigem/abgelaufenem Token → kein Datenzugriff.
- Stichprobe Kat. B: Cron-Route ohne Secret → abgewiesen.
