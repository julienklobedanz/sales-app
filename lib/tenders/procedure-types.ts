const TENDER_PROCEDURE_TYPES = [
  'open',
  'restricted',
  'negotiated_with_competition',
  'negotiated_without_competition',
  'competitive_dialogue',
  'innovation_partnership',
] as const

export type TenderProcedureType = (typeof TENDER_PROCEDURE_TYPES)[number]

const TENDER_PROCEDURE_TYPE_LABELS: Record<TenderProcedureType, string> = {
  open: 'Offenes Verfahren',
  restricted: 'Nicht offenes Verfahren',
  negotiated_with_competition: 'Verhandlungsverfahren mit Teilnahmewettbewerb',
  negotiated_without_competition: 'Verhandlungsverfahren ohne Teilnahmewettbewerb',
  competitive_dialogue: 'Wettbewerblicher Dialog',
  innovation_partnership: 'Innovationspartnerschaft',
}

export function isTenderProcedureType(value: string): value is TenderProcedureType {
  return (TENDER_PROCEDURE_TYPES as readonly string[]).includes(value)
}

export function tenderProcedureTypeLabel(
  value: string | null | undefined,
): string | null {
  if (!value || !isTenderProcedureType(value)) return null
  return TENDER_PROCEDURE_TYPE_LABELS[value]
}
