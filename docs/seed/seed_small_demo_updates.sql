-- Updates für bestehende Seed-/Demo-Daten (Small)
-- Ziel:
-- 1) Titel-Prefixe "Deal:" / "Referenz:" entfernen
-- 2) Accounts "Import (Entwürfe)" + "Führendes Sonstige-Unternehmen" entfernen inkl. abhängiger Daten
-- 3) customer_challenge + our_solution für Referenzen deutlich verlängern (aus vorhandenen Stichworten wird Langtext)
--
-- Ausführung: Supabase SQL Editor (Service Role empfohlen)

begin;

-- ---------------------------------------------------------------------------
-- CONFIG (gleiche UUIDs wie im Seed)
-- ---------------------------------------------------------------------------
-- Dieses Skript nutzt absichtlich mehrere Statements (statt eines riesigen WITH),
-- damit alle Updates/Deletes im Supabase SQL Editor zuverlässig ausgeführt werden.

-- ---------------------------------------------------------------------------
-- 2) Ziel-Accounts bestimmen
-- ---------------------------------------------------------------------------
-- In einem ersten Schritt: Entfernen der zwei unerwünschten Accounts inkl. Abhängigkeiten.
with cfg as (
  select
    '0d21d70a-9fb3-42b4-840c-3d0d4834b98b'::uuid as admin_user_id
),
cfg2 as (
  select
    coalesce(
      (select p.organization_id from public.profiles p where p.id = cfg.admin_user_id),
      '11111111-1111-1111-1111-111111111111'::uuid
    ) as org_id
  from cfg
),
target_companies as (
  select c.id
  from cfg2
  join public.companies c on c.organization_id = cfg2.org_id
  where c.name in ('Import (Entwürfe)', 'Führendes Sonstige-Unternehmen')
),
target_deals as (
  select d.id
  from cfg2
  join public.deals d on d.organization_id = cfg2.org_id
  join target_companies tc on tc.id = d.company_id
),
target_refs as (
  select r.id
  from cfg2
  join public.references r on r.organization_id = cfg2.org_id
  join target_companies tc on tc.id = r.company_id
),
del_deal_references as (
  delete from public.deal_references dr
  where dr.deal_id in (select id from target_deals)
     or dr.reference_id in (select id from target_refs)
  returning 1
),
del_approvals as (
  delete from public.approvals a
  where a.reference_id in (select id from target_refs)
  returning 1
),
del_favorites as (
  delete from public.favorites f
  where f.reference_id in (select id from target_refs)
  returning 1
),
del_notification_reads as (
  delete from public.notification_reads nr
  where nr.evidence_event_id in (
    select ee.id
    from public.evidence_events ee
    where ee.organization_id = (select org_id from cfg2)
      and (ee.deal_id in (select id from target_deals) or ee.reference_id in (select id from target_refs))
  )
  returning 1
),
del_evidence_events as (
  delete from public.evidence_events ee
  where ee.organization_id = (select org_id from cfg2)
    and (ee.deal_id in (select id from target_deals) or ee.reference_id in (select id from target_refs))
  returning 1
),
del_deal_reference_requests as (
  delete from public.deal_reference_requests drr
  where drr.organization_id = (select org_id from cfg2)
    and drr.deal_id in (select id from target_deals)
  returning 1
),
del_deal_rfp_analyses as (
  delete from public.deal_rfp_analyses a
  where a.organization_id = (select org_id from cfg2)
    and a.deal_id in (select id from target_deals)
  returning 1
),
del_deals as (
  delete from public.deals d
  where d.organization_id = (select org_id from cfg2)
    and d.id in (select id from target_deals)
  returning 1
),
del_reference_assets as (
  delete from public.reference_assets ra
  where ra.reference_id in (select id from target_refs)
  returning 1
),
del_references as (
  delete from public.references r
  where r.organization_id = (select org_id from cfg2)
    and r.id in (select id from target_refs)
  returning 1
),
del_company_strategies as (
  delete from public.company_strategies cs
  where cs.company_id in (select id from target_companies)
  returning 1
),
del_company_roadmap as (
  delete from public.company_roadmap_projects crp
  where crp.company_id in (select id from target_companies)
  returning 1
),
del_stakeholders as (
  delete from public.stakeholders s
  where s.company_id in (select id from target_companies)
  returning 1
),
del_contacts as (
  delete from public.contact_persons cp
  where cp.organization_id = (select org_id from cfg2)
    and cp.company_id in (select id from target_companies)
  returning 1
),
del_external_contacts as (
  delete from public.external_contacts ec
  where ec.organization_id = (select org_id from cfg2)
    and ec.company_id in (select id from target_companies)
  returning 1
),
del_market_exec as (
  delete from public.market_signal_executive_events e
  where e.company_id in (select id from target_companies)
  returning 1
),
del_market_news as (
  delete from public.market_signal_account_news n
  where n.company_id in (select id from target_companies)
  returning 1
),
del_companies as (
  delete from public.companies c
  where c.organization_id = (select org_id from cfg2)
    and c.id in (select id from target_companies)
  returning id
)
select
  'remove_companies_ok' as step,
  (select count(*) from del_companies) as removed_companies;

