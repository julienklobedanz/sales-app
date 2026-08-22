export const NDA_TITLE_MIGRATION_HINT =
  'Bitte im Supabase SQL Editor ausführen: ALTER TABLE public.nda_agreements ADD COLUMN IF NOT EXISTS title text;'

export const NDA_FILE_STORAGE_MIGRATION_HINT =
  'Bitte Migration supabase/migrations/20260527140000_nda_documents_storage.sql in Supabase ausführen.'

export const NDA_AGREEMENT_SELECT_WITH_TITLE =
  'id, company_id, title, status, valid_until, notes, file_storage_path, file_name, document_version, signed_at, created_at, updated_at'

export const NDA_AGREEMENT_SELECT_BASE =
  'id, company_id, status, valid_until, notes, file_storage_path, file_name, document_version, signed_at, created_at, updated_at'

/** Schema vor NDA-PDF-Migration (20260527140000). */
export const NDA_AGREEMENT_SELECT_LEGACY_WITH_TITLE =
  'id, company_id, title, status, valid_until, notes, created_at, updated_at'

export const NDA_AGREEMENT_SELECT_LEGACY =
  'id, company_id, status, valid_until, notes, created_at, updated_at'

export function isMissingNdaColumn(message: string | undefined, column: string): boolean {
  const m = String(message ?? '').toLowerCase()
  return m.includes(`'${column}'`) && m.includes('nda_agreements')
}

export function isMissingNdaTitleColumn(message: string | undefined): boolean {
  return isMissingNdaColumn(message, 'title')
}

export function isMissingNdaFileStorageColumn(message: string | undefined): boolean {
  return (
    isMissingNdaColumn(message, 'file_storage_path') ||
    isMissingNdaColumn(message, 'file_name') ||
    isMissingNdaColumn(message, 'document_version') ||
    isMissingNdaColumn(message, 'signed_at')
  )
}
