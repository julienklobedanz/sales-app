# Arbeitspaket: Welle 5 · T2-Nacharbeit (Hotfix nach role-Spalten-Drop)

**Dringlichkeit:** hoch — die Migration `20260630150000_drop_legacy_profile_role.sql` ist angewendet (`profiles.role` + `organization_invites.role` gedroppt), aber mehrere App-Stellen lesen/schreiben die Spalte noch → **Laufzeitfehler** (PostgREST „column does not exist"). Build/Tests grün, weil `.select('…role')` ein String ist und manche Stellen `as { role? }` casten.

---

## Zu fixende Stellen (verifiziert)

| Datei:Zeile                                    | Ist                                                                 | Soll                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/dashboard/settings/actions.ts:103`        | `updates.role = role`                                               | Zeile entfernen — `system_role`/`function_role` werden bereits gesetzt                                                                             |
| `app/dashboard/settings/invite-actions.ts:330` | `.select('id, full_name, email, role, system_role, function_role')` | `role` aus Select streichen; wo ein Legacy-Label gebraucht wird, aus `system_role`/`function_role` ableiten (`legacyAppRoleFrom`/`legacy-mapping`) |
| `app/dashboard/settings/invite-actions.ts:403` | `.select('organization_id, role, system_role, function_role')`      | `role` streichen                                                                                                                                   |
| `app/dashboard/settings/invite-actions.ts:457` | `.select('organization_id, role, system_role, function_role')`      | `role` streichen                                                                                                                                   |
| `lib/command-center/global-search.ts:285`      | `.from('profiles').select('id,full_name,role')`                     | `role` streichen (nur Anzeige)                                                                                                                     |
| `app/dashboard/market-signals/actions.ts:537`  | `.select('organization_id, role')` + Gate `role !== 'admin'…`       | `system_role`/`function_role` selektieren; Gate auf Capability/Funktions-Rolle umstellen (oder `legacyAppRoleFrom`)                                |
| `app/dashboard/market-signals/actions.ts:649`  | dito                                                                | dito                                                                                                                                               |

> Außerdem prüfen (gleiche Klasse, vom Nutzer gelistet): `app/api/cron/market-signals-digest/route.ts`, `lib/market-signals/market-signals-instant-alerts.ts`, `app/dashboard/page.tsx`, `app/dashboard/evidence/page.tsx` — auf `profiles`-Selects/Casts mit `role` durchsehen.

---

## Vorgehen

1. Obige Selects/Schreibzugriffe bereinigen (nur `system_role`/`function_role`; Legacy-Label via `lib/roles/legacy-mapping.ts` ableiten, wo nötig).
2. **Supabase-Typen neu generieren** — das ist die eigentliche Absicherung: mit aktuellen Typen meldet TS `.select`/Writes auf nicht existente Spalten und fängt weitere Fundstellen.
3. Voll-Build + Tests; danach die Laufzeitpfade manuell prüfen.

## Verifikation

```bash
# nach Typen-Regenerierung:
npm run build   # sollte verbliebene role-Referenzen aufdecken
npm run test
```

- `grep -rnE "\.select\([^)]*\brole\b" app lib` → keine profiles/invites-Selects mit `role` mehr.
- Manuell: Settings-Profil speichern, Team-Liste, Personensuche, Market-Signals-Abruf, Invite-Flow.

---

## Hinweis (Lesson)

Reihenfolge bei Spalten-Drops: **erst** alle App-Selects/Writes bereinigen **und Typen regenerieren** (fängt String-Selects/Casts), **dann** die Spalte droppen. Hier lief der Drop vor der vollständigen Bereinigung — daher diese Nacharbeit.
