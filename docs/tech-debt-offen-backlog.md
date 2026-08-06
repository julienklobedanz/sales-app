# Tech-Debt — Offene Punkte & empfohlene Reihenfolge

**Stand:** 2026-08-06  
**Zweck:** Aktionsfähige Übersicht der **noch offenen** Tech-Debt-Abbauarbeit — plus Reihenfolge.  
**Detail/Historie:** [`tech-debt-inventar.md`](./tech-debt-inventar.md) und verlinkte Arbeitspakete.

---

## Status auf einen Blick (2026-08-06)

| Status | Themen |
|--------|--------|
| **Erledigt** | Inventar-Hygiene (#0); E4 Hotspot-Audit (#1); E7 Schema-Sync (#2); **P1-6** Accounts Naming App/Lib (#4); Welle-5 Rollen (Invite/`AppRole`/Mapping); Typed-Supabase Kern-Domänen + Shared Portfolio + **Market Signals Slice 1** (Instant Alerts/Digest/Champion/Newsroom/MS-Actions) |
| **In Arbeit** | Typed-Supabase Cast-Abbau (#3) — Rest (MS Ingest/Data-Detail, Command Center, Cron) + **T4** |
| **Offen (Queue)** | #3 Rest · #5 God-Files (Boy-Scout) · #6 `{ ok }` → `{ success }` (Boy-Scout) · #7 DE/EN-Dateinamen (Boy-Scout) · #8 `references`/`evidence` Rename · #9 Invite-SQL-Kosmetik (optional) |
| **Geparkt** | Pilot (H3/E1/G2); Massen-Renames; produktweite `evidence`↔`references`-Entscheidung |

**Hebel jetzt:** Queue **#3** zu Ende führen (References-Rest → andere Domänen → Typed-Supabase **T4** CI-`typecheck`-Gate), danach erst Big-Bang **#8**.

---

## Empfohlene Queue (Rest)

| # | Thema | Status | Was noch | Aufwand | Nächster Schnitt |
|---|-------|--------|----------|---------|------------------|
| **0** | Inventar-Hygiene | ✅ | — | — | — |
| **1** | E4 Service-Role | ✅ Audit + Hotspots | Boy-Scout: Kommentar an neuen Service-Role-Callern | XS ongoing | bei Touch |
| **2** | E7 Schema-Sync | ✅ T1–T4 | Types bei Migrationen regenerieren (`db:types`) | XS ongoing | bei Schema-Change |
| **3** | Typed-Supabase Cast-Abbau | **🟡 aktiv** | MS Ingest/Executive Rest · Command Center · ggf. T4 | M | Market Signals Slice 2 (ingest) **oder** T4 CI-Gate |
| **4** | P1-6 Accounts Naming | ✅ App/Lib | DB-Tabelle `companies` / `company_id` / Firmennamen-Helfer **bewusst offen** | — | nicht anfassen ohne Produktentscheid |
| **5** | God-File-Nacharbeit | offen (Boy-Scout) | Overview / Share-Link / MS-Feed weiter slicen **nur bei Feature-Touch** | M ongoing | kein eigener Big-Bang-PR |
| **6** | `{ ok }` → `{ success }` | offen (Boy-Scout) | ~130 Matches in Libs/Cron | S–M | bei Lib-Berührung mitziehen |
| **7** | P3-3 DE/EN-Dateinamen | offen (Boy-Scout) | z. B. `ki-entwurf-sheet`, `customer-sperrlink-email` | XS | nur bei Datei-Touch |
| **8** | Welle-5 T3 `references`/`evidence` | offen | Modulpfade an einen Domänennamen | L | **nach** #3-Ruhe; eigener Branch |
| **9** | DB-Legacy Invite-Helfer | optional | `legacy_role_from_dimensions` / `resolve_invite_roles` wenn App-Caller = 0 | S | `grep` vor Start |
| **10** | Rest-`console.*` | erledigt (App/Lib) | Logger-Sink + Scripts behalten; später Sentry/Logflare | — | kein Ticket |

---

## Queue #3 — Typed-Supabase (Detail Rest)

**Ziel:** Row-Casts nur noch an echten Boundaries (RPC-JSON, externe APIs, Schema-Fallbacks).  
**Arbeitspaket:** [`arbeitspaket-typed-supabase.md`](./arbeitspaket-typed-supabase.md)

| Domäne | Stand | Noch typische Hotspots |
|--------|-------|------------------------|
| Accounts | ✅ Slices 1–4 | wenig: CRM-JSON, External-Contacts-Fallback, Error-Shapes |
| Deals | ✅ Slices 1–2 | wenig: Eligibility/JSON-API-Responses (bewusst) |
| References | ✅ Slice 1–5 | Rest vereinzelt (trash/Quote/JSON); Page date_format ✅ |
| Settings | ✅ Slice 1 | Stripe/HubSpot/Push-JSON bewusst |
| Shared Portfolio | ✅ Slice 1 | `app/p/actions` RPC-Json-Guards |
| Deal-Desk | ✅ Quick | workspace-persistence typed; page redirect |
| Notifications | ✅ Quick | Inbox org/champion rows |
| Market Signals | ✅ Slice 1 | Instant Alerts, Digest, Champion, Newsroom, Action orgIds; data joins |
| Andere | offen | MS Ingest/Executive Rest, Command Center, Register/Onboarding RPC |
| **T4 CI** | offen | `typecheck` in CI **scharf**, wenn Domänen-Casts weitgehend weg / typecheck stabil 0 |

**Empfohlene nächsten PRs (klein halten):**

1. Market Signals Slice 2 — Ingest/Executive-Intel Rest-Casts **oder**  
2. Typed-Supabase **T4** — CI-`typecheck`-Gate  
3. Optional: Command Center Boy-Scout

---

## Boy-Scout (kein eigener Sprint)

Bei Feature-PRs mitnehmen, **kein** Massen-PR:

- God-Files weiter splitten (#5)  
- `{ ok }` → `{ success }` (#6)  
- DE/EN-Dateinamen (#7)  
- Service-Role-Caller mit Org/Token-Kommentar (#1 Rest)

---

## Geparkt

| Thema | Warum |
|-------|--------|
| Repo-weites `evidence`↔`references` (Produktname) | Überlappt #8; Produktentscheidung nötig |
| Massen-Migration Results / Dateinamen | Boy-Scout reicht |
| H3 Background-Jobs, E1 Pre-Pilot, G2 Pilotstart | Erst wenn Pilot terminiert |
| Blindes Knip-Export-Löschen | False Positives bei Server Actions |

---

## Session-Start (kurz)

1. Dieses Dokument lesen — Default: **#3** weiter.  
2. Feature-Arbeit: #5–7 Boy-Scout.  
3. **#8** nur als eigener Branch, CI grün, kein Verhaltens-Diff.  
4. Nach Abschluss: Status hier + Inventar anpassen.

---

## Abgleich mit Inventar

| Inventar | Status hier |
|----------|-------------|
| P0 / P1-1…5/7–10 / P2 Quick Wins / P3-1/2/4/5 | erledigt |
| P1-6 | ✅ App/Lib; DB `companies` bleibt |
| E4 / E7 | ✅ |
| E6 Logger | ✅ App/Lib; Sink/Scripts bewusst |
| Typed-Supabase T3 | 🟡 aktiv (Kern + MS Slice 1 ✅; Ingest/CC Rest) |
| Typed-Supabase T4 | offen (nach T3-Ruhe) |
| Welle 5 T3 Paths | → Queue #8 |
| Welle 5 T4 `workspace_state` | vor Start erneut `grep`en |
