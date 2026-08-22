import { COMPLIANCE_DOCUMENT_TYPES } from '@/lib/compliance/document-types'

/** Offizielles ISO-Logo (blau auf weiß) für alle ISO-Zertifikate. */
export const ISO_BADGE_SRC = '/compliance/iso-badge.png'

const ISO_SYSTEM_SLUGS = new Set(
  COMPLIANCE_DOCUMENT_TYPES.filter((slug) => slug.startsWith('iso_')),
)

const ISO_SLUG_PATTERN = /^iso_\d{4,5}$/

function documentHaystack(doc: {
  title?: string | null
  file_name?: string | null
}): string {
  return [doc.title, doc.file_name].filter(Boolean).join(' ').toLowerCase()
}

/** System- oder künftige ISO-Slugs (z. B. iso_45001). */
function isIsoComplianceDocumentType(slug: string): boolean {
  const normalized = slug.trim().toLowerCase()
  return ISO_SLUG_PATTERN.test(normalized) || ISO_SYSTEM_SLUGS.has(normalized as never)
}

/**
 * Erkennt ISO-Zertifikate anhand Dokumenttyp, Titel oder Dateiname
 * (alle ISO-Normen, nicht nur 27001).
 */
function isIsoComplianceDocument(doc: {
  document_type: string
  title?: string | null
  file_name?: string | null
}): boolean {
  if (isIsoComplianceDocumentType(doc.document_type)) return true

  const hay = documentHaystack(doc)
  if (!hay) return false

  if (/\biso[\s\-_]?\d{4,5}\b/.test(hay)) return true
  if (/\biso[\s\-_]?27k\b/.test(hay)) return true

  return false
}

export function complianceDocumentUsesIsoBadge(doc: {
  document_type: string
  title?: string | null
  file_name?: string | null
}): boolean {
  return isIsoComplianceDocument(doc)
}

const ISO_NUMBER_DEFAULTS: Record<string, string> = {
  '27001': 'iso_27001',
  '14001': 'iso_14001',
  '9001': 'iso_9001',
  '22301': 'iso_22301',
}

/** Leitet aus Dateiname, Titel und optional PDF-Text einen Dokumenttyp-Slug ab. */
export function inferComplianceDocumentTypeFromUpload(input: {
  title: string
  fileName: string
  pdfText?: string
}): string | null {
  const hay = `${input.title} ${input.fileName} ${input.pdfText ?? ''}`.toLowerCase()

  const numbered = hay.match(/\biso[\s\-_]?(\d{4,5})\b/)
  if (numbered) {
    const num = numbered[1]
    return ISO_NUMBER_DEFAULTS[num] ?? `iso_${num}`
  }

  if (/\biso[\s\-_]?27k\b/.test(hay)) return 'iso_27001'
  if (/\biso\s*9001\b/.test(hay)) return 'iso_9001'
  if (/\biso\s*14001\b/.test(hay)) return 'iso_14001'
  if (/\biso\s*22301\b/.test(hay)) return 'iso_22301'
  if (/\biso\b/.test(hay)) return 'iso_27001'

  if (/\btisax\b/.test(hay)) return 'tisax'
  if (/\bsoc\s*2\b/.test(hay) && /type\s*ii\b/.test(hay)) return 'soc_2_type_ii'
  if (/\bsoc\s*2\b/.test(hay)) return 'soc_2_type_i'
  if (/\bc5[\s-]?(testat|zertifikat)\b/.test(hay) || /\bbsi\s*c5\b/.test(hay)) {
    return 'bsi_c5_testat'
  }
  if (/\brechenzentrum\b/.test(hay) || /\bdata\s*center\s*cert/i.test(hay)) {
    return 'rechenzentrum_zertifikat'
  }
  if (/\bhandelsregister\b/.test(hay)) return 'handelsregisterauszug'
  if (/\bhaftpflicht\b/.test(hay)) return 'haftpflichtversicherung'
  if (/\bcode\s+of\s+conduct\b/.test(hay)) return 'code_of_conduct'
  if (/\bnachhaltigkeit\b/.test(hay) || /\bsustainability\s+cert/i.test(hay)) {
    return 'nachhaltigkeitszertifikat'
  }

  return null
}
