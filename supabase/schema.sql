-- Refstack Datenbankschema für Supabase (PostgreSQL)
-- Im Supabase Dashboard: SQL Editor → New query → einfügen und ausführen

-- Erweiterung für UUIDs (in Supabase meist schon aktiv)
create extension if not exists "uuid-ossp";

-- =============================================================================
-- Tabelle: companies
-- =============================================================================
create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  industry text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- Tabelle: references (Referenzen / Kundenreferenzen)
-- =============================================================================
create type reference_status as enum ('draft', 'pending', 'approved');

create table public.references (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  summary text,
  full_text text,
  industry text,
  country text,
  status reference_status not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_references_company_id on public.references(company_id);
create index idx_references_status on public.references(status);

-- =============================================================================
-- Tabelle: approvals (Freigaben für Referenzen)
-- =============================================================================
create type approval_status as enum ('pending', 'approved');

create table public.approvals (
  id uuid primary key default uuid_generate_v4(),
  reference_id uuid not null references public.references(id) on delete cascade,
  status approval_status not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_approvals_reference_id on public.approvals(reference_id);

-- Optional: Row Level Security (RLS) aktivieren, wenn du Zugriff pro User steuern willst
-- alter table public.companies enable row level security;
-- alter table public.references enable row level security;
-- alter table public.approvals enable row level security;
