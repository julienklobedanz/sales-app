import { formatReferenceDate } from '@/lib/format'

import type { CompanyAccountStatusValue } from './company-account-status'
import type { NdaDisplayStatus } from './company-entity'
import {
  contractEndPrimaryTone,
  formatContractEndRelativeLabel,
  isContractEndWithinWarningWindow,
} from './contract-end'
import { NDA_EXPIRY_WARNING_DAYS, ndaDaysUntilExpiry } from './nda-expiry'

export type AccountCardPrimaryKind =
  | 'approval'
  | 'contract'
  | 'nda'
  | 'signal'
  | 'fallback'

export type AccountCardPrimaryTone = 'danger' | 'warning' | 'neutral' | 'opportunity'

export type AccountCardPrimaryAction = {
  kind: AccountCardPrimaryKind
  label: string
  date?: string | null
  tone: AccountCardPrimaryTone
}

export type NextApprovalExpiry = {
  title: string | null
  expiresAt: string
}

export type NextContractEnd = {
  title: string
  contractEndDate: string
}

export type ResolveAccountCardPrimaryActionInput = {
  accountStatus: CompanyAccountStatusValue | null
  nextApproval: NextApprovalExpiry | null
  nextContract: NextContractEnd | null
  nextNdaExpiry: string | null
  ndaStatus: NdaDisplayStatus
  latestSignalSummary: string | null
  openDealsCount: number
  referenceCount: number
  now?: Date
}

function approvalExpiresSoon(expiresAt: string, now: Date): boolean {
  const end = new Date(expiresAt.includes('T') ? expiresAt : `${expiresAt}T12:00:00`)
  if (Number.isNaN(end.getTime())) return false
  const days = Math.round((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  return days <= NDA_EXPIRY_WARNING_DAYS
}

function formatApprovalDate(expiresAt: string): string {
  return formatReferenceDate(expiresAt.slice(0, 10), 'de-DE')
}

function fallbackLabel(input: ResolveAccountCardPrimaryActionInput): string {
  if (input.accountStatus === 'target' && input.openDealsCount === 0) {
    return 'Noch kein offener Deal'
  }
  const deals = `${input.openDealsCount} Deal${input.openDealsCount === 1 ? '' : 's'}`
  const refs = `${input.referenceCount} Referenz${input.referenceCount === 1 ? '' : 'en'}`
  return `${deals} · ${refs}`
}

export function resolveAccountCardPrimaryAction(
  input: ResolveAccountCardPrimaryActionInput,
): AccountCardPrimaryAction {
  const now = input.now ?? new Date()

  if (input.nextApproval && approvalExpiresSoon(input.nextApproval.expiresAt, now)) {
    const title = input.nextApproval.title?.trim() || 'Referenz'
    return {
      kind: 'approval',
      label: `Freigabe „${title}“ endet ${formatApprovalDate(input.nextApproval.expiresAt)}`,
      date: input.nextApproval.expiresAt,
      tone: 'danger',
    }
  }

  if (
    input.nextContract &&
    isContractEndWithinWarningWindow(input.nextContract.contractEndDate, now)
  ) {
    const title = input.nextContract.title.trim() || 'Vertrag'
    const relative = formatContractEndRelativeLabel(
      input.nextContract.contractEndDate,
      now,
    )
    return {
      kind: 'contract',
      label: `„${title}“ ${relative}`,
      date: input.nextContract.contractEndDate,
      tone: contractEndPrimaryTone(input.nextContract.contractEndDate, now),
    }
  }

  if (
    input.nextNdaExpiry &&
    (input.ndaStatus === 'expiring' ||
      ndaDaysUntilExpiry(input.nextNdaExpiry, now) <= NDA_EXPIRY_WARNING_DAYS)
  ) {
    const days = ndaDaysUntilExpiry(input.nextNdaExpiry, now)
    if (days <= NDA_EXPIRY_WARNING_DAYS) {
      return {
        kind: 'nda',
        label: `NDA endet ${formatReferenceDate(input.nextNdaExpiry, 'de-DE')}`,
        date: input.nextNdaExpiry,
        tone: days <= 7 ? 'danger' : 'warning',
      }
    }
  }

  if (input.latestSignalSummary?.trim()) {
    return {
      kind: 'signal',
      label: `Signal: ${input.latestSignalSummary.trim()}`,
      tone: 'opportunity',
    }
  }

  return {
    kind: 'fallback',
    label: fallbackLabel(input),
    tone: 'neutral',
  }
}

export function buildAccountCardSecondaryMeta(input: {
  ndaStatus: NdaDisplayStatus
  openDealsCount: number
  referenceCount: number
  primaryKind?: AccountCardPrimaryKind
}): string {
  const ndaPart =
    input.ndaStatus === 'active'
      ? 'NDA aktiv'
      : input.ndaStatus === 'expiring'
        ? 'NDA läuft ab'
        : null

  if (input.primaryKind === 'fallback') {
    return ndaPart ?? ''
  }

  if (input.primaryKind === 'signal') {
    const parts = [
      `${input.openDealsCount} Deal${input.openDealsCount === 1 ? '' : 's'}`,
      `${input.referenceCount} Referenz${input.referenceCount === 1 ? '' : 'en'}`,
    ]
    if (ndaPart) parts.unshift(ndaPart)
    return parts.join(' · ')
  }

  const parts: string[] = []
  if (ndaPart) parts.push(ndaPart)
  parts.push(
    `${input.openDealsCount} Deal${input.openDealsCount === 1 ? '' : 's'}`,
    `${input.referenceCount} Referenz${input.referenceCount === 1 ? '' : 'en'}`,
  )
  return parts.join(' · ')
}
