# Arbeitspaket: Rollenmodell (Welle 1)

**Quelle:** Produkt-Audit & Entscheidungsregister (Vault, Juni 2026). Entscheidungen A1–A4 angenommen.
**Zweck:** Umsetzungsreife Spezifikation des neuen Rollenmodells für die Implementierung (Cursor/Dev). Selbstständig — keine externen Links nötig.
**Scope-Hinweis:** Dieses Paket legt nur das **Modell**. RLS-/Sichtbarkeits-Durchsetzung und der firmenindividuelle Settings-Tab sind **Welle 2** und NICHT Teil dieses Pakets.

---

## Vorab lesen (für die Coding-Session)

- **Konventionen zuerst:** `docs/ai-coding-agent-guide.md` (Stack, Scope-Disziplin, Design-Tokens, Supabase-Patterns, deutsche UI-Copy) — bei UI-Änderungen zusätzlich `docs/design-system.md`.
- **Überholt — NICHT der Altannahme folgen:** Die rollenbezogenen Teile von `docs/arbeitspakete-freigabe-rollen-settings-deals.md` gehen noch von der `admin`/`sales`-Welt aus. **Dieses Paket ersetzt das** (zwei Dimensionen + Capabilities).
- **Code vor Edit lesen:** die in Abschnitt 8 genannten Dateien.
- **Typegen:** kein npm-Script vorhanden — Supabase-Typgenerierung über die Projekt-/Supabase-CLI-Konvention nach der Migration.
- **Nicht heranziehen:** der Obsidian-Vault (außerhalb des Repos). Das nötige „Warum" steht inline; tiefergehende Begründung liegt im Vault, ist aber für die Umsetzung nicht erforderlich.

---

## 0. Ziel in einem Satz

Das flache `profiles.role` (`admin`/`sales`/`account_manager`) wird durch **zwei Dimensionen** ersetzt: **System-Rolle** (Rechte) + **Funktions-Rolle** (Job/Dashboard), plus einen **Capability-Layer** — rückwärtskompatibel, ohne die ~41 bestehenden `role`-Lesestellen zu brechen.

---

## 1. In Scope / Out of Scope

**In Scope (A1–A4):**
- DB-Migration: ENUMs `system_role`, `function_role`; Spalten auf `profiles`; Backfill; Sync-Trigger für Legacy-`role`.
- `hooks/useRole.tsx`-Refactor (neue Helfer, alte API stabil halten).
- Invite-Flow: System- + Funktions-Rolle wählbar; `account_manager` einladbar.
- Capability-Default-Map (read-only Code-Konstante).
- Supabase-TS-Typen regenerieren.

**Out of Scope (→ Welle 2, NICHT anfassen):**
- RLS-Policies auf Sichtbarkeit umstellen.
- Settings-Tab „Rollen & Rechte" / firmenindividuelle Konfiguration.
- Dashboards nach Funktions-Rolle (separate Welle 3).
- Legacy-`role`-Spalte löschen (erst nach vollständigem Refactor, eigenes späteres Paket).

---

## 2. Datenmodell

ENUM `system_role`: `owner`, `admin`, `member`, `viewer`
ENUM `function_role`: `sales_rep`, `account_manager`, `sales_leader`  *(weitere später: marketing, bid_manager, legal, sales_ops — jetzt NICHT anlegen)*

Neue Spalten auf `public.profiles`:

| Spalte | Typ | NOT NULL | Default |
|--------|-----|----------|---------|
| `system_role` | `system_role` | ja | `'member'` |
| `function_role` | `function_role` | ja | `'sales_rep'` |
| `capabilities` | `jsonb` | ja | `'{}'::jsonb` |

`capabilities` enthält nur **Overrides** (`{ "manage_reference_program": true }`); fehlt ein Key, gilt der Default aus der Funktions-/System-Rolle (Abschnitt 5).

**Reference Program Manager** ist KEINE Funktions-Rolle, sondern die Capability `manage_reference_program` (Entscheidung A3).

---

## 3. Migration (Skelett)

