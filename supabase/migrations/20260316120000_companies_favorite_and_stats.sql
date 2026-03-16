-- Add is_favorite flag and cached stats to companies
alter table public.companies
  add column if not exists is_favorite boolean not null default false,
  add column if not exists open_deals_count integer not null default 0,
  add column if not exists contacts_count integer not null default 0;

