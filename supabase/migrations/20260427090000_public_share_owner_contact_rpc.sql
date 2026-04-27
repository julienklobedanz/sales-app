-- Öffentliche Kontaktkarte für geteilte Referenz-Links (Kundenansicht)
create or replace function public.get_public_portfolio_share_owner(p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile profiles%rowtype;
  v_name text;
  v_role text;
  v_avatar_url text;
  v_email text;
  v_phone text;
begin
  select e.created_by
  into v_user_id
  from evidence_events e
  where e.event_type = 'reference_shared'
    and (e.payload ->> 'slug') = p_slug
    and e.created_by is not null
  order by e.created_at asc
  limit 1;

  if v_user_id is null then
    return json_build_object('found', false);
  end if;

  select *
  into v_profile
  from profiles
  where id = v_user_id
  limit 1;

  if not found then
    return json_build_object('found', false);
  end if;

  v_name := nullif(trim(coalesce(v_profile.full_name, '')), '');
  v_role := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'position', to_jsonb(v_profile) ->> 'role', '')), '');
  v_avatar_url := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'avatar_url', '')), '');
  v_email := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'email', '')), '');
  v_phone := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'phone', to_jsonb(v_profile) ->> 'mobile', '')), '');

  return json_build_object(
    'found', true,
    'name', coalesce(v_name, 'RefStack Team'),
    'position', coalesce(v_role, 'Sales Ansprechpartner'),
    'avatar_url', v_avatar_url,
    'email', v_email,
    'phone', v_phone
  );
end;
$$;

grant execute on function public.get_public_portfolio_share_owner(text) to anon;
grant execute on function public.get_public_portfolio_share_owner(text) to authenticated;
