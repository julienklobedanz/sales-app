-- Launch readiness checks for target Supabase environment (staging/prod).
-- Run in Supabase SQL Editor against the target project.

-- 1) Migration footprint (key columns/tables expected by app pages)
select 'profiles.phone' as check_name,
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='profiles' and column_name='phone'
       ) as ok
union all
select 'profiles.booking_url',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='profiles' and column_name='booking_url'
       )
union all
select 'company_strategies.metrics_pain',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='company_strategies' and column_name='metrics_pain'
       )
union all
select 'company_strategies.mh_assessment',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='company_strategies' and column_name='mh_assessment'
       )
union all
select 'stakeholders.last_interaction_at',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='stakeholders' and column_name='last_interaction_at'
       )
union all
select 'contact_persons.last_interaction_at',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='contact_persons' and column_name='last_interaction_at'
       )
union all
select 'external_contacts.last_interaction_at',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='external_contacts' and column_name='last_interaction_at'
       )
union all
select 'deals.salesforce_opportunity_id',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='deals' and column_name='salesforce_opportunity_id'
       )
union all
select 'deals.crm_source',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='deals' and column_name='crm_source'
       )
union all
select 'deals.crm_synced_at',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='deals' and column_name='crm_synced_at'
       )
union all
select 'deal_desk_projects',
       exists (
         select 1 from information_schema.tables
         where table_schema='public' and table_name='deal_desk_projects'
       )
union all
select 'deal_desk_documents',
       exists (
         select 1 from information_schema.tables
         where table_schema='public' and table_name='deal_desk_documents'
       )
union all
select 'companies.is_favorite',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='companies' and column_name='is_favorite'
       );

-- 1b) Storage bucket for Deal Desk / RFP uploads
select id, name, public
from storage.buckets
where id = 'rfp-documents';

-- 2) Critical RPC/function availability
select p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and p.proname in (
    'get_invite_by_token',
    'get_public_portfolio',
    'get_public_portfolio_branding',
    'get_public_portfolio_share_owner',
    'increment_portfolio_views',
    'log_share_link_viewed',
    'complete_client_approval'
  )
order by p.proname;

-- 3) RLS enabled on core tables
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname='public'
  and tablename in (
    'profiles',
    'companies',
    'references',
    'deals',
    'contact_persons',
    'external_contacts',
    'favorites',
    'tickets',
    'audit_logs',
    'company_strategies',
    'stakeholders',
    'shared_portfolios',
    'deal_desk_projects',
    'deal_desk_documents'
  )
order by tablename;

-- 4) Policy footprint (quick drift indicator)
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname='public'
  and tablename in (
    'profiles',
    'companies',
    'references',
    'deals',
    'contact_persons',
    'external_contacts',
    'favorites',
    'tickets',
    'audit_logs',
    'company_strategies',
    'stakeholders',
    'shared_portfolios',
    'deal_desk_projects',
    'deal_desk_documents'
  )
order by tablename, policyname;
