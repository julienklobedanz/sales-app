-- Themen-Tags für Smart-Matching von Roadmap-Projekten mit Referenzen
ALTER TABLE public.company_roadmap_projects ADD COLUMN IF NOT EXISTS tags text;
