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
export function resolvePortfolioTitleBadge(referenceStatus: string | null | undefined): ApprovalBadge {
  const status = normalizeReferenceStatus(referenceStatus)

  if (status === 'internal_only') {
    return {
      label: 'Intern',
      className: 'border-slate-200 bg-slate-100/90 text-slate-700',
    }
  }

  if (status === 'anonymized') {
    return {
      label: 'Anonymisiert',
      className: 'border-slate-200 bg-slate-50 text-slate-800',
    }
  }

  if (status === 'approved') {
    return {
      label: 'Extern freigegeben',
      className: 'border-blue-200 bg-blue-500/10 text-blue-800',
    }
  }

  if (status === 'pending') {
    return {
      label: 'Freigabe ausstehend',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
    }
  }

  return {
    label: 'Entwurf',
    className: 'border-slate-200 bg-slate-50 text-slate-800',
  }
}

/** Titel-Kapsel nach abgeschlossener Kundenfreigabe (Scope). */
export function resolvePostCustomerApprovalTitleBadge(input: ApprovedScopeInput): ApprovalBadge {
  const named = input.approvalScopeNamedMention ?? true
  const anonymous = input.approvalScopeAnonymousMention ?? true

  if (!named && anonymous) {
    return {
      label: 'Anonymisiert',
      className: 'border-slate-200 bg-slate-50 text-slate-800',
    }
  }

  return {
    label: 'Extern freigegeben',
    className: 'border-blue-200 bg-blue-500/10 text-blue-800',
  }
}

export function approvedScopeBadge(input: ApprovedScopeInput): ApprovalBadge {
  const named = input.approvalScopeNamedMention ?? true
  const anonymous = input.approvalScopeAnonymousMention ?? true
  const refCall = input.approvalScopeReferenceCall ?? false

  if (input.referenceIsInternalOnly) {
    return {
      label: 'Nur intern nutzbar',
      className: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
    }
  }

  if (!named && anonymous) {
    return {
      label: 'Anonym freigegeben',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
    }
  }

  if (named) {
    if (refCall) {
      return {
        label: 'Freigabe mit Ref. Calls',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      }
    }
    return {
      label: 'Freigabe ohne Ref. Calls',
      className: 'border-sky-200 bg-sky-50 text-sky-900',
    }
  }

  return {
    label: 'Freigegeben',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
}

export function resolveInternalWorkflowBadge(internalApprovalStatus: string): ApprovalBadge {
  const internal = internalApprovalStatus.toLowerCase()
  switch (internal) {
    case 'approved_internal':
      return {
        label: 'Intern freigegeben',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      }
    case 'rejected_internal':
      return {
        label: 'Intern abgelehnt',
        className: 'border-red-200 bg-red-50 text-red-700',
      }
    case 'withdrawn_internal':
      return {
        label: 'Widerrufen',
        className: 'border-slate-200 bg-slate-100 text-slate-600',
      }
    default:
      return {
        label: 'Interne Prüfung ausstehend',
        className: 'border-sky-200 bg-sky-50 text-sky-800',
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
    input.referenceStatus
  )
  const customerRaw = String(input.customerApprovalStatus ?? '').toLowerCase()

  if (customer === 'pending') {
    return {
      label: 'Wartet auf Kundenfreigabe',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
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
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (customer === 'rejected' || customerRaw === 'rejected') {
    return {
      label: 'Vom Kunden abgelehnt',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (customer === 'expired' || customerRaw === 'expired') {
    return {
      label: 'Kundenfrist abgelaufen',
      className: 'border-orange-200 bg-orange-50 text-orange-800',
    }
  }

  if (internal !== 'withdrawn_internal' && internal !== 'rejected_internal') {
    return {
      label: 'Noch nicht gestartet',
      className: 'border-slate-200 bg-slate-100 text-slate-600',
    }
  }

  return null
}

const notStartedFreigabeBadge: ApprovalBadge = {
  label: 'Noch nicht gestartet',
  className: 'border-slate-200 bg-slate-100 text-slate-600',
}

/** Intern + Kunde in der Freigabestatus-Card (nach Workflow-Start). */
export function resolveWorkflowStatusBadges(
  input: WorkflowBadgesInput
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

/** Intern + Kunde in der Freigabestatus-Card (inkl. Entwurf vor/nach Widerruf). */
export function resolveFreigabestatusCardBadges(
  input: WorkflowBadgesInput
): { internal: ApprovalBadge; customer: ApprovalBadge } {
  const active = resolveWorkflowStatusBadges(input)
  if (active) {
    return {
      internal: active.internal,
      customer: active.customer ?? notStartedFreigabeBadge,
    }
  }
  return { internal: notStartedFreigabeBadge, customer: notStartedFreigabeBadge }
}

/** Einzel-Kapsel in der Card, bevor der Workflow gestartet wurde. */
export function resolvePreWorkflowCardBadge(input: PreWorkflowCardInput): ApprovalBadge {
  const status = input.referenceStatus.toLowerCase()

  if (input.canStartApproval && status === 'draft') {
    return {
      label: 'Entwurf',
      className: 'border-slate-200 bg-slate-100 text-slate-700',
    }
  }

  if (input.canStartApproval && (status === 'internal_only' || status === 'internal')) {
    return {
      label: 'Nur intern',
      className: 'border-slate-200 bg-slate-100 text-slate-700',
    }
  }

  return {
    label: 'Nicht angefragt',
    className: 'border-slate-200 bg-slate-100 text-slate-600',
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
export function resolveReferenceTitleBadge(input: ReferenceTitleBadgeInput): ApprovalBadge {
  const internal = String(input.internalApprovalStatus ?? '').toLowerCase()
  const customerRaw = String(input.customerApprovalStatus ?? '').toLowerCase()
  const customer = effectiveCustomerApprovalStatus(
    input.customerApprovalStatus,
    input.referenceStatus
  )
  const workflowStarted = Boolean(input.approvalRequestedAt?.trim())
  const referenceStatus = normalizeReferenceStatus(input.referenceStatus)

  if (internal === 'withdrawn_internal' && workflowStarted) {
    return {
      label: 'Widerrufen',
      className: 'border-slate-200 bg-slate-100/90 text-slate-600',
    }
  }

  if (customerRaw === 'revoked_by_customer') {
    return {
      label: 'Gesperrt',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (customer === 'rejected' || customerRaw === 'rejected') {
    return {
      label: 'Abgelehnt',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (customer === 'expired' || customerRaw === 'expired') {
    return {
      label: 'Frist abgelaufen',
      className: 'border-orange-200 bg-orange-50 text-orange-800',
    }
  }

  if (internal === 'rejected_internal' && workflowStarted) {
    return {
      label: 'Intern abgelehnt',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (customer === 'approved' || customerRaw === 'approved') {
    return resolvePostCustomerApprovalTitleBadge(input)
  }

  if (referenceStatus === 'approved') {
    return resolvePortfolioTitleBadge('approved')
  }

  return resolvePortfolioTitleBadge(input.referenceStatus)
}

export function getReferenceApprovalExplanation(input: ReferenceTitleBadgeInput): string {
  const internal = String(input.internalApprovalStatus ?? '').toLowerCase()
  const customerRaw = String(input.customerApprovalStatus ?? '').toLowerCase()
  const customer = effectiveCustomerApprovalStatus(
    input.customerApprovalStatus,
    input.referenceStatus
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
