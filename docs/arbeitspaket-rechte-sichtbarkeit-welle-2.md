# Arbeitspaket: Rechte & Sichtbarkeit (Welle 2)

**Quelle:** Produkt-Audit & Entscheidungsregister (Vault, Juni 2026). Entscheidungen B1, B2, B4.
**Zweck:** Sichtbarkeit von Referenzen **datenbankseitig** durchsetzen (statt nur App-Logik) und ein firmenindividuelles „Rollen & Rechte"-Setting einführen.
**Setzt voraus:** Welle 1 (Rollenmodell) ist gebaut — `profiles.system_role`, `profiles.function_role`, `profiles.capabilities` existieren. Siehe `docs/arbeitspaket-rollenmodell-welle-1.md`.

---

## Vorab lesen (für die Coding-Session)

- **Konventionen zuerst:** `docs/ai-coding-agent-guide.md` — bei UI (Settings-Tab) zusätzlich `docs/design-system.md`.
- **Vorgänger:** `docs/arbeitspaket-rollenmodell-welle-1.md` muss umgesetzt sein (liefert `function_role`/`capabilities`, die die RLS-Helfer lesen).
- **Überholt:** rollenbezogene Teile von `docs/arbeitspakete-freigabe-rollen-settings-deals.md` (alte `admin`/`sales`-Annahme) gelten nicht.
- **Code vor Edit lesen:** die in Abschnitt 0/3.4/4 genannten Dateien.
- **Sicherheit:** SECURITY-DEFINER-Funktionen mit gesetztem `search_path`; kein RLS-Bypass.
- **Nicht heranziehen:** der Obsidian-Vault (außerhalb des Repos).

---

## 0. Warum dieses Paket (Problem)

`[verifiziert]`
- Referenz-RLS ist **rein mandanten-isoliert** (`companies.organization_id = current_user_organization_id()`). **Kein** Filter auf `status`/`is_nda_deal`/`approval_scope_confidential_sales`.
- „Sales sieht keine Entwürfe" ist **nur App-Logik**: der Wert `salesVisibleOnly = (role === 'sales')` wird an **vier** Stellen dupliziert berechnet:
  - `app/dashboard/command-center/actions.ts`
  - `app/dashboard/references/match.ts`
  - `app/api/deal-desk/analyze/route.ts`
  - `app/api/rfp/analyze/route.ts`
- Folge: Ein als `sales` authentifizierter Client kann per **direktem** `select * from references` alle Zeilen (inkl. Entwürfe/NDA) lesen — die UI-Filter greifen nicht auf DB-Ebene.

**Ziel:** Vertraulichkeit in die RLS ziehen (Source of Truth für Sicherheit), App-Filter auf **eine** Stelle zentralisieren (Defense-in-Depth + Query-Effizienz), und das Ganze pro Firma konfigurierbar machen.

---

## 1. In Scope / Out of Scope

**In Scope (B1, B2, B4):**
- Step 0: RLS-Loch final belegen (Sales-JWT-Lesetest + Supabase-Advisors).
- B1: Sichtbarkeits-/Sensibilitäts-Regeln in der references-RLS erzwingen.
- Zentralisierung der 4 dupliierten `salesVisibleOnly`-Gates auf einen Helper (aus dem Welle-1-Capability-Modell, nicht Legacy-`role`).
- B2: Settings-Tab „Rollen & Rechte" (org-weite Konfiguration, mit Defaults).
- B4: Default-Sichtbarkeit für Sales als Firmen-Setting.

**Out of Scope:**
- B3 (Capability-Override pro einzelnem User) — später.
- Dashboards (Welle 3), Nav-Umbau (Welle 3).
- Änderungen an Deals/Accounts-RLS über das hier Nötige hinaus.

---

## 2. Step 0 — RLS-Loch belegen (vor der Umsetzung)

`[Pflicht-Vorabschritt]`
1. **Sales-JWT-Lesetest:** Mit einem echten `sales`-User-JWT (nicht Service Role!) ausführen:
   ```sql
   select id, status, is_nda_deal from references limit 50;
   ```
   Erwartung **vor** dem Fix: Entwürfe/NDA-Zeilen kommen zurück (= Loch bestätigt).
