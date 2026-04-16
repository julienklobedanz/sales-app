-- Epic 6: Share-Link Branding + Event-Tracking

-- 1) Branding-Farben auf Organisationsebene (Settings -> Export-Templates)
alter table public.organizations
  add column if not exists primary_color text,
  add column if not exists secondary_color text;

-- Defaults fuer bestehende Orgs
update public.organizations
set
  primary_color = coalesce(primary_color, '#0f172a'),
  secondary_color = coalesce(secondary_color, '#334155')
where primary_color is null or secondary_color is null;

-- 2) evidence_events um share_link_viewed erweitern
alter table public.evidence_events
  drop constraint if exists evidence_events_event_type_check;

alter table public.evidence_events
  add constraint evidence_events_event_type_check
  check (
    event_type in (
      'deal_won',
      'deal_lost',
      'deal_withdrawn',
      'reference_helped',
      'share_link_viewed'
    )
  );

-- 3) Branding fuer Public Microsite bereitstellen
create or replace function public.get_public_portfolio_branding(p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row shared_portfolios%rowtype;
  v_org organizations%rowtype;
  v_ref_id uuid;
begin
  select * into v_row
  from shared_portfolios
  where slug = p_slug and is_active = true;

  if not found or array_length(v_row.reference_ids, 1) is null then
    return json_build_object('found', false);
  end if;

  v_ref_id := v_row.reference_ids[1];

  select o.* into v_org
  from public."references" r
  join organizations o on o.id = r.organization_id
  where r.id = v_ref_id;

  if not found then
    return json_build_object('found', false);
  end if;

  return json_build_object(
    'found', true,
    'name', v_org.name,
    'logo_url', v_org.logo_url,
    'primary_color', coalesce(v_org.primary_color, '#0f172a'),
    'secondary_color', coalesce(v_org.secondary_color, '#334155')
  );
end;
$$;

-- 4) Public View Event fuer Share-Link loggen
create or replace function public.log_share_link_viewed(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row shared_portfolios%rowtype;
  v_ref_id uuid;
  v_org_id uuid;
begin
  select * into v_row
  from shared_portfolios
  where slug = p_slug and is_active = true;

  if not found or array_length(v_row.reference_ids, 1) is null then
    return;
  end if;

  v_ref_id := v_row.reference_ids[1];

  select organization_id into v_org_id
  from public."references"
  where id = v_ref_id;

  if v_org_id is null then
    return;
  end if;

  insert into evidence_events (
    organization_id,
    reference_id,
    event_type,
    payload,
    created_by
  ) values (
    v_org_id,
    v_ref_id,
    'share_link_viewed',
    jsonb_build_object(
      'slug', p_slug,
      'reference_ids', v_row.reference_ids
    ),
    null
  );
end;
$$;

grant execute on function public.get_public_portfolio_branding(text) to anon;
grant execute on function public.get_public_portfolio_branding(text) to authenticated;
grant execute on function public.log_share_link_viewed(text) to anon;
grant execute on function public.log_share_link_viewed(text) to authenticated;
