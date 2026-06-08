/** Kunden-Freigabe: Scope-Auswahl aus dem Freigabe-Panel (4 Sales-Stufen-Logik). */

export type CustomerApprovalType = 'named' | 'anonymous'

export type ReferenceCallFrequency = 'quarterly' | 'twice_yearly' | 'yearly'

export type CustomerApprovalScopeSelection = {
  approvalType: CustomerApprovalType
  namentlichPublic: boolean
  namentlichConfidential: boolean
  referenceCallsEnabled: boolean
  referenceCallFrequency: ReferenceCallFrequency
}

export const REFERENCE_CALL_FREQUENCY_OPTIONS: {
  value: ReferenceCallFrequency
  label: string
}[] = [
  { value: 'quarterly', label: '1x pro Quartal' },
  { value: 'twice_yearly', label: '2x pro Jahr' },
  { value: 'yearly', label: '1x pro Jahr' },
]

export function defaultCustomerApprovalScope(
  approvalType: CustomerApprovalType = 'named'
): CustomerApprovalScopeSelection {
  return {
    approvalType,
    namentlichPublic: false,
    namentlichConfidential: false,
    referenceCallsEnabled: false,
    referenceCallFrequency: 'yearly',
  }
}

export function resetNamedSubOptions(
  scope: CustomerApprovalScopeSelection
): CustomerApprovalScopeSelection {
  return {
    ...scope,
    namentlichPublic: false,
    namentlichConfidential: false,
    referenceCallsEnabled: false,
    referenceCallFrequency: 'yearly',
  }
}

/** Rekonstruiert die UI-Auswahl aus gespeicherten Spalten (Bearbeitungsmodus). */
export function customerApprovalScopeFromDb(row: {
  approval_scope_named_mention?: boolean | null
  approval_scope_anonymous_mention?: boolean | null
  approval_scope_logo_use?: boolean | null
  approval_scope_press_release?: boolean | null
  approval_scope_reference_call?: boolean | null
  approval_scope_confidential_sales?: boolean | null
  approval_reference_call_frequency?: string | null
}): CustomerApprovalScopeSelection {
  const isAnonymous =
    !!row.approval_scope_anonymous_mention && !row.approval_scope_named_mention
  const approvalType: CustomerApprovalType = isAnonymous ? 'anonymous' : 'named'
  const freq = row.approval_reference_call_frequency
  const validFreq = REFERENCE_CALL_FREQUENCY_OPTIONS.some((o) => o.value === freq)
    ? (freq as ReferenceCallFrequency)
    : 'yearly'
  return {
    approvalType,
    namentlichPublic: !!(row.approval_scope_logo_use || row.approval_scope_press_release),
    namentlichConfidential: !!row.approval_scope_confidential_sales,
    referenceCallsEnabled: !!row.approval_scope_reference_call,
    referenceCallFrequency: validFreq,
  }
}

/** Mappt die UI-Auswahl auf references-Spalten. */
export function customerApprovalScopeToDbPatch(
  scope: CustomerApprovalScopeSelection
): {
  approval_scope_named_mention: boolean
  approval_scope_anonymous_mention: boolean
  approval_scope_logo_use: boolean
  approval_scope_press_release: boolean
  approval_scope_reference_call: boolean
  approval_scope_confidential_sales: boolean
  approval_reference_call_frequency: ReferenceCallFrequency | null
} {
  const isNamed = scope.approvalType === 'named'
  return {
    approval_scope_named_mention: isNamed,
    approval_scope_anonymous_mention: scope.approvalType === 'anonymous',
    approval_scope_logo_use: isNamed && scope.namentlichPublic,
    approval_scope_press_release: isNamed && scope.namentlichPublic,
    approval_scope_reference_call: isNamed && scope.referenceCallsEnabled,
    approval_scope_confidential_sales: isNamed && scope.namentlichConfidential,
    approval_reference_call_frequency:
      isNamed && scope.referenceCallsEnabled ? scope.referenceCallFrequency : null,
  }
}
