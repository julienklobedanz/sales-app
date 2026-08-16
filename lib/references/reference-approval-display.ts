import { statusTone } from '@/lib/ui/status-tone'
import { effectiveCustomerApprovalStatus } from '@/lib/references/effective-customer-approval'

/** Einheitliche Kapseln für Titel, Freigabestatus-Card und Listen. */

export type ApprovalBadge = {
  label: string
  className: string
}

export type ApprovedScopeInput = {
  approvalScopeNamedMention?: boolean | null
  approvalScopeAnonymousMention?: boolean | null
  approvalScopeReferenceCall?: boolean | null
  referenceIsInternalOnly?: boolean
}

export type WorkflowBadgesInput = {
  internalApprovalStatus: string
  customerApprovalStatus: string | null
  referenceStatus?: string | null
  approvalRequestedAt: string | null
  approvalScopeNamedMention?: boolean | null
  approvalScopeAnonymousMention?: boolean | null
  approvalScopeReferenceCall?: boolean | null
  approvalScopeConfidentialSales?: boolean | null
  approvalScopeLogoUse?: boolean | null
  referenceIsInternalOnly?: boolean
}

export type PreWorkflowCardInput = {
  referenceStatus: string
  canStartApproval: boolean
}

export type ReferenceTitleBadgeInput = ApprovedScopeInput & {
  referenceStatus?: string | null
  internalApprovalStatus?: string | null
  customerApprovalStatus?: string | null
  approvalRequestedAt?: string | null
}

/** Portfolio-Stufe für Titel-Kapsel (unabhängig vom laufenden Freigabe-Workflow). */
export function resolvePortfolioTitleBadge(
  referenceStatus: string | null | undefined,
): ApprovalBadge {
  const status = normalizeReferenceStatus(referenceStatus)

  if (status === 'internal_only') {
    return {
      label: 'Intern',
      className: statusTone.neutral,
    }
  }

  if (status === 'anonymized') {
    return {
      label: 'Anonymisiert',
      className: statusTone.neutral,
    }
  }

  if (status === 'approved') {
    return {
      label: 'Extern freigegeben',
      className: statusTone.info,
    }
  }

  if (status === 'pending') {
    return {
      label: 'Freigabe ausstehend',
      className: statusTone.warning,
    }
  }

  return {
    label: 'Entwurf',
    className: statusTone.neutral,
  }
}

/** Titel-Kapsel nach abgeschlossener Kundenfreigabe (Scope). */
export function resolvePostCustomerApprovalTitleBadge(
  input: ApprovedScopeInput,
): ApprovalBadge {
  const named = input.approvalScopeNamedMention ?? true
  const anonymous = input.approvalScopeAnonymousMention ?? true

  if (!named && anonymous) {
    return {
      label: 'Anonymisiert',
      className: statusTone.neutral,
    }
  }

  return {
    label: 'Extern freigegeben',
    className: statusTone.info,
  }
}

export function approvedScopeBadge(input: ApprovedScopeInput): ApprovalBadge {
  const named = input.approvalScopeNamedMention ?? true
  const anonymous = input.approvalScopeAnonymousMention ?? true
  const refCall = input.approvalScopeReferenceCall ?? false

  if (input.referenceIsInternalOnly) {
    return {
      label: 'Nur intern nutzbar',
      className: statusTone.success,
    }
  }

  if (!named && anonymous) {
    return {
      label: 'Anonym freigegeben',
      className: statusTone.warning,
    }
  }

  if (named) {
    if (refCall) {
      return {
        label: 'Freigabe mit Ref. Calls',
        className: statusTone.success,
      }
    }
    return {
      label: 'Freigabe ohne Ref. Calls',
      className: statusTone.info,
    }
  }

  return {
    label: 'Freigegeben',
    className: statusTone.success,
  }
}

