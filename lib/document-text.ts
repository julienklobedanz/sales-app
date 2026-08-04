/**
 * Document text extraction — public facade (P1-7).
 *
 * Two entry paths (do not merge implementations here):
 *
 * 1) References / Bulk import
 *    `extractDataFromDocument` / `extractPlainTextFromBuffer` / `extractDataFromBuffer`
 *    → `lib/document-extraction.ts` (structured LLM extract + plain text from buffers)
 *
 * 2) RFP / DealDesk
 *    `extractRfpPlainTextFromFile` → `extractPlainTextFromFile` → pdf-text-extract / OCR
 *    (`lib/extract-rfp-plain-text.ts` → `lib/extract-document-plain-text.ts`)
 *
 * Prefer importing from this module so callers share one surface; deep imports remain valid.
 */

export {
  extractDataFromDocument,
  extractPlainTextFromBuffer,
  extractDataFromBuffer,
} from '@/lib/document-extraction'

export { extractRfpPlainTextFromFile } from '@/lib/extract-rfp-plain-text'

export {
  extractPlainTextFromFile,
  type ExtractPlainTextResult,
} from '@/lib/extract-document-plain-text'

export type {
  ExtractedReferenceData,
  ExtractDataFromDocumentResult,
} from '@/lib/references/extract-types'