-- ---------------------------------------------------------------------------
-- 1) Titel-Prefixe entfernen (als eigenes UPDATE)
-- ---------------------------------------------------------------------------
with cfg as (
  select '0d21d70a-9fb3-42b4-840c-3d0d4834b98b'::uuid as admin_user_id
),
cfg2 as (
  select coalesce(
    (select p.organization_id from public.profiles p where p.id = cfg.admin_user_id),
    '11111111-1111-1111-1111-111111111111'::uuid
  ) as org_id
  from cfg
),
upd_deal_titles as (
  update public.deals d
  set title = ltrim(regexp_replace(d.title, '^Deal:\s*', '', 'i'))
  from cfg2
  where d.organization_id = cfg2.org_id
    and d.title ilike 'Deal:%'
  returning d.id
),
upd_ref_titles as (
  update public.references r
  set title = ltrim(regexp_replace(r.title, '^Referenz:\s*', '', 'i'))
  from cfg2
  where r.organization_id = cfg2.org_id
    and r.title ilike 'Referenz:%'
  returning r.id
),
-- Entferne redundante Account-Namen am Titel-Anfang: "<Company> – <Rest>" oder "<Company> - <Rest>"
upd_deal_titles_strip_company as (
  update public.deals d
  set title = case
    when c.name is not null and d.title like c.name || ' – %'
      then substr(d.title, length(c.name) + 4)
    when c.name is not null and d.title like c.name || ' - %'
      then substr(d.title, length(c.name) + 4)
    else d.title
  end
  from cfg2
  join public.companies c on c.id = d.company_id
  where d.organization_id = cfg2.org_id
    and c.name is not null
    and (d.title like c.name || ' – %' or d.title like c.name || ' - %')
  returning d.id
),
upd_ref_titles_strip_company as (
  update public.references r
  set title = case
    when c.name is not null and r.title like c.name || ' – %'
      then substr(r.title, length(c.name) + 4)
    when c.name is not null and r.title like c.name || ' - %'
      then substr(r.title, length(c.name) + 4)
    else r.title
  end
  from cfg2
  join public.companies c on c.id = r.company_id
  where r.organization_id = cfg2.org_id
    and c.name is not null
    and (r.title like c.name || ' – %' or r.title like c.name || ' - %')
  returning r.id
)
select
  'titles_ok' as step,
  (select count(*) from upd_deal_titles) as updated_deal_titles,
  (select count(*) from upd_ref_titles) as updated_reference_titles,
  (select count(*) from upd_deal_titles_strip_company) as updated_deal_titles_stripped_company,
  (select count(*) from upd_ref_titles_strip_company) as updated_reference_titles_stripped_company;

-- ---------------------------------------------------------------------------
-- 3) Challenge/Solution verlängern (als eigenes UPDATE, idempotent via Marker)
-- ---------------------------------------------------------------------------
with cfg as (
  select '0d21d70a-9fb3-42b4-840c-3d0d4834b98b'::uuid as admin_user_id
),
cfg2 as (
  select coalesce(
    (select p.organization_id from public.profiles p where p.id = cfg.admin_user_id),
    '11111111-1111-1111-1111-111111111111'::uuid
  ) as org_id
  from cfg
),
upd_ref_longtext as (
  update public.references r
  set
    customer_challenge = trim(
      coalesce(nullif(r.customer_challenge, ''), '') ||
      case when coalesce(nullif(r.customer_challenge, ''), '') <> '' then E'\n\n' else '' end ||
      'Ausgangslage: Der Kunde stand vor mehreren parallel laufenden Initiativen und einer historisch gewachsenen Systemlandschaft. ' ||
      'Die relevanten Stakeholder (IT, Security, Fachbereiche und ggf. Einkauf) hatten unterschiedliche Zielbilder und Prioritäten. ' ||
      'Dadurch entstanden Reibungsverluste bei Entscheidungen, uneinheitliche Standards sowie eine erhöhte operative Komplexität. ' ||
      E'\n\n' ||
      'Konkrete Herausforderungen: Neben Zeitdruck und begrenzten Kapazitäten spielten Governance, Compliance und Nachvollziehbarkeit eine zentrale Rolle. ' ||
      'Wichtig war außerdem, messbare Verbesserungen zu erzielen (z. B. schnellere Bereitstellung, stabilerer Betrieb, geringeres Risiko) und dabei die Organisation mitzunehmen. ' ||
      'Bestehende Prozesse waren teilweise manuell, Daten lagen in Silos und Reporting war nicht konsistent.'
    ),
    our_solution = trim(
      coalesce(nullif(r.our_solution, ''), '') ||
      case when coalesce(nullif(r.our_solution, ''), '') <> '' then E'\n\n' else '' end ||
      'Vorgehen: Wir haben gemeinsam ein klares Zielbild erarbeitet, Abhängigkeiten sichtbar gemacht und die Umsetzung in priorisierte Arbeitspakete gegliedert. ' ||
      'Dabei wurde eine pragmatische Governance etabliert (Standards, Verantwortlichkeiten, Definition-of-Done), sodass Entscheidungen schneller und reproduzierbar getroffen werden konnten. ' ||
      E'\n\n' ||
      'Umsetzung: Mit wiederverwendbaren Blueprints, sauberer Dokumentation und Enablement haben wir Teams befähigt, neue Lösungen konsistent auszurollen. ' ||
      'Monitoring/Transparenz wurden von Beginn an berücksichtigt, um Betrieb und Security-Anforderungen nachhaltig abzudecken. ' ||
      'Ergebnis: Der Kunde erhielt eine skalierbare Basis, die weitere Ausbaustufen (z. B. Analytics, Automatisierung, neue Workloads) beschleunigt und Risiken reduziert.'
    ),
    updated_at = now()
  from cfg2
  where r.organization_id = cfg2.org_id
    and r.deleted_at is null
    and (
      position('Ausgangslage:' in coalesce(r.customer_challenge,'')) = 0
      or position('Vorgehen:' in coalesce(r.our_solution,'')) = 0
    )
  returning r.id
)
select
  'longtexts_ok' as step,
  (select count(*) from upd_ref_longtext) as updated_reference_longtexts;

commit;