export function resolveInternalWorkflowBadge(
  internalApprovalStatus: string,
): ApprovalBadge {
  const internal = internalApprovalStatus.toLowerCase()
  switch (internal) {
    case 'approved_internal':
      return {
        label: 'Intern freigegeben',
        className: statusTone.success,
      }
    case 'rejected_internal':
      return {
        label: 'Intern abgelehnt',
        className: statusTone.danger,
      }
    case 'withdrawn_internal':
      return {
        label: 'Widerrufen',
        className: statusTone.neutral,
      }
    default:
      return {
        label: 'Interne Prüfung ausstehend',
        className: statusTone.info,
      }
  }
}

export function resolveCustomerWorkflowBadge(input: {
  internalApprovalStatus: string
  customerApprovalStatus: string | null
  referenceStatus?: string | null
  approvalScopeNamedMention?: boolean | null
  approvalScopeAnonymousMention?: boolean | null
  approvalScopeReferenceCall?: boolean | null
  referenceIsInternalOnly?: boolean
}): ApprovalBadge | null {
  const internal = input.internalApprovalStatus.toLowerCase()
  const customer = effectiveCustomerApprovalStatus(
    input.customerApprovalStatus,
    input.referenceStatus,
  )
  const customerRaw = String(input.customerApprovalStatus ?? '').toLowerCase()

  if (customer === 'pending') {
    return {
      label: 'Wartet auf Kundenfreigabe',
      className: statusTone.warning,
    }
  }

  if (customer === 'approved') {
    return approvedScopeBadge({
      approvalScopeNamedMention: input.approvalScopeNamedMention,
      approvalScopeAnonymousMention: input.approvalScopeAnonymousMention,
      approvalScopeReferenceCall: input.approvalScopeReferenceCall,
      referenceIsInternalOnly: input.referenceIsInternalOnly,
    })
  }

  if (customer === 'revoked_by_customer' || customerRaw === 'revoked_by_customer') {
    return {
      label: 'Gesperrt',
      className: statusTone.danger,
    }
  }

  if (customer === 'rejected' || customerRaw === 'rejected') {
    return {
      label: 'Vom Kunden abgelehnt',
      className: statusTone.danger,
    }
  }

  if (customer === 'expired' || customerRaw === 'expired') {
    return {
      label: 'Kundenfrist abgelaufen',
      className: statusTone.warning,
    }
  }

  if (internal !== 'withdrawn_internal' && internal !== 'rejected_internal') {
    return {
      label: 'Noch nicht gestartet',
      className: statusTone.neutral,
    }
  }

  return null
}

const notStartedFreigabeBadge: ApprovalBadge = {
  label: 'Noch nicht gestartet',
  className: statusTone.neutral,
}

/** Intern + Kunde in der Freigabestatus-Card (nach Workflow-Start). */
export function resolveWorkflowStatusBadges(
  input: WorkflowBadgesInput,
): { internal: ApprovalBadge; customer: ApprovalBadge | null } | null {
  if (!input.approvalRequestedAt?.trim()) return null

  const internalBadge = resolveInternalWorkflowBadge(input.internalApprovalStatus)
  const customerBadge = resolveCustomerWorkflowBadge({
    internalApprovalStatus: input.internalApprovalStatus,
    customerApprovalStatus: input.customerApprovalStatus,
    referenceStatus: input.referenceStatus,
    approvalScopeNamedMention: input.approvalScopeNamedMention,
    approvalScopeAnonymousMention: input.approvalScopeAnonymousMention,
    approvalScopeReferenceCall: input.approvalScopeReferenceCall,
    referenceIsInternalOnly: input.referenceIsInternalOnly,
  })

  return { internal: internalBadge, customer: customerBadge }
}

const externNutzbarBadge: ApprovalBadge = {
  label: 'Extern nutzbar',
  className: statusTone.info,
}

