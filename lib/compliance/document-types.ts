export const COMPLIANCE_DOCUMENT_TYPES = [
  'iso_27001',
  'iso_14001',
  'iso_9001',
  'iso_22301',
  'bsi_c5_testat',
  'rechenzentrum_zertifikat',
  'tisax',
  'soc_2_type_i',
  'soc_2_type_ii',
  'handelsregisterauszug',
  'haftpflichtversicherung',
  'nachhaltigkeitszertifikat',
  'code_of_conduct',
] as const

export type ComplianceDocumentType = (typeof COMPLIANCE_DOCUMENT_TYPES)[number]

export const COMPLIANCE_DOCUMENT_TYPE_LABELS: Record<ComplianceDocumentType, string> = {
  iso_27001: 'ISO 27001',
  iso_14001: 'ISO 14001',
  iso_9001: 'ISO 9001',
  iso_22301: 'ISO 22301',
  bsi_c5_testat: 'C5-Testat (BSI)',
  rechenzentrum_zertifikat: 'Zertifizierung Rechenzentrum',
  tisax: 'TISAX-Zertifikat',
  soc_2_type_i: 'SOC 2 Report (Type I)',
  soc_2_type_ii: 'SOC 2 Report (Type II)',
  handelsregisterauszug: 'Handelsregisterauszug',
  haftpflichtversicherung: 'Haftpflichtversicherungsnachweis',
  nachhaltigkeitszertifikat: 'Nachhaltigkeitszertifikat',
  code_of_conduct: 'Code of Conduct',
}

/** Ältere Slugs in bestehenden Datensätzen — Anzeige bleibt lesbar. */
export const LEGACY_COMPLIANCE_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  soc_2: 'SOC 2',
  pen_test: 'Pen-Test-Report',
  gdpr_dpa: 'AVV / DPA',
  bsi_c5: 'C5-Testat (BSI)',
  other: 'Sonstiges',
}

export type ComplianceDocumentTypeOption = {
  slug: string
  label: string
  isSystem: boolean
  id?: string
}

export function isSystemComplianceDocumentType(slug: string): boolean {
  return (COMPLIANCE_DOCUMENT_TYPES as readonly string[]).includes(slug)
}

export function getSystemComplianceDocumentTypes(): ComplianceDocumentTypeOption[] {
  return COMPLIANCE_DOCUMENT_TYPES.map((slug) => ({
    slug,
    label: COMPLIANCE_DOCUMENT_TYPE_LABELS[slug],
    isSystem: true,
  }))
}

export function sortComplianceDocumentTypeOptions(
  types: ComplianceDocumentTypeOption[]
): ComplianceDocumentTypeOption[] {
  return [...types].sort((a, b) => a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }))
}

export function mergeComplianceDocumentTypeOptions(
  customRows: Array<{ id: string; slug: string; label: string }>
): ComplianceDocumentTypeOption[] {
  const custom: ComplianceDocumentTypeOption[] = customRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    isSystem: false,
  }))
  return sortComplianceDocumentTypeOptions([...getSystemComplianceDocumentTypes(), ...custom])
}

export function complianceDocumentTypeLabel(
  type: string,
  options?: ComplianceDocumentTypeOption[]
): string {
  const fromList = options?.find((o) => o.slug === type)?.label
  if (fromList) return fromList
  const system = COMPLIANCE_DOCUMENT_TYPE_LABELS[type as ComplianceDocumentType]
  if (system) return system
  if (LEGACY_COMPLIANCE_DOCUMENT_TYPE_LABELS[type]) return LEGACY_COMPLIANCE_DOCUMENT_TYPE_LABELS[type]
  return type.replace(/^custom_/, '').replace(/_/g, ' ')
}

export function slugFromComplianceTypeLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  return normalized ? `custom_${normalized}` : `custom_${Date.now()}`
}
