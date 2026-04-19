-- Seed-Daten (Small) für RefStack
-- Ausführung: Supabase SQL Editor (empfohlen).
--
-- 1) Ersetze die drei User-UUIDs unten (aus auth.users.id).
-- 2) Optional: org_id anpassen (oder lassen).
-- 3) Dann komplett ausführen.
--
-- Hinweis: Dieses Script befüllt nur public.* Tabellen (keine auth.users).

begin;

-- ---------------------------------------------------------------------------
-- CLEANUP (DB leeren, aber Users/Profiles behalten)
-- ---------------------------------------------------------------------------
-- WICHTIG:
-- - `auth.users` wird hier nie angefasst.
-- - `public.profiles` soll bestehen bleiben (User-IDs bleiben stabil).
-- - `public.organizations` bleibt bestehen, damit `profiles.organization_id` nicht ins Leere zeigt.
--
-- Hinweis: Dieses TRUNCATE ist für Ausführung im Supabase SQL Editor gedacht (Service Role).
truncate table
  public.alert_reads,
  public.approvals,
  public.company_roadmap_projects,
  public.company_strategies,
  public.contact_persons,
  public.deal_reference_requests,
  public.deal_references,
  public.deal_rfp_analyses,
  public.deals,
  public.evidence_events,
  public.executive_briefings,
  public.external_contacts,
  public.favorites,
  public.high_impact_alerts,
  public.invitations,
  public.market_signal_account_news,
  public.market_signal_executive_events,
  public.notification_reads,
  public.organization_invites,
  public.reference_assets,
  public.references,
  public.shared_portfolios,
  public.stakeholders,
  public.tickets
  -- companies behalten wir (z. B. Brandfetch-Enrichment)
  -- public.companies
restart identity cascade;

-- ---------------------------------------------------------------------------
-- CONFIG
-- ---------------------------------------------------------------------------
-- TODO: Diese UUIDs ersetzen:
--  - Admin:           auth.users.id
--  - Account Manager: auth.users.id
--  - Sales Rep:       auth.users.id
with cfg as (
  select
    '0d21d70a-9fb3-42b4-840c-3d0d4834b98b'::uuid as admin_user_id,
    'e9f31c6a-a436-4f19-b0a8-24c5c790419d'::uuid as am_user_id,
    '6dcc7af7-63be-4fbe-baa4-6adbefe2a7f1'::uuid as sales_user_id
),
cfg2 as (
  select
    -- Org wird aus dem Admin-Profil übernommen (damit wir in eurem echten Workspace seed-en).
    coalesce(
      (select p.organization_id from public.profiles p where p.id = cfg.admin_user_id),
      '11111111-1111-1111-1111-111111111111'::uuid
    ) as org_id,
    cfg.admin_user_id,
    cfg.am_user_id,
    cfg.sales_user_id
  from cfg
),

-- ---------------------------------------------------------------------------
-- ORG + PROFILES
-- ---------------------------------------------------------------------------
org as (
  insert into public.organizations (id, name, created_at, updated_at, export_settings)
  select
    cfg2.org_id,
    'RefStack Demo Workspace',
    now() - interval '20 days',
    now() - interval '1 day',
    '{}'::jsonb
  from cfg2
  on conflict (id) do update set
    name = excluded.name,
    updated_at = excluded.updated_at
  returning id
),
profiles_upsert as (
  insert into public.profiles (id, full_name, role, organization_id, created_at)
  select cfg2.admin_user_id, 'Alex Admin', 'admin'::public.user_role, cfg2.org_id, now() - interval '20 days' from cfg2
  union all
  select cfg2.am_user_id, 'Mara Account Manager', 'account_manager'::public.user_role, cfg2.org_id, now() - interval '18 days' from cfg2
  union all
  select cfg2.sales_user_id, 'Sam Sales Rep', 'sales'::public.user_role, cfg2.org_id, now() - interval '15 days' from cfg2
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    organization_id = excluded.organization_id
  returning id
),