/** Intern + Kunde in der Freigabestatus-Card (inkl. Entwurf vor/nach Widerruf). */
export function resolveFreigabestatusCardBadges(input: WorkflowBadgesInput): {
  internal: ApprovalBadge
  customer: ApprovalBadge
} {
  const active = resolveWorkflowStatusBadges(input)
  if (active) {
    return {
      internal: active.internal,
      customer: active.customer ?? notStartedFreigabeBadge,
    }
  }
  const portfolioApproved =
    normalizeReferenceStatus(input.referenceStatus) === 'approved'
  if (portfolioApproved) {
    return { internal: notStartedFreigabeBadge, customer: externNutzbarBadge }
  }
  return { internal: notStartedFreigabeBadge, customer: notStartedFreigabeBadge }
}

/** Einzel-Kapsel in der Card, bevor der Workflow gestartet wurde. */
export function resolvePreWorkflowCardBadge(input: PreWorkflowCardInput): ApprovalBadge {
  const status = input.referenceStatus.toLowerCase()

  if (input.canStartApproval && status === 'draft') {
    return {
      label: 'Entwurf',
      className: statusTone.neutral,
    }
  }

  if (input.canStartApproval && (status === 'internal_only' || status === 'internal')) {
    return {
      label: 'Nur intern',
      className: statusTone.neutral,
    }
  }

  return {
    label: 'Nicht angefragt',
    className: statusTone.neutral,
  }
}

function normalizeReferenceStatus(raw: string | null | undefined) {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'approved' || s === 'external') return 'approved'
  if (s === 'internal_only' || s === 'internal') return 'internal_only'
  if (s === 'anonymized' || s === 'anonymous') return 'anonymized'
  if (s === 'pending') return 'pending'
  return 'draft'
}

/** Titel-Badge und Listen — Portfolio-Stufe; Workflow nur bei Abschluss/Fehler. */
export function resolveReferenceTitleBadge(
  input: ReferenceTitleBadgeInput,
): ApprovalBadge {
  const internal = String(input.internalApprovalStatus ?? '').toLowerCase()
  const customerRaw = String(input.customerApprovalStatus ?? '').toLowerCase()
  const customer = effectiveCustomerApprovalStatus(
    input.customerApprovalStatus,
    input.referenceStatus,
  )
  const workflowStarted = Boolean(input.approvalRequestedAt?.trim())
  const referenceStatus = normalizeReferenceStatus(input.referenceStatus)

  if (internal === 'withdrawn_internal' && workflowStarted) {
    return {
      label: 'Widerrufen',
      className: statusTone.neutral,
    }
  }

  if (customerRaw === 'revoked_by_customer') {
    return {
      label: 'Gesperrt',
      className: statusTone.danger,
    }
  }

  if (customer === 'rejected' || customerRaw === 'rejected') {
    return {
      label: 'Abgelehnt',
      className: statusTone.danger,
    }
  }

  if (customer === 'expired' || customerRaw === 'expired') {
    return {
      label: 'Frist abgelaufen',
      className: statusTone.warning,
    }
  }

  if (internal === 'rejected_internal' && workflowStarted) {
    return {
      label: 'Intern abgelehnt',
      className: statusTone.danger,
    }
  }

  if (customerRaw === 'approved') {
    return resolvePostCustomerApprovalTitleBadge(input)
  }

  if (referenceStatus === 'approved' && !workflowStarted) {
    return {
      label: 'Extern nutzbar',
      className: statusTone.info,
    }
  }

  if (referenceStatus === 'approved') {
    return resolvePortfolioTitleBadge('approved')
  }

  return resolvePortfolioTitleBadge(input.referenceStatus)
}

export type UsabilityStatementInput = ReferenceTitleBadgeInput & {
  isNdaDeal?: boolean | null
  competitorBlacklist?: readonly string[] | null
}

export type UsabilityStatement = {
  text: string
  blacklist: string[]
}

function normalizeCompetitorBlacklist(
  raw: readonly string[] | null | undefined,
): string[] {
  return (raw ?? []).map((item) => item.trim()).filter(Boolean)
}

