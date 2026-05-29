export const NDA_TITLE_MIGRATION_HINT =
  'Bitte im Supabase SQL Editor ausführen: ALTER TABLE public.nda_agreements ADD COLUMN IF NOT EXISTS title text;'

export const NDA_AGREEMENT_SELECT_WITH_TITLE =
  'id, company_id, title, status, valid_until, notes, file_storage_path, file_name, document_version, signed_at, created_at, updated_at'

export const NDA_AGREEMENT_SELECT_BASE =
  'id, company_id, status, valid_until, notes, file_storage_path, file_name, document_version, signed_at, created_at, updated_at'

export function isMissingNdaTitleColumn(message: string | undefined): boolean {
  const m = String(message ?? '').toLowerCase()
  return m.includes("'title'") && m.includes('nda_agreements')
}