> Idempotent; ENUM-Anlage via Guard. Datei z. B. `supabase/migrations/<ts>_role_model_system_function.sql`.

```sql
-- 1) ENUMs
DO $$ BEGIN
  CREATE TYPE public.system_role AS ENUM ('owner','admin','member','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.function_role AS ENUM ('sales_rep','account_manager','sales_leader');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Spalten
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS system_role   public.system_role   NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS function_role public.function_role NOT NULL DEFAULT 'sales_rep',
  ADD COLUMN IF NOT EXISTS capabilities  jsonb                NOT NULL DEFAULT '{}'::jsonb;

-- 3) Backfill aus Legacy-role
UPDATE public.profiles SET
  system_role = CASE role::text
    WHEN 'admin' THEN 'admin'::public.system_role
    ELSE 'member'::public.system_role END,
  function_role = CASE role::text
    WHEN 'admin'           THEN 'sales_leader'::public.function_role
    WHEN 'account_manager' THEN 'account_manager'::public.function_role
    ELSE 'sales_rep'::public.function_role END;

-- 3b) Org-Owner = ÄLTESTER Admin pro Org.
--     WICHTIG: profiles hat KEIN created_at -> auth.users.created_at verwenden.
WITH oldest_admin AS (
  SELECT DISTINCT ON (p.organization_id) p.id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.system_role = 'admin'
  ORDER BY p.organization_id, u.created_at ASC
)
UPDATE public.profiles p
SET system_role = 'owner'
FROM oldest_admin oa
WHERE p.id = oa.id;

-- 4) Sync-Trigger: Legacy-role aus neuen Feldern ableiten (Übergangsphase)
CREATE OR REPLACE FUNCTION public.sync_legacy_profile_role()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.role := CASE
    WHEN NEW.function_role = 'account_manager' THEN 'account_manager'
    WHEN NEW.system_role IN ('owner','admin')  THEN 'admin'
    ELSE 'sales' END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_legacy_profile_role ON public.profiles;
CREATE TRIGGER trg_sync_legacy_profile_role
  BEFORE INSERT OR UPDATE OF system_role, function_role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_profile_role();
```

> Hinweis: Mapping in 3) und im Trigger konsistent halten. `sales_leader` → Legacy `admin` (Sandra behält Admin-Rechte, Entscheidung).

---

## 4. Capability-Default-Map (Code-Konstante)

Neue Datei z. B. `lib/roles/capabilities.ts`:

```ts
export const CAPABILITIES = [
  'create_reference', 'edit_any_reference', 'approve_internal',
  'start_customer_approval', 'anonymize_reference', 'manage_reference_program',
  'see_draft_references', 'see_confidential_references',
  'view_analytics_all', 'view_analytics_own',
  'export_marketing_library', 'manage_team', 'manage_settings', 'manage_integrations',
] as const
export type Capability = (typeof CAPABILITIES)[number]

// Defaults je Funktions-Rolle (System-Rolle owner/admin erhält Admin-Caps zusätzlich)
export const FUNCTION_ROLE_CAPS: Record<FunctionRole, Capability[]> = {
  sales_rep:        ['view_analytics_own'],
  account_manager:  ['create_reference','approve_internal','start_customer_approval',
                     'anonymize_reference','see_draft_references','see_confidential_references',
                     'view_analytics_own'],
  sales_leader:     ['view_analytics_all'],
}
export const ADMIN_CAPS: Capability[] = [
  'create_reference','edit_any_reference','approve_internal','start_customer_approval',
  'anonymize_reference','see_draft_references','see_confidential_references',
  'view_analytics_all','manage_team','manage_settings','manage_integrations',
]
// Effektiv = (FUNCTION_ROLE_CAPS[fr] ∪ (system owner/admin ? ADMIN_CAPS : [])) ⊕ profiles.capabilities-Overrides
```

`manage_reference_program` ist standardmäßig bei niemandem aktiv → nur via `capabilities`-Override (RPM-Capability).

---

## 5. `hooks/useRole.tsx` — Zielsignatur

