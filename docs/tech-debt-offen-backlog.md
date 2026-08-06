# Tech-Debt — Offene Punkte & empfohlene Reihenfolge

**Stand:** 2026-08-05  
**Zweck:** Einzige **aktionsfähige** Liste dessen, was nach dem Inventar-Abbau (Quick Wins + Welle 5 Rollen) noch offen ist — plus eine Reihenfolge, die Risiko, Merge-Konflikte und „wert pro Diff“ maximiert.  
**Quelle / Detail:** [`tech-debt-inventar.md`](./tech-debt-inventar.md) und verlinkte Arbeitspakete. Dieses Dokument **ersetzt das Inventar nicht**; es filtert Erledigtes und priorisiert den Rest.

---

## Prinzip der Reihenfolge

1. **Klarheit zuerst** — Inventar/Docs syncen, sonst arbeitet man gegen veraltete P0/P2-Zeilen.  
2. **Risiko vor Kosmetik** — Security-/Schema-Gates vor großen Renames.  
3. **Kleine, isolierte PRs** — mechanische Renames in Scheiben; nie mit Verhaltensänderung mischen.  
4. **Boy-Scout statt Big-Bang** — `{ ok }` / Dateinamen / Rest-`console` nur bei Touch.  
5. **Große Domänen-Renames zuletzt** — hoher Diff, niedriger Laufzeitnutzen; erst wenn die Fläche ruhig ist.  
6. **Pilot-Themen geparkt** — nicht in diese Queue mischen.

---

## Empfohlene Queue (effizient)

| # | ID / Thema | Was | Aufwand | Warum jetzt / so | Verweis |
|---|------------|-----|---------|------------------|---------|
| **0** | Inventar-Hygiene | P0/P2/Mapping-Zeilen auf Ist-Stand bringen (viele ✅ fehlen in den Tabellen); Header-Datum | XS | Verhindert Doppelarbeit und falsche Prioritäten | [`tech-debt-inventar.md`](./tech-debt-inventar.md) — **✅ 2026-08-06** |
| **1** | E4 Service-Role-Audit | Alle `service-role`-Nutzungen rechtfertigen + fehlende Org/Token-Grenzen schließen | M | Cross-Tenant-Risiko; unabhängig von Naming; vor Pilot | [`arbeitspaket-service-role-audit-e4.md`](./arbeitspaket-service-role-audit-e4.md) — **Audit + Hotspot-Härtung ✅**; Rest Boy-Scout Kommentare |
| **2** | E7 Schema-Sync / Drift-Gate | Remote vs. Repo-Migrationen; `looseSelect`-Löcher; CI-Migrations-Gate festziehen | M | Schützt das schon vorhandene `database.types.ts`-Fundament | [`arbeitspaket-schema-sync-e7.md`](./arbeitspaket-schema-sync-e7.md) — **✅ T1–T4** (2026-08-06 verifiziert) |
| **3** | Typed-Supabase Cast-Abbau | `as { … }`-Row-Casts schrumpfen; Clients/`from()` stärker an `Database` koppeln | L (scheibenweise) | Verhindert die Fehlerklasse der role-Spalten-Drift; hoher Hebel nach E7 | [`arbeitspaket-typed-supabase.md`](./arbeitspaket-typed-supabase.md) |
| **4** | **P1-6** Accounts Naming | App/Lib: `company*` → `account*` wo Domäne „Account“; **DB `companies` bleibt** | L (3–5 PRs) | Letzter klarer Inventar-Welle-5-Block; rein mechanisch → nach Security/Typen, bevor noch größere Renames | Inventar P1-6 — Slice 1–3 ✅ (detail + grid + crud/dialogs); Rest: Lib |
| **5** | God-File-Nacharbeit | Overview (~719), Share-Link (~420), MS-Feed (~429) weiter slicen **nur bei Feature-Touch** | M (ongoing) | Kein eigener Big-Bang; Effizienz = bei Feature-PRs mitnehmen | Inventar God-Files / E5 |
| **6** | Result `{ ok }` → `{ success }` | ~27 Dateien / ~136 Matches in Libs/Cron | S–M Boy-Scout | Kein Massen-PR; bei jeder Lib-Berührung | Inventar Result-Konvention; Guide §3.1 |
| **7** | P3-3 DE/EN-Dateinamen | `ki-entwurf`, `sperrlink`, … | XS bei Touch | Nur umbenennen, wenn die Datei sowieso angefasst wird | Inventar P3-3 |
| **8** | Welle-5 T3 `references`/`evidence` | Modulpfade an einen Domänennamen angleichen (Route vs. Ordner) | L | Bewusst Big-Bang; **nach** P1-6 (sonst Doppel-Konflikte in Accounts/Refs) | [`arbeitspaket-legacy-abbau-welle-5.md`](./arbeitspaket-legacy-abbau-welle-5.md) T3 |
| **9** | DB-Legacy Invite-Helfer (optional) | `legacy_role_from_dimensions` / `resolve_invite_roles` aufräumen, wenn App-Callers = 0 | S | Nur Kosmetik in SQL; App braucht das nicht mehr | Migrationen Invite-RPCs |
| **10** | Rest-`console.*` | App/Lib praktisch leer; Logger-Sink + Scripts bewusst behalten | — | Kein eigenes Ticket; Sink später an Sentry/Logflare | E6 / Inventar P1-2 |

