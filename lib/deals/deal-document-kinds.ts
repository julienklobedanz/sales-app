import type { Database } from '@/lib/database.types'

export type DealDocumentKind = Database['public']['Enums']['deal_document_kind']

export const DEAL_DOCUMENT_KINDS = [
  'ausschreibung',
  'nda',
  'vertrag',
  'angebot',
  'praesentation',
  'spezifikation',
  'notiz',
  'sonstiges',
] as const satisfies readonly DealDocumentKind[]

export const DEAL_DOCUMENT_KIND_LABELS: Record<DealDocumentKind, string> = {
  ausschreibung: 'Vergabeunterlage',
  nda: 'NDA',
  vertrag: 'Vertrag',
  angebot: 'Angebot',
  praesentation: 'Präsentation',
  spezifikation: 'Spezifikation',
  notiz: 'Notiz',
  sonstiges: 'Sonstiges',
}

export function isDealDocumentKind(value: string): value is DealDocumentKind {
  return (DEAL_DOCUMENT_KINDS as readonly string[]).includes(value)
}
