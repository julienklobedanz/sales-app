import { deriveReferenceGiverNameFromEmail } from '@/lib/references/derive-reference-giver-name-from-email'

export function formatApprovalGiverLine(
  name: string | null | undefined,
  title: string | null | undefined
): string | null {
  const trimmedName = String(name ?? '').trim()
  const trimmedTitle = String(title ?? '').trim()
  if (trimmedName && trimmedTitle) return `${trimmedName} · ${trimmedTitle}`
  return trimmedName || trimmedTitle || null
}

/** Aktueller E-Mail-Empfänger nach Delegation (Freigebender Kunde bleibt unverändert). */
export function formatApprovalDelegatedRecipientLine(
  delegateName: string | null | undefined,
  delegateEmail: string | null | undefined
): string | null {
  const name = String(delegateName ?? '').trim()
  const email = String(delegateEmail ?? '').trim()
  if (name && email) return `${name} (${email})`
  return name || email || null
}

export function resolveApprovalCoordinatorDisplay(input: {
  customerFacingName?: string | null
  coordinatorName?: string | null
  coordinatorEmail?: string | null
}): string | null {
  const customerFacing = String(input.customerFacingName ?? '').trim()
  if (customerFacing) return customerFacing

  const coordinatorName = String(input.coordinatorName ?? '').trim()
  if (coordinatorName) return coordinatorName

  const coordinatorEmail = String(input.coordinatorEmail ?? '').trim()
  if (!coordinatorEmail) return null
  return deriveReferenceGiverNameFromEmail(coordinatorEmail) ?? coordinatorEmail
}

export function resolveCustomerApprovalIntro(input: {
  customerFacingName?: string | null
  coordinatorName?: string | null
  orgName: string
}): { mode: 'person' | 'org'; personName: string | null; orgName: string } {
  const orgName = String(input.orgName ?? '').trim() || 'unserem Partner'
  const personName =
    String(input.customerFacingName ?? '').trim() ||
    String(input.coordinatorName ?? '').trim() ||
    null

  if (personName) {
    return { mode: 'person', personName, orgName }
  }
  return { mode: 'org', personName: null, orgName }
}