---

## P1-6 — empfohlenes Schnittmuster (max. Effizienz)

Nicht ein PR. Reihenfolge minimiert Konflikte und hält Reviews lesbar:

1. **Detail-UI-Dateien** umbenennen (`account-detail-*` → `account-detail-*`) + Imports — kein API-Rename.  
2. **Grid** (`accounts-grid*` → `accounts-grid*`).  
3. **Impl/CRUD** (`account-crud-impl`, Maintenance-Helfer) — Parameternamen `companyId` → `accountId` **nur in App-Signaturen**; SQL/`companies.id` unverändert.  
4. **Lib** (`company-from-join`, `company-name-match`, Brandfetch-Helfer) — zuletzt, weil viele Cross-Imports.  
5. Inventar P1-6 auf ✅ setzen.

**Nicht umbenennen:** Tabelle `companies`, Storage-Pfade, CRM-Feldnamen, Copy „Firma/Company“ als Firmenlabel.

---

## Geparkt (nicht in die Queue ziehen)

| Thema | Warum geparkt |
|-------|----------------|
| Repo-weites `evidence`↔`references` (Produktnamen) | Überlappt mit T3; Produktentscheidung + großer Diff |
| Massen-Migration aller Results / aller Dateinamen | Boy-Scout reicht; Big-Bang blockiert Features |
| Schema/RLS-Security-Big-Bang ohne E4/E7 | Reihenfolge: Audit → Sync → dann gezielte Härtung |
| H3 Background-Jobs, E1 Pre-Pilot-Daten, G2 Pilotstart | Erst wenn Pilot terminiert ist |
| Blindes Knip-Export-Löschen | False Positives bei Server Actions |

---

## Session-Start (kurz)

1. Dieses Dokument lesen (Queue #0–4 als Default).  
2. Bei Feature-Arbeit: #5–7 Boy-Scout.  
3. Große Renames (#4, #8) nur als eigene Branches/PRs, CI grün, kein Verhaltens-Diff.  
4. Nach Abschluss eines Punkts: hier und im Inventar Status anpassen.

---

## Abgleich mit Inventar (Ist 2026-08-05)

| Inventar | Status hier |
|----------|-------------|
| P0 Quick Wins, P1-1…5/7–10, P2 Quick Wins, P3-1/2/4/5 | **erledigt** — nicht erneut anfassen |
| P1-6 | **offen** → Queue #4 |
| E6 Logger heiße Pfade | **erledigt**; Rest Boy-Scout |
| E4 / E7 / Typed-Supabase Vertiefung | **offen** → Queue #1–3 |
| Welle 5 T3/T4 | T1/T2 Rollen weitgehend erledigt; T3 → Queue #8; T4 `workspace_state` vor Start erneut `grep`en (kann schon weg sein) |
