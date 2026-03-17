-- Optionales Avatar-Bild pro Profil

alter table public.profiles
  add column if not exists avatar_url text;

