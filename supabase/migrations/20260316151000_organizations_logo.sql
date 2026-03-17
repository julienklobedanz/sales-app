-- Optionales Branding-Logo pro Organisation

alter table public.organizations
  add column if not exists logo_url text;

