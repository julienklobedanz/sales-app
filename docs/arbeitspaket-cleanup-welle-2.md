# Arbeitspaket: Cleanup zu Welle 2 (Boy-Scout, nachgeholt)

**Quelle:** Roadmap-Prinzip „Cleanup mit der Welle mitnehmen" (Boy-Scout-Regel) — bei der Umsetzung von Welle 2 nicht miterledigt, wird hier nachgeholt.
**Voraussetzung:** Welle 1 + 2 sind umgesetzt (`lib/roles/*`, `system_role`/`function_role`, RLS-Migration `20260629120000_references_visibility_rls.sql`, zentrale Sichtbarkeits-Helfer). 261 Tests grün.
**Charakter:** verhaltenserhaltend (Refactor/Migration von Logik), **keine** neuen Features. Tests müssen grün bleiben.

---

## Vorab lesen (für die Coding-Session)

- **Konventionen zuerst:** `docs/ai-coding-agent-guide.md` (Scope-Disziplin: hier ist Refactor **ausdrücklich** der Auftrag, aber begrenzt auf die unten genannten Dateien) + `docs/design-system.md` (Settings-UI).
- **Kontext der Welle 2:** die neuen Helfer in `lib/roles/` (`capabilities.ts`, `reference-visibility-scope.ts`, `load-reference-visibility.ts`, `profile-roles.ts`, `effective-capabilities`) sind die **Soll-Quelle** — verstreute Alt-Checks darauf umstellen.
- **Nicht heranziehen:** Obsidian-Vault (außerhalb Repo).

---

## Warum (Befund am Code)

`[verifiziert]`

- `app/dashboard/settings/settings-tabs.tsx` ist durch den neuen `roles`-Tab auf **1505 Zeilen** gewachsen (7 `TabsContent`-Blöcke inline: profile, workspace, admin, team, roles, integrations, workflow). Der Boy-Scout-Schritt „bei der Gelegenheit zerlegen" wurde nicht gemacht.
- Trotz neuer zentraler Helfer bestehen **viele verstreute `role === 'sales'`-Checks** weiter (u. a. `evidence/[id]/page.tsx` ~10×, `evidence-client.tsx`, `evidence/new/page.tsx`, `evidence/[id]/edit/page.tsx`, `evidence/[id]/actions.ts`, `dashboard-home-data.ts:1277`, `settings/page.tsx:262`, `settings/actions.ts:96`).
- `app/dashboard/settings/user-role.ts` nutzt noch `updateUserRoleImpl(role: 'admin' | 'sales')` (Legacy-Zweiwertigkeit), aufgerufen aus `app/dashboard/actions.ts:375`.

---

## T1 — `settings-tabs.tsx` modularisieren

**Soll:** Jeden Tab-Inhalt in eine eigene Komponente auslagern (z. B. `app/dashboard/settings/tabs/profile-tab.tsx`, `workspace-tab.tsx`, `admin-tab.tsx`, `team-tab.tsx`, `integrations-tab.tsx`, `workflow-tab.tsx`; der `roles`-Tab delegiert bereits an `settings-roles-permissions-card.tsx`). `settings-tabs.tsx` wird zur reinen Komposition (Tabs-Leiste + Einbindung).
**Akzeptanz:** `settings-tabs.tsx` deutlich verschlankt (Richtwert < ~300 Zeilen); jeder Tab eine eigene Datei; identisches Verhalten; Tests grün.
**Hinweis:** Reines Verschieben/Extrahieren — keine Logikänderung, Props/Server-Actions unverändert durchreichen.

---

## T2 — Verstreute `role === 'sales'`-Checks auf das Capability-/Rollenmodell migrieren

> Setzt den **Strangler-Schritt 3** aus dem Welle-1-Paket für die von Welle 2 berührten Bereiche um.

**Soll:** Legacy-Vergleiche durch das neue Modell ersetzen:

- **Sicherheitsrelevante Sichtbarkeit** (z. B. `evidence/[id]/page.tsx:254` `isReferenceVisibleToSales`, Redirects in `new/page.tsx`, `edit/page.tsx`, `[id]/actions.ts`): auf die **zentralen Helfer** (`reference-visibility-scope` / `load-reference-visibility` / Capabilities) umstellen — damit UI-Sicht und RLS dieselbe Quelle haben und nicht auseinanderdriften.
- **Reine UI-Layout-Entscheidungen** (order-1/order-2, Karten ein-/ausblenden in `evidence/[id]/page.tsx`): auf `useRole()`/`functionRole`/`can()` umstellen statt String-Vergleich `role === 'sales'`.
- `dashboard-home-data.ts:1277`, `evidence-client.tsx:50`: analog.

**Wichtig:** Erst die sicherheitsrelevanten Stellen (Drift-Risiko zur RLS), dann die kosmetischen.
**Akzeptanz:** Keine `role === 'sales'`-Vergleiche mehr in den genannten Dateien; stattdessen Capability-/`functionRole`-Logik; Verhalten unverändert (gleiche Sichtbarkeit/Layout je Rolle); Tests grün. (`salesVisibleOnly` in `command-center/actions.ts` & `references/match.ts` bleibt — läuft bereits über die zentralen Helfer.)

---

## T3 — `user-role.ts` mit dem neuen Modell abgleichen

**Soll:** Prüfen, ob `updateUserRoleImpl('admin'|'sales')` noch gebraucht wird:

- Wenn es nur die Legacy-Spalte `role` setzt → auf System-/Funktions-Rolle umstellen (bzw. an `invite-roles.ts`/Profil-Update-Pfad angleichen) **oder** als bewusst transitorisch markieren (Kommentar + Verweis auf Sync-Trigger), bis die Legacy-`role`-Spalte in Welle 5 entfällt.
- Aufrufer `app/dashboard/actions.ts:375` entsprechend anpassen.
  **Akzeptanz:** Kein zweiter, widersprüchlicher Pfad zur Rollensetzung; Verhalten dokumentiert; Tests grün.

---

## Out of Scope (bewusst NICHT hier)

- `references`(Module) vs. `evidence`(Route) Umbenennung → **Welle 5** (viele Imports).
- Andere Monolithen (market-signals-client, reference-form etc.) → ihre jeweiligen Wellen.
- Entfernen der Legacy-`role`-Spalte + Sync-Trigger → **Welle 5** (erst wenn alle `role`-Lesestellen migriert sind).
- `p_sales_visible_only` aus `match_references` entfernen → bewusst als Defense-in-Depth **behalten**.

---

## Verifikation

```bash
npm run test    # muss bei 261/261 (oder mehr) bleiben
npm run build
```

- T2 manuell: je ein Testuser pro Funktions-Rolle (sales_rep / account_manager / admin) — Referenz-Sichtbarkeit & Evidence-Detail-Layout identisch zu vorher.
- `grep -rnE "role === 'sales'" app` in den T2-Dateien → 0 Treffer.

---

## Reihenfolge

T1 (isoliert, mechanisch) → T2 (sicherheitsrelevante Stellen zuerst, dann kosmetische) → T3 (klein). Je eigener PR; T1 und T2 nicht vermischen.