```ts
export type SystemRole = 'owner' | 'admin' | 'member' | 'viewer'
export type FunctionRole = 'sales_rep' | 'account_manager' | 'sales_leader'

export function useRole(): {
  systemRole: SystemRole
  functionRole: FunctionRole
  isOwner: boolean
  isAdmin: boolean         // = systemRole owner|admin
  can: (cap: Capability) => boolean
  // Übergangs-Aliase (deprecated, später entfernen):
  isSales: boolean         // functionRole === 'sales_rep'
  isAccountManager: boolean // functionRole === 'account_manager'
}
```

- `can()` berechnet effektive Capabilities aus Funktions-Rolle + Admin-Caps + Overrides.
- **Wichtig:** Die ~41 bestehenden `isAdmin/isSales/isAccountManager`-Aufrufe müssen unverändert weiterfunktionieren — Aliase beibehalten, intern auf neue Felder mappen.
- `lib/dev-role-preview.ts` (`DEV_ROLE_COOKIE`, `parseAppRoleCookie`): um System- + Funktions-Rolle erweitern.

---

## 6. Invite-Flow (A4)

- `app/dashboard/settings/invite-actions.ts`: `role: 'admin'|'sales'` → `systemRole` + `functionRole`. RPCs `create_organization_invite` / `update_organization_invite_role`: Parameter `p_system_role` + `p_function_role` ergänzen (`p_role` als Deprecation-Alias mit Mapping behalten, bis Schema-Cache umgestellt).
- `app/dashboard/settings/settings-team-card.tsx`: Rollen-Dropdown → zwei Felder (System-Rolle + Funktions-Rolle). `account_manager` wird damit einladbar.
- Accept-Flow schreibt beide Felder ins Profil.
- Migration für die Invites-Tabelle analog (Spalten `system_role`/`function_role`, Backfill aus `role`).

---

## 7. Umsetzungsreihenfolge (Strangler)

1. Migration (Abschnitt 3) + `npm run` Typegen → neue Felder da, `role` bleibt korrekt.
2. `capabilities.ts` + `useRole`-Refactor (Abschnitt 4/5) → API nach außen stabil.
3. Invite-Flow (Abschnitt 6).
4. (separat, später) verbleibende direkte `profile.role`-Vergleiche auf `systemRole`/`can()` migrieren; danach Legacy-Spalte+Trigger entfernen.

---

## 8. Akzeptanzkriterien

- [ ] `profiles` hat `system_role`, `function_role`, `capabilities`; alle Bestandsnutzer backfilled (admin→admin/sales_leader, account_manager→member/account_manager, sales→member/sales_rep).
- [ ] Pro Org genau ein `owner` (= ältester Admin via `auth.users.created_at`).
- [ ] Legacy-`role` bleibt durch Trigger konsistent; **keine** Regression in bestehenden `useRole`-Aufrufen.
- [ ] `useRole()` liefert `systemRole`, `functionRole`, `isOwner`, `isAdmin`, `can()`.
- [ ] Team-Invite erlaubt System- + Funktions-Rolle inkl. `account_manager`; angenommene Invites schreiben beide Felder.
- [ ] `manage_reference_program` nur per Override aktiv (keine Default-Träger).
- [ ] Dev-Rollen-Preview schaltet System- + Funktions-Rolle.

## 9. Verifikation

```bash
npm run test          # bestehende Tests grün
npm run build         # Build grün
# Supabase-Typen nach Migration neu generieren (Projekt-Konvention)
```
- Manuell: Migration auf Branch/lokal anwenden, Backfill-Zählungen prüfen (`select system_role, function_role, count(*) from profiles group by 1,2`), genau ein `owner` pro Org.

---

## 10. Getroffene Entscheidungen (inline, keine Rückfragen nötig)

- Owner = **ältester Admin/Org** (über `auth.users.created_at`, da `profiles.created_at` fehlt).
- `viewer` als Enum-Wert **anlegen**, UI später.
- Sandra (Head of Sales) = `system_role = admin` + `function_role = sales_leader`.
- RPM = Capability `manage_reference_program`, keine Funktions-Rolle.
- Eine Funktions-Rolle pro Person im MVP (Mehrfachrollen später via Capabilities).
