'use client'

import * as React from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ONBOARDING_DEFAULT_TEAM_INVITES,
  ONBOARDING_MAX_TEAM_INVITES,
} from '../onboarding-steps'

export type InviteRole = 'sales' | 'admin'

export type TeamInviteRow = {
  email: string
  role: InviteRole
}

export function createDefaultInviteRows(
  count = ONBOARDING_DEFAULT_TEAM_INVITES,
): TeamInviteRow[] {
  return Array.from({ length: count }, () => ({ email: '', role: 'sales' }))
}

/** Beim Verlassen von Schritt 3: leere Zeilen entfernen, mindestens 3 Slots. */
export function normalizeTeamInvitesOnBack(invites: TeamInviteRow[]): TeamInviteRow[] {
  const filled = invites.filter((row) => row.email.trim().length > 0)
  if (filled.length === 0) {
    return createDefaultInviteRows()
  }
  const result = [...filled]
  while (result.length < ONBOARDING_DEFAULT_TEAM_INVITES) {
    result.push({ email: '', role: 'sales' })
  }
  return result.slice(0, ONBOARDING_MAX_TEAM_INVITES)
}

export function removeLastInviteRow(invites: TeamInviteRow[]): TeamInviteRow[] {
  if (invites.length <= ONBOARDING_DEFAULT_TEAM_INVITES) return invites
  return invites.slice(0, -1)
}

const fieldClass =
  'h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 text-sm text-gray-900 shadow-sm transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600'

const selectTriggerClass = `${fieldClass} !h-11 data-[size=default]:!h-11 flex items-center justify-between`

export function TeamStep({
  invites,
  onChange,
  onSkip,
  onFinish,
  sending,
  disabled,
}: {
  invites: TeamInviteRow[]
  onChange: (next: TeamInviteRow[]) => void
  onSkip: () => void
  onFinish: () => void
  sending: boolean
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {invites.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_120px]"
          >
            <input
              id={`invite_email_${idx}`}
              value={row.email}
              onChange={(e) => {
                const next = invites.slice()
                next[idx] = { ...row, email: e.target.value }
                onChange(next)
              }}
              placeholder="name@firma.de"
              disabled={disabled || sending}
              type="email"
              className={fieldClass}
            />
            <Select
              value={row.role}
              onValueChange={(v) => {
                const next = invites.slice()
                next[idx] = { ...row, role: v as InviteRole }
                onChange(next)
              }}
              disabled={disabled || sending}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Rolle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <button
            type="button"
            disabled={
              disabled || sending || invites.length >= ONBOARDING_MAX_TEAM_INVITES
            }
            onClick={() => onChange([...invites, { email: '', role: 'sales' }])}
            className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 disabled:opacity-40"
          >
            + Weitere einladen
          </button>
          {invites.length > ONBOARDING_DEFAULT_TEAM_INVITES ? (
            <button
              type="button"
              disabled={disabled || sending}
              onClick={() => onChange(removeLastInviteRow(invites))}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 disabled:opacity-40"
            >
              − Weniger einladen
            </button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onFinish}
        disabled={disabled || sending}
        className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? 'Einladungen senden…' : 'Onboarding abschließen'}
      </button>

      <button
        type="button"
        onClick={onSkip}
        disabled={disabled || sending}
        className="text-center text-sm text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-40"
      >
        Diesen Schritt überspringen
      </button>
    </div>
  )
}