2. **Supabase Advisors** (Security + Performance) laufen lassen, Befunde notieren.
3. Ergebnis in `docs/` oder PR-Beschreibung festhalten; erst dann B1 umsetzen.

---

## 3. B1 — Sichtbarkeit in der RLS erzwingen

### 3.1 Sichtbarkeits-Regeln (Soll)

| Tier | Bedingung (Spalten) | Wer darf SELECT |
|------|---------------------|-----------------|
| Freigegeben/extern | `status IN ('approved','external','anonymized')` | alle internen Org-Mitglieder |
| Intern | `status = 'internal_only'` | alle internen Org-Mitglieder (nicht anonyme Token-Leser) |
| Entwurf | `status = 'draft'` | Ersteller (`created_by = auth.uid()`), AM, Owner/Admin, RPM-Capability |
| Vertraulich/NDA | `is_nda_deal = true` OR `approval_scope_confidential_sales = true` | Ersteller, AM, Legal*, Owner/Admin |

(*Legal-Funktions-Rolle existiert erst in späterer Ausbaustufe; bis dahin Owner/Admin.)

### 3.2 SQL-Helfer (RLS-tauglich)

```sql
-- Funktions-/System-Rolle des aktuellen Users (SECURITY DEFINER, STABLE)
CREATE OR REPLACE FUNCTION public.current_user_function_role()
RETURNS public.function_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT function_role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_privileged()  -- owner/admin
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT system_role IN ('owner','admin') FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_capability(cap text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((capabilities ->> cap)::boolean, false)
  FROM public.profiles WHERE id = auth.uid()
$$;
```

### 3.3 SELECT-Policy (ersetzt „Users see references of own org")

```sql
DROP POLICY IF EXISTS "Users see references of own org" ON public.references;
CREATE POLICY "Users see references of own org (scoped)"
  ON public.references FOR SELECT TO authenticated
  USING (
    -- Mandanten-Isolierung wie bisher
    (SELECT organization_id FROM public.companies c WHERE c.id = references.company_id)
      = public.current_user_organization_id()
    AND (
      -- privilegiert sieht alles
      public.current_user_is_privileged()
      -- eigene Datensätze immer
      OR references.created_by = auth.uid()
      -- AM sieht Entwürfe/vertraulich der eigenen Org
      OR public.current_user_function_role() = 'account_manager'
      -- Freigegeben/intern: alle
      OR (references.status IN ('approved','external','anonymized','internal_only')
          AND references.is_nda_deal = false
          AND references.approval_scope_confidential_sales = false)
      -- Capability-Overrides (org-konfigurierbar, B2)
      OR (references.status = 'draft' AND public.current_user_has_capability('see_draft_references'))
      OR ((references.is_nda_deal OR references.approval_scope_confidential_sales)
          AND public.current_user_has_capability('see_confidential_references'))
    )
  );
```

