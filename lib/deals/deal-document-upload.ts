import type { DealDocumentKind } from '@/lib/deals/deal-document-kinds'

/** Ablage-Limit (Bucket + Server-Validierung). */
export const DEAL_DOCUMENT_STORAGE_MAX_BYTES = 25 * 1024 * 1024

/** Limit für analysierbare Ausschreibungs-Docs (Extraktion). */
export const DEAL_DOCUMENT_ANALYZABLE_MAX_BYTES = 4.5 * 1024 * 1024

const DEAL_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'image/png',
  'image/jpeg',
])

const ANALYZABLE_EXTENSIONS = /\.(pdf|docx|pptx)$/i

export function sanitizeDealDocumentFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180)
  return base || 'upload.bin'
}

export function buildDealDocumentStoragePath(
  orgId: string,
  dealId: string,
  docId: string,
  fileName: string,
): string {
  return `${orgId}/deals/${dealId}/${docId}/${sanitizeDealDocumentFileName(fileName)}`
}

function fileMatchesAllowedMime(file: Pick<File, 'name' | 'type'>): boolean {
  const mime = (file.type ?? '').trim().toLowerCase()
  if (mime && DEAL_DOCUMENT_ALLOWED_MIME_TYPES.has(mime)) return true
  const lower = file.name.toLowerCase()
  return (
    lower.endsWith('.pdf') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.pptx') ||
    lower.endsWith('.ppt') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg')
  )
}

function isAnalyzableUpload(file: Pick<File, 'name' | 'type'>): boolean {
  const mime = (file.type ?? '').trim().toLowerCase()
  if (
    mime === 'application/pdf' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return true
  }
  return ANALYZABLE_EXTENSIONS.test(file.name)
}

export type ValidateDealDocumentUploadResult = { success: true } | { success: false; error: string }

export function validateDealDocumentUpload(
  file: Pick<File, 'name' | 'type' | 'size'>,
  kind: DealDocumentKind,
): ValidateDealDocumentUploadResult {
  if (!file.size) {
    return { success: false, error: 'Keine gültige Datei.' }
  }

  if (!fileMatchesAllowedMime(file)) {
    return { success: false, error: 'Dateityp wird nicht unterstützt.' }
  }

  const maxBytes =
    kind === 'ausschreibung'
      ? DEAL_DOCUMENT_ANALYZABLE_MAX_BYTES
      : DEAL_DOCUMENT_STORAGE_MAX_BYTES

  if (file.size > maxBytes) {
    const maxMb = (maxBytes / 1024 / 1024).toFixed(1)
    const actualMb = (file.size / 1024 / 1024).toFixed(1)
    return {
      success: false,
      error: `Datei zu groß (max. ${maxMb} MB). Aktuell: ${actualMb} MB.`,
    }
  }

  if (kind === 'ausschreibung' && !isAnalyzableUpload(file)) {
    return {
      success: false,
      error: 'Ausschreibungen müssen PDF, DOCX oder PPTX sein (für Analyse).',
    }
  }

  return { success: true }
}