/**
 * Nutzbarkeit als eine Aussage (§10.2), inkl. NDA und Sperrliste.
 * Die Sperrliste ist keine Workflow-Metadate — sie gilt für jede Rolle.
 */
export function formatUsabilityStatement(
  input: UsabilityStatementInput,
): UsabilityStatement {
  const badge = resolveReferenceTitleBadge(input)
  const workflowStarted = Boolean(input.approvalRequestedAt?.trim())
  const referenceStatus = normalizeReferenceStatus(input.referenceStatus)
  const nda = Boolean(input.isNdaDeal)

  let text = badge.label
  if (referenceStatus === 'approved' && !workflowStarted) {
    text = 'Extern nutzbar — Freigabe außerhalb von RefStack'
  }
  if (nda) {
    text = `${text} — unter NDA`
  }

  return {
    text,
    blacklist: normalizeCompetitorBlacklist(input.competitorBlacklist),
  }
}

export function getReferenceApprovalExplanation(input: ReferenceTitleBadgeInput): string {
  const internal = String(input.internalApprovalStatus ?? '').toLowerCase()
  const customerRaw = String(input.customerApprovalStatus ?? '').toLowerCase()
  const customer = effectiveCustomerApprovalStatus(
    input.customerApprovalStatus,
    input.referenceStatus,
  )
  const workflowStarted = Boolean(input.approvalRequestedAt?.trim())
  const referenceStatus = normalizeReferenceStatus(input.referenceStatus)

  if (internal === 'withdrawn_internal' && workflowStarted) {
    return 'Die Freigabe-Anfrage wurde widerrufen. Der Freigabe-Workflow kann erneut gestartet werden.'
  }

  if (customerRaw === 'revoked_by_customer') {
    return 'Der Kunde hat die Freigabe gesperrt. Die Referenz ist nicht mehr extern nutzbar.'
  }

  if (customer === 'rejected' || customerRaw === 'rejected') {
    return 'Der Kunde hat die Freigabe abgelehnt. Der Workflow kann bei Bedarf neu gestartet werden.'
  }

  if (customer === 'expired' || customerRaw === 'expired') {
    return 'Die Frist für die Kundenfreigabe ist abgelaufen.'
  }

  if (internal === 'rejected_internal' && workflowStarted) {
    return 'Die interne Freigabe wurde abgelehnt. Der Workflow kann bei Bedarf neu gestartet werden.'
  }

  if (customer === 'approved' || customerRaw === 'approved') {
    const badge = resolvePostCustomerApprovalTitleBadge(input)
    if (badge.label === 'Anonymisiert') {
      return 'Anonymisiert: Kundenname und Logo sind entfernt – typisch für öffentliche Case Studies ohne konkrete Benennung.'
    }
    return 'Extern freigegeben: Vom Kunden freigegeben – geeignet für Pitches und Kundenunterlagen gemäß vereinbartem Nutzungsumfang.'
  }

  if (referenceStatus === 'approved') {
    return 'Extern freigegeben: Offiziell für Sales-Pitches und Kundenunterlagen freigegeben.'
  }

  if (referenceStatus === 'internal_only') {
    return 'Nur intern: Verifiziert, sensible Angaben (z. B. Namen, Preise) dürfen das Haus nicht verlassen. Der Freigabe-Fortschritt steht in der Freigabestatus-Card.'
  }

  if (referenceStatus === 'anonymized') {
    return 'Anonymisiert: Kundenname und Logo sind entfernt – typisch für öffentliche Case Studies ohne konkrete Benennung.'
  }

  if (referenceStatus === 'pending') {
    return 'Freigabe ausstehend: Die Referenz durchläuft noch den Freigabe- oder Prüfprozess.'
  }

  return 'Entwurf: In Bearbeitung, nur für berechtigte Personen sichtbar.'
}
