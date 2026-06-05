-- Fix: RLS auf company_strategies / stakeholders war in Ziel-DB aus (rowsecurity = false).
-- Policies aus 20250302160000 bleiben gültig; hier nur RLS wieder aktivieren.

ALTER TABLE public.company_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
