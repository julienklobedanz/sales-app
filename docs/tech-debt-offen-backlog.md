# Tech-Debt — Offene Punkte & empfohlene Reihenfolge

**Stand:** 2026-08-06  
**Zweck:** Aktionsfähige Übersicht der **noch offenen** Tech-Debt-Abbauarbeit — plus Reihenfolge.  
**Detail/Historie:** [`tech-debt-inventar.md`](./tech-debt-inventar.md) und verlinkte Arbeitspakete.

---

## Status auf einen Blick (2026-08-06)

| Status | Themen |
|--------|--------|
| **Erledigt** | Inventar-Hygiene (#0); E4 (#1); E7 (#2); **P1-6** (#4); Welle-5 Rollen; Typed-Supabase **T1–T4** (#3); **#8** `references`-Pfade; **#9** Invite-SQL skip; **#7** DE/EN-Dateinamen; **#6** Lib-Results (Cron/Push-JSON geparkt) |
| **In Arbeit** | — |
| **Offen (Queue)** | #5 God-Files (Boy-Scout) · #6 Cron/Push-JSON (bewusst geparkt) |
| **Geparkt** | Pilot (H3/E1/G2); Massen-Renames |

**Hebel jetzt:** Boy-Scout #5 bei Feature-Touch; #6 Cron/Push nur mit bewusstem API-Change.

---

## Empfohlene Queue (Rest)

| # | Thema | Status | Was noch | Aufwand | Nächster Schnitt |
|---|-------|--------|----------|---------|------------------|
| **0** | Inventar-Hygiene | ✅ | — | — | — |
| **1** | E4 Service-Role | ✅ Audit + Hotspots | Boy-Scout: Kommentar an neuen Service-Role-Callern | XS ongoing | bei Touch |
| **2** | E7 Schema-Sync | ✅ T1–T4 | Types bei Migrationen regenerieren (`db:types`) | XS ongoing | bei Schema-Change |
| **3** | Typed-Supabase Cast-Abbau | ✅ T1–T4 | Rest-Casts nur Boundaries (HTTP/RPC/Json); Boy-Scout bei Touch | — | CI: `typecheck` vor Build |
| **4** | P1-6 Accounts Naming | ✅ App/Lib | DB-Tabelle `companies` / `company_id` / Firmennamen-Helfer **bewusst offen** | — | nicht anfassen ohne Produktentscheid |
| **5** | God-File-Nacharbeit | offen (Boy-Scout) | Overview / Share-Link / MS-Feed weiter slicen **nur bei Feature-Touch** | M ongoing | kein eigener Big-Bang-PR |
| **6** | `{ ok }` → `{ success }` | Lib ✅ | Slices 1–4; Rest nur Cron/Push-HTTP-Body | XS | Cron/Push separat wenn Monitoring-Clients ok |
| **7** | P3-3 DE/EN-Dateinamen | ✅ Slice | `ai-draft-*`, `customer-control-link-email`; API `/api/ai-draft` + Redirect; UI-Copy „Sperrlink“/Event `ki_entwurf_generated` bleiben | — | Rest nur bei Touch |
| **8** | `references`/`evidence` Pfade | ✅ | App = `references` (Routen/Ordner/`ROUTES`); Redirects `/dashboard/evidence` bleiben; `evidence_events` bleibt | — | Rest-`evidence` nur Domänenbegriff (RFP-Belege) |
| **9** | DB-Legacy Invite-Helfer | ✅ skip | App-`.rpc`-Caller = 0, aber **SQL-intern** weiter von Invite-RPCs genutzt → nicht droppen | — | behalten |
| **10** | Rest-`console.*` | erledigt (App/Lib) | Logger-Sink + Scripts behalten; später Sentry/Logflare | — | kein Ticket |

---

## Queue #3 — Typed-Supabase (abgeschlossen)

**Ziel erreicht:** Domänen-Casts weitgehend abgebaut; Row-Casts nur noch an echten Boundaries.  
**Arbeitspaket:** [`arbeitspaket-typed-supabase.md`](./arbeitspaket-typed-supabase.md)

| Domäne | Stand |
|--------|-------|
| Accounts / Deals / References / Settings | ✅ |
| Shared Portfolio / Deal-Desk / Notifications | ✅ |
| Market Signals | ✅ Slices 1–2 |
| Command Center / Register / Onboarding Invite-RPC | ✅ Quick (mit T4) |
| **T4 CI** | ✅ `npm run typecheck` in CI **vor** Test/Build (scharf, kein `continue-on-error`) |

**Rest (Boy-Scout, kein eigener Sprint):** vereinzelte HTTP-JSON / LLM-Responses / Schema-Fallbacks.

---

## Queue #8 — `references`/`evidence` (abgeschlossen)

**Produktentscheid:** Domänenname = DB = **`references`** ([`arbeitspaket-rename-smart-match-references.md`](./arbeitspaket-rename-smart-match-references.md)).  
Welle-5 T3 („Module nach `evidence`“) ist **obsolet** — gegenläufig und nicht mehr umsetzen.

| Teil | Stand |
|------|-------|
| Routen `/dashboard/references`, `ROUTES.references`, Ordner `app/…/references`, `lib/references` | ✅ |
| Smart Match Pfade | ✅ |
| Legacy-Redirects `/dashboard/evidence` → `/dashboard/references` | ✅ behalten |
| COPY/`ROUTES.evidence`-Keys | ✅ entfernt |
| localStorage-Keys (`reference-*-v1`, Legacy-Fallback) | ✅ |
| DB `evidence_events` | bewusst **nicht** umbenannt |

**Nicht umbenennen:** Feld `evidence` in RFP/Deal-Desk (Beleg/Zitat aus Ausschreibungstext) — anderer Begriff.

---

## Queue #9 — Invite-SQL-Helfer (skip)

**Check 2026-08-06:** Keine App-Aufrufe von `resolve_invite_roles` / `legacy_role_from_dimensions` via `.rpc`.
Die Funktionen bleiben **DB-intern** (Invite create/accept/list RPCs in Migrationen) — Drop wäre kein Kosmetik-PR.

## Queue #6 — `{ ok }` → `{ success }`

| Slice | Stand |
|-------|-------|
| 1 Auth/CRM | ✅ password-policy (`Result`), magic-link, `requireCrmAdmin`, `hubSpotApiFetch` + HubSpot-Caller |
| 2 Document-Extract | ✅ `extractPlainText*`, RFP-Extract, `extractPlainTextFromBuffer`, Deal-Upload-Validate, `loadDealDocumentAsFile`, `runDealRfpAnalyze` |
| 3 Internal-Approval | ✅ context / complete / delegate + Token-Page/Actions |
| 4 Bulk / Search / Misc | ✅ bulk-import-upload, semantic search, NDA `assertCompanyInOrg`, Dev-Preview-Role, Workspace-Subdomain-Status (`available`) |
| Geparkt | Cron/Push `NextResponse.json({ ok })` — HTTP-Vertrag; nicht blind umbiegen |

Cron-/Push-Responses mit `{ ok: true }` sind **HTTP-Vertrags**-ähnlich — separat entscheiden, nicht blind umbiegen.

---

## Boy-Scout (kein eigener Sprint)

Bei Feature-PRs mitnehmen, **kein** Massen-PR:

- God-Files weiter splitten (#5)  
- `{ ok }` → `{ success }` (#6)  
- Service-Role-Caller mit Org/Token-Kommentar (#1 Rest)

---

## Geparkt

| Thema | Warum |
|-------|--------|
| Massen-Migration Results / Dateinamen | Boy-Scout reicht |
| H3 Background-Jobs, E1 Pre-Pilot, G2 Pilotstart | Erst wenn Pilot terminiert |
| Blindes Knip-Export-Löschen | False Positives bei Server Actions |

---

## Session-Start (kurz)

1. Dieses Dokument lesen — Default: Boy-Scout #5 bei Feature-Touch.  
2. Kein weiterer Big-Bang in der offenen Queue (#6 Lib erledigt; Cron/Push geparkt).  
3. Nach Abschluss: Status hier + Inventar anpassen.

---

## Abgleich mit Inventar

| Inventar | Status hier |
|----------|-------------|
| P0 / P1-1…5/7–10 / P2 Quick Wins / P3-1/2/4/5 | erledigt |
| P1-6 | ✅ App/Lib; DB `companies` bleibt |
| E4 / E7 | ✅ |
| E6 Logger | ✅ App/Lib; Sink/Scripts bewusst |
| Typed-Supabase T3 | ✅ Domänen weitgehend |
| Typed-Supabase T4 | ✅ CI-`typecheck`-Gate scharf |
| Welle 5 T3 Paths | ✅ als `references` (nicht evidence); siehe Queue #8 |
| Welle 5 T4 `workspace_state` | Spalte gedroppt (Migration); App-Code ohne Treffer |
