import type { CustomerApprovalScopeSelection } from '@/lib/references/customer-approval-scope'

export type QuickApprovalChoice = 'named' | 'anonymous' | 'none'

export const QUICK_APPROVAL_CARDS: {
  id: QuickApprovalChoice
  title: string
  description: string
}[] = [
  {
    id: 'named',
    title: 'Namentliche Freigabe',
    description:
      'Firmenname, Logo, Case Study & Zitate dürfen öffentlich genutzt werden.',
  },
  {
    id: 'anonymous',
    title: 'Anonyme Freigabe',
    description:
      'Informationen zu unserem Projekt dürfen als anonymisierter Branchen-Case genutzt werden (z.B. „Führendes Logistikunternehmen“).',
  },
  {
    id: 'none',
    title: 'Keine Freigabe',
    description:
      'Ich gebe die Referenz weder zur namentlichen, noch zur anonymen Nennung frei.',
  },
]

export function scopeToQuickChoice(scope: CustomerApprovalScopeSelection): QuickApprovalChoice {
  if (scope.approvalType === 'anonymous') return 'anonymous'
  return 'named'
}

export function quickChoiceToScope(
  choice: QuickApprovalChoice,
  referenceCallsEnabled: boolean
): CustomerApprovalScopeSelection | null {
  if (choice === 'none') return null
  if (choice === 'anonymous') {
    return {
      approvalType: 'anonymous',
      namentlichPublic: false,
      namentlichConfidential: false,
      referenceCallsEnabled,
      referenceCallFrequency: 'yearly',
    }
  }
  return {
    approvalType: 'named',
    namentlichPublic: true,
    namentlichConfidential: true,
    referenceCallsEnabled,
    referenceCallFrequency: 'yearly',
  }
}
