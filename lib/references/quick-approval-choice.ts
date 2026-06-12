import type { CustomerApprovalScopeSelection } from '@/lib/references/customer-approval-scope'

export type QuickApprovalChoice = 'named' | 'anonymous' | 'changes_needed' | 'none'

export type QuickApprovalChoiceValue = QuickApprovalChoice | null

export type QuickApprovalCardTone = 'positive' | 'warning' | 'negative'

export const QUICK_APPROVAL_CARDS: {
  id: QuickApprovalChoice
  title: string
  description: string
  tone: QuickApprovalCardTone
}[] = [
  {
    id: 'named',
    title: 'Namentliche Freigabe',
    description:
      'Firmenname, Logo, Case Study & Zitate dürfen öffentlich genutzt werden.',
    tone: 'positive',
  },
  {
    id: 'anonymous',
    title: 'Anonyme Freigabe',
    description:
      'Informationen zu unserem Projekt dürfen als anonymisierter Branchen-Case genutzt werden (z.B. „Führendes Logistikunternehmen“).',
    tone: 'positive',
  },
  {
    id: 'changes_needed',
    title: 'Änderungen nötig vor Freigabe',
    description:
      'Inhaltliche Anpassungen sind erforderlich, bevor ich die Referenz freigeben kann.',
    tone: 'warning',
  },
  {
    id: 'none',
    title: 'Keine Freigabe',
    description:
      'Ich gebe die Referenz weder zur namentlichen, noch zur anonymen Nennung frei.',
    tone: 'negative',
  },
]

export function scopeToQuickChoice(
  scope: CustomerApprovalScopeSelection,
  options?: { hasChangeRequest?: boolean }
): QuickApprovalChoice {
  if (options?.hasChangeRequest) return 'changes_needed'
  if (scope.approvalType === 'anonymous') return 'anonymous'
  return 'named'
}

export function quickChoiceGrantsApproval(choice: QuickApprovalChoiceValue): boolean {
  return choice === 'named' || choice === 'anonymous'
}

export function quickChoiceToScope(
  choice: QuickApprovalChoiceValue,
  referenceCallsEnabled: boolean
): CustomerApprovalScopeSelection | null {
  if (!choice || choice === 'none' || choice === 'changes_needed') return null
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