-- ---------------------------------------------------------------------------
-- COMPANIES (10)
-- ---------------------------------------------------------------------------
companies as (
  select c.id, c.name, c.industry
  from cfg2
  join public.companies c on c.organization_id = cfg2.org_id
  order by c.is_favorite desc nulls last, c.updated_at desc nulls last, c.created_at desc nulls last
  limit 10
),
companies_ranked as (
  select
    c.*,
    row_number() over (order by c.name) as rn,
    count(*) over () as cnt
  from companies c
),

-- ---------------------------------------------------------------------------
-- CONTACTS (intern) + EXTERNAL_CONTACTS (kundenkontakte)
-- ---------------------------------------------------------------------------
contact_persons as (
  insert into public.contact_persons (
    organization_id, company_id, first_name, last_name, email, position, phone, linkedin_url, role, created_at, updated_at
  )
  select
    cfg2.org_id,
    co.id,
    p.first_name,
    p.last_name,
    lower(p.first_name || '.' || p.last_name || '@refstack.local'),
    p.position,
    p.phone,
    p.linkedin,
    p.role,
    now() - (p.age_days || ' days')::interval,
    now() - interval '1 day'
  from cfg2
  join (
    select * from companies order by name limit 5
  ) co on true
  join lateral (
    values
      ('Lena','Klein','Account Manager','+49 151 1000001','https://linkedin.example/lena','am_owner', 12),
      ('Tom','Schneider','Delivery Lead','+49 151 1000002','https://linkedin.example/tom','delivery', 9)
  ) as p(first_name,last_name,position,phone,linkedin,role,age_days) on true
  returning id, company_id, first_name, last_name
),
external_contacts as (
  insert into public.external_contacts (
    organization_id, company_id, first_name, last_name, email, role, created_at, updated_at
  )
  select
    cfg2.org_id,
    co.id,
    e.first_name,
    e.last_name,
    lower(e.first_name || '.' || e.last_name || '@' || replace(replace(co.name,' ','') ,'.','') || '.example'),
    e.role,
    now() - (e.age_days || ' days')::interval,
    now() - interval '1 day'
  from cfg2
  join (
    select * from companies order by name limit 5
  ) co on true
  join lateral (
    values
      ('Thomas','Müller','CIO', 14),
      ('Sarah','Kraus','CFO', 11)
  ) as e(first_name,last_name,role,age_days) on true
  returning id, company_id, first_name, last_name
),

