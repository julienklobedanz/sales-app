-- Baseline core tables that historically lived outside timestamped migrations
-- (manual schema.sql / Dashboard bootstrap). Required so CI can apply
-- migrations from an empty database (supabase start / migration up).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- App profile row linked to Supabase Auth (auth schema exists on supabase/postgres).
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  -- Legacy App-Rolle (später durch system_role/function_role ersetzt und gedroppt)
  role text DEFAULT 'sales',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  CREATE TYPE public.reference_status AS ENUM ('draft', 'pending', 'approved');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  full_text text,
  industry text,
  country text,
  website text,
  employee_count integer,
  volume_eur text,
  contract_type text,
  status public.reference_status NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_references_company_id ON public.references (company_id);
CREATE INDEX IF NOT EXISTS idx_references_status ON public.references (status);

DO $$
BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending', 'approved');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.references (id) ON DELETE CASCADE,
  status public.approval_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_reference_id ON public.approvals (reference_id);

-- Interne Ansprechpartner (historisch manuell; später organization_id per Org-Migration)
CREATE TABLE IF NOT EXISTS public.contact_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  created_at timestamptz DEFAULT now()
);