> **Beibehalten:** die bestehenden Anon-Policies („Anon can read/update references with approval token") — Kundenfreigabe darf nicht brechen.
> **INSERT/UPDATE/DELETE-Policies** bleiben org-basiert wie bisher (Schreibrechte regelt Welle 2 nicht neu, außer wo nötig).

### 3.4 App-Gate zentralisieren

- Neue Funktion `getReferenceVisibilityScope()` (server) leitet aus dem **Welle-1-Capability-Modell** ab, ob nur sales-sichtbare Stati geladen werden — **nicht** mehr `role === 'sales'`.
- Die 4 Fundstellen (`command-center/actions.ts`, `references/match.ts`, `api/deal-desk/analyze/route.ts`, `api/rfp/analyze/route.ts`) auf diesen einen Helper umstellen.
- `match_references(..., p_sales_visible_only)` bleibt als Query-Effizienz/Defense-in-Depth, ist aber nach 3.3 **nicht mehr** die einzige Sicherung.

---

## 4. B2 — Settings-Tab „Rollen & Rechte"

- Neuer Tab in `app/dashboard/settings/settings-tabs.tsx` (nur für Owner/Admin sichtbar).
- Neue Actions-Datei `app/dashboard/settings/roles-permissions-actions.ts` (vorhandenes `settings/user-role.ts` als Ausgangspunkt prüfen/erweitern).
- Persistenz org-weit: in `organizations.api_settings` (jsonb, existiert bereits) unter Key `roles_permissions` — **kein** neues Tabellenschema nötig für MVP.
- Konfigurierbar (mit Defaults aus der Capability-Map von Welle 1):
  - aktive Funktions-Rollen,
  - Capability-Toggles je Funktions-Rolle (schreibt in `profiles.capabilities` bzw. org-Default),
  - **B4:** Default-Sichtbarkeit Sales (Entwürfe sichtbar ja/nein),
  - Approval-Routing (direkt AM→Kunde / über RPM / Legal-Gate bei NDA),
  - Sensibilitäts-Labels (Anzeigetexte).
- Prinzip „customizable, but not required": ohne Konfiguration gelten die Code-Defaults.

> **Hinweis zur Konsistenz:** Wenn Capabilities org-weit konfiguriert werden, müssen die RLS-Helfer (3.2) dieselben Werte sehen. Für MVP: Capability-Overrides landen in `profiles.capabilities` (von der RLS gelesen). Org-weite Defaults werden beim Setzen auf die betroffenen Profile materialisiert (oder die Helfer lesen zusätzlich org-Settings — Entscheidung beim Bau, konsistent halten).

---

## 5. Umsetzungsreihenfolge

1. **Step 0** (Abschnitt 2) — Loch belegen.
2. SQL-Helfer + neue SELECT-Policy (3.2/3.3), Migration + Typegen.
3. App-Gate zentralisieren (3.4) — die 4 Fundstellen.
4. Settings-Tab + Actions (Abschnitt 4).
5. Re-Test: Sales-JWT-Lesetest erneut → Entwürfe/NDA kommen **nicht** mehr zurück.

---

## 6. Akzeptanzkriterien

- [ ] Step-0-Befunde dokumentiert (vorher: Loch bestätigt).
- [ ] Sales-JWT `select … from references` liefert **keine** `draft`-/NDA-/`confidential_sales`-Zeilen mehr; AM/Admin/Owner und Ersteller schon.
- [ ] Anon-Approval-Token-Zugriff (`/approval/[token]`) funktioniert unverändert.
- [ ] Die 4 `salesVisibleOnly`-Stellen nutzen **einen** Helper auf Basis von `function_role`/Capabilities (kein `role === 'sales'` mehr).
- [ ] Settings-Tab „Rollen & Rechte" (nur Owner/Admin) speichert Konfiguration in `organizations.api_settings`; ohne Konfiguration greifen Defaults.
- [ ] B4: Toggle „Sales sieht Entwürfe" wirkt nachvollziehbar auf RLS-Sichtbarkeit.
- [ ] Bestehende Tests grün; neue Policy-Tests für die Sichtbarkeits-Tiers ergänzt.

## 7. Verifikation

```bash
npm run test
npm run build
# Migration lokal/Branch anwenden, Supabase-Typen regenerieren
```
- Manuell: je ein Testuser pro Funktions-Rolle; pro Sichtbarkeits-Tier prüfen, was sichtbar ist.
- Supabase Security-Advisor erneut → keine RLS-Warnung auf `references`.

---

## 8. Risiken / Hinweise

- **SECURITY DEFINER-Helfer** sorgfältig schreiben (search_path setzen), sonst RLS-Bypass-Risiko.
- Performance: Die Helfer lesen `profiles` pro Zeilen-Check — als `STABLE` markieren, damit der Planner cached; ggf. Policy so formulieren, dass die Rollen-Checks **einmal** je Query greifen.
- Reihenfolge-Abhängigkeit zu Welle 1: ohne `function_role`/`capabilities` schlägt die Policy fehl — Welle 1 muss deployed sein.
- `match_references` nicht voreilig vom `p_sales_visible_only`-Parameter befreien — erst wenn RLS verifiziert greift (Defense-in-Depth).

---

## 9. Bezug zu Entscheidungen
- B1 = RLS-Härtung (Abschnitt 3). B2 = Settings-Tab (Abschnitt 4). B4 = Sales-Default (Abschnitt 4).
- Baut auf Welle-1-Capability-Katalog auf (`see_draft_references`, `see_confidential_references`, `manage_reference_program`, …).