-- ---------------------------------------------------------------------------
-- REFERENCES (15)
-- ---------------------------------------------------------------------------
refs as (
  insert into public.references (
    organization_id,
    company_id,
    title,
    summary,
    industry,
    country,
    created_at,
    updated_at,
    created_by,
    status,
    tags,
    customer_challenge,
    our_solution,
    volume_eur,
    customer_approval_status,
    approval_requested_at,
    approval_requested_by,
    customer_contact_id
  )
  select
    cfg2.org_id,
    co.id,
    r.title,
    r.summary,
    co.industry,
    'Deutschland',
    now() - (r.age_days || ' days')::interval,
    now() - interval '1 day',
    cfg2.am_user_id,
    r.status::public.reference_status,
    r.tags,
    r.challenge,
    r.solution,
    r.volume,
    r.customer_approval_status,
    case when r.customer_approval_status = 'pending' then now() - interval '3 days' else null end,
    case when r.customer_approval_status = 'pending' then cfg2.am_user_id else null end,
    case when r.customer_approval_status = 'pending' then (select id from external_contacts ec where ec.company_id = co.id limit 1) else null end
  from cfg2
  join generate_series(1, 15) gs(n) on true
  join companies_ranked co
    on co.rn = (((gs.n - 1) % co.cnt) + 1)
  join lateral (
    select
      ('Referenz: ' || co.name || ' – ' ||
        (array['Cloud-Migration','Security-Hardening','Data Platform','CRM-Konsolidierung','IoT Rollout','SAP-Modernisierung'])[1 + (gs.n % 6)]
      ) as title,
      (array[
        'Erfolgreich umgesetzt; messbare Verbesserungen in Time-to-Market und Betrieb.',
        'Konsolidierung und Standardisierung mit klarer Governance.',
        'Skalierbare Plattform als Basis für Analytics und KI.',
        'Stabilisierung und Modernisierung unter Compliance-Anforderungen.'
      ])[1 + (gs.n % 4)] as summary,
      (case
        when gs.n % 5 = 0 then 'draft'
        when gs.n % 5 = 1 then 'internal_only'
        when gs.n % 5 = 2 then 'approved'
        when gs.n % 5 = 3 then 'external'
        else 'approved'
      end) as status,
      (array['cloud,landing-zone','security,zero-trust','data,lakehouse','crm,mdm','iot,analytics','sap,governance'])[1 + (gs.n % 6)] as tags,
      (array[
        'Heterogene Tool-Landschaft, steigende Compliance-Anforderungen.',
        'Langsame Delivery, fehlende Standardisierung und Transparenz.',
        'Daten-Silos und manuelle Prozesse bremsen Entscheidungen.',
        'Sicherheits- und Audit-Anforderungen erfordern neue Kontrollen.'
      ])[1 + (gs.n % 4)] as challenge,
      (array[
        'Landing Zone, Governance, Migration und Enablement.',
        'Zero-Trust-Blueprint, SIEM/Monitoring und Reporting.',
        'Lakehouse, Streaming-Pipelines und Self-Service BI.',
        'CRM/MDM Harmonisierung inkl. Datenqualität & Prozesse.'
      ])[1 + (gs.n % 4)] as solution,
      (array['800000','1200000','1800000','2500000','3000000','5000000'])[1 + (gs.n % 6)] as volume,
      (case when gs.n % 7 = 0 then 'pending' else null end) as customer_approval_status,
      (10 + (gs.n % 35))::int as age_days
  ) as r on true
  returning id, company_id, title, status, created_by
),

-- ---------------------------------------------------------------------------
-- APPROVALS (8) – passend zu pending/external refs
-- ---------------------------------------------------------------------------
approvals as (
  insert into public.approvals (reference_id, status, created_at, updated_at, requester_id)
  select
    r.id,
    case when r.status::text in ('external') then 'pending'::public.approval_status else 'approved'::public.approval_status end,
    now() - interval '4 days',
    now() - interval '2 days',
    cfg2.am_user_id
  from cfg2
  join refs r on true
  where r.status::text in ('external')
  returning id, reference_id
),

-- ---------------------------------------------------------------------------
-- DEALS (10) + DEAL_REFERENCES
-- ---------------------------------------------------------------------------
deals as (
  insert into public.deals (
    organization_id,
    title,
    company_id,
    industry,
    volume,
    is_public,
    account_manager_id,
    sales_manager_id,
    status,
    expiry_date,
    created_at,
    updated_at,
    requirements_text
  )
  select
    cfg2.org_id,
    ('Deal: ' || co.name || ' – ' ||
      (array['RFP Cloud','Verhandlung Security','Pipeline Data','Renewal/Expansion','Discovery Workshop'])[1 + (gs.n % 5)]
    ) as title,
    co.id,
    co.industry,
    (array['800000','1200000','1800000','2500000','3000000','5000000'])[1 + (gs.n % 6)] as volume,
    true,
    cfg2.am_user_id,
    cfg2.sales_user_id,
    (array['open','rfp','negotiation','won','lost'])[1 + (gs.n % 5)] as status,
    (current_date + (10 + (gs.n % 60))) as expiry_date,
    now() - ((5 + gs.n)::text || ' days')::interval as created_at,
    now() - interval '1 day' as updated_at,
    (array[
      'Security-first, Governance und klare Milestones.',
      'RFP: Anforderungen, Compliance, Datenqualität.',
      'Zielbild, Architektur und Migration in Wellen.',
      'Workshop zur Priorisierung und Scope-Schärfung.'
    ])[1 + (gs.n % 4)] as requirements_text
  from cfg2
  join generate_series(1, 10) gs(n) on true
  join companies_ranked co
    on co.rn = (((gs.n - 1) % co.cnt) + 1)
  returning id, company_id, title, status
),
deal_refs as (
  insert into public.deal_references (deal_id, reference_id, similarity_score)
  select
    de.id,
    r.id,
    case
      when de.title ilike '%Pharma%' then 0.92
      when de.title ilike '%Security%' then 0.87
      when de.title ilike '%Data%' then 0.81
      else 0.72
    end
  from deals de
  join refs r on true
  where r.company_id = de.company_id
  returning deal_id, reference_id
),

