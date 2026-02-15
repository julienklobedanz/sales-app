-- RLS-Policies für Refstack
-- Im Supabase Dashboard: SQL Editor → New query → einfügen und ausführen
-- Führt den Fehler "new row violates row-level security policy" behoben.

-- =============================================================================
-- companies: eingeloggte User dürfen lesen und anlegen
-- =============================================================================
alter table public.companies enable row level security;

create policy "Authenticated users can read companies"
  on public.companies for select
  to authenticated
  using (true);

create policy "Authenticated users can insert companies"
  on public.companies for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update companies"
  on public.companies for update
  to authenticated
  using (true)
  with check (true);

-- =============================================================================
-- references: eingeloggte User dürfen lesen und anlegen
-- =============================================================================
alter table public.references enable row level security;

create policy "Authenticated users can read references"
  on public.references for select
  to authenticated
  using (true);

create policy "Authenticated users can insert references"
  on public.references for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update references"
  on public.references for update
  to authenticated
  using (true)
  with check (true);

-- =============================================================================
-- approvals (falls du die Tabelle später nutzt)
-- =============================================================================
alter table public.approvals enable row level security;

create policy "Authenticated users can read approvals"
  on public.approvals for select
  to authenticated
  using (true);

create policy "Authenticated users can insert approvals"
  on public.approvals for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update approvals"
  on public.approvals for update
  to authenticated
  using (true)
  with check (true);
