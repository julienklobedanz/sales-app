-- Miller-Heiman-Rolle für Ansprechpartner aus Referenzen (Buying Center / Strategie-Tab).
ALTER TABLE public.external_contacts
  ADD COLUMN IF NOT EXISTS buying_center_role text;

COMMENT ON COLUMN public.external_contacts.buying_center_role IS
  'Buying-Center-Rolle (economic_buyer, champion, technical_buyer, user_buyer, blocker, unknown). Jobtitel bleibt in role.';