-- ---------------------------------------------------------------------------
-- MARKET SIGNALS (Executive + News)
-- ---------------------------------------------------------------------------
exec_events as (
  insert into public.market_signal_executive_events (
    company_id, person_name, person_title_before, person_title_after, change_summary, detected_at, created_by, created_at
  )
  select
    co.id,
    e.person,
    e.before,
    e.after,
    e.summary,
    now() - (e.age_days || ' days')::interval,
    cfg2.am_user_id,
    now() - (e.age_days || ' days')::interval
  from cfg2
  join (select * from companies order by name limit 3) co on true
  join lateral (
    values
      ('Thomas Müller','CPO','CTO','wurde CEO → jetzt CTO gewechselt', 2),
      ('Sarah K.','CFO',null,'neu eingestellt als VP Finance', 5)
  ) as e(person,before,after,summary,age_days) on true
  returning id
),
news as (
  insert into public.market_signal_account_news (
    company_id, body, source_label, published_on, segment, created_by, created_at
  )
  select
    co.id,
    n.body,
    n.source,
    current_date - n.age_days,
    n.segment,
    cfg2.am_user_id,
    now() - (n.age_days || ' days')::interval
  from cfg2
  join (select * from companies order by name limit 4) co on true
  join lateral (
    values
      ('Expansion nach Schweiz geplant — SAP-Rollout Q3','Pressemitteilung','customer',0),
      ('Q2-Ergebnisse: IT-Budget erhöht um 15%','Earnings Call','customer',1),
      ('Neuer CRM-Rollout für DACH angekündigt','Blog','customer',3),
      ('Finanzierungsrunde Serie B abgeschlossen','TechCrunch','prospect',4)
  ) as n(body,source,segment,age_days) on true
  returning id
),

-- ---------------------------------------------------------------------------
-- SHARED_PORTFOLIOS + EVIDENCE_EVENTS (für Dashboards)
-- ---------------------------------------------------------------------------
portfolios as (
  insert into public.shared_portfolios (slug, reference_ids, is_active, view_count, created_at)
  select
    'demo-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 10),
    array[(select id from refs limit 1)]::uuid[],
    true,
    (random() * 30)::int,
    now() - interval '2 days'
  from generate_series(1, 5)
  returning id, slug, reference_ids, view_count, created_at
),
events as (
  insert into public.evidence_events (
    organization_id,
    deal_id,
    reference_id,
    event_type,
    payload,
    created_by,
    created_at
  )
  select
    cfg2.org_id,
    null::uuid,
    r.id,
    'reference_viewed',
    '{}'::jsonb,
    cfg2.sales_user_id,
    now() - interval '3 days'
  from cfg2 join refs r on true
  union all
  select cfg2.org_id, null::uuid, r.id, 'reference_shared', jsonb_build_object('slug','seed'), cfg2.sales_user_id, now() - interval '2 days'
  from cfg2 join refs r on true
  union all
  select cfg2.org_id, null::uuid, r.id, 'reference_matched', jsonb_build_object('matched_reference_ids', jsonb_build_array(r.id::text)), cfg2.sales_user_id, now() - interval '1 day'
  from cfg2 join refs r on true
  union all
  select cfg2.org_id, (select id from deals where status in ('won','lost') limit 1), null::uuid, 'deal_won', jsonb_build_object('comment','Seed: Deal Outcome'), cfg2.sales_user_id, now() - interval '6 days'
  from cfg2
  returning id
)
select 'seed_ok' as result;

commit;

