import { complianceDocumentTypeLabel, type ComplianceDocumentTypeOption } from './document-types'

export function sanitizeComplianceFileNamePart(value: string): string {
  return (
    String(value ?? '')
      .trim()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae')
      .replace(/Ö/g, 'Oe')
      .replace(/Ü/g, 'Ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 72) || 'Unbenannt'
  )
}

export function formatComplianceUploadDateStamp(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function buildComplianceStorageFileName(args: {
  organizationName: string
  documentType: string
  typeOptions?: ComplianceDocumentTypeOption[]
  uploadedAt?: Date
}): string {
  const orgPart = sanitizeComplianceFileNamePart(args.organizationName)
  const typeLabel = complianceDocumentTypeLabel(args.documentType, args.typeOptions)
  const typePart = sanitizeComplianceFileNamePart(typeLabel)
  const datePart = formatComplianceUploadDateStamp(args.uploadedAt)
  return `${orgPart}_${typePart}_${datePart}.pdf`
}

export function buildDefaultComplianceTitle(
  documentType: string,
  typeOptions?: ComplianceDocumentTypeOption[],
  year: number = new Date().getFullYear()
): string {
  const label = complianceDocumentTypeLabel(documentType, typeOptions)
  return `${label} ${year}`
}
