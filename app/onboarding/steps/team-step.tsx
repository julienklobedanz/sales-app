'use client'

import * as React from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COPY } from '@/lib/copy'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import {
  DEFAULT_INVITE_ROLES,
  INVITE_FUNCTION_ROLE_OPTIONS,
  INVITE_SYSTEM_ROLE_OPTIONS,
  type InviteRoleDimensions,
} from '@/lib/roles/invite-roles'
import {
  ONBOARDING_DEFAULT_TEAM_INVITES,
  ONBOARDING_MAX_TEAM_INVITES,
} from '../onboarding-steps'

export type TeamInviteRow = {
  email: string
  systemRole: SystemRole
  functionRole: FunctionRole
}

function emptyInviteRow(): TeamInviteRow {
  return {
    email: '',
    systemRole: DEFAULT_INVITE_ROLES.systemRole,
    functionRole: DEFAULT_INVITE_ROLES.functionRole,
  }
}

export function createDefaultInviteRows(
  count = ONBOARDING_DEFAULT_TEAM_INVITES,
): TeamInviteRow[] {
  return Array.from({ length: count }, () => emptyInviteRow())
}

/** Beim Verlassen von Schritt 3: leere Zeilen entfernen, mindestens 3 Slots. */
export function normalizeTeamInvitesOnBack(invites: TeamInviteRow[]): TeamInviteRow[] {
  const filled = invites.filter((row) => row.email.trim().length > 0)
  if (filled.length === 0) {
    return createDefaultInviteRows()
  }
  const result = [...filled]
  while (result.length < ONBOARDING_DEFAULT_TEAM_INVITES) {
    result.push(emptyInviteRow())
  }
  return result.slice(0, ONBOARDING_MAX_TEAM_INVITES)
}

export function removeLastInviteRow(invites: TeamInviteRow[]): TeamInviteRow[] {
  if (invites.length <= ONBOARDING_DEFAULT_TEAM_INVITES) return invites
  return invites.slice(0, -1)
}

const fieldClass =
  'h-11 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm text-foreground shadow-sm transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600'

const selectTriggerClass = `${fieldClass} !h-11 data-[size=default]:!h-11 flex items-center justify-between`

function InviteRoleSelects({
  systemRole,
  functionRole,
  disabled,
  onChange,
}: {
  systemRole: SystemRole
  functionRole: FunctionRole
  disabled?: boolean
  onChange: (next: InviteRoleDimensions) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        value={systemRole}
        onValueChange={(v) =>
          onChange({ systemRole: v as SystemRole, functionRole })
        }
        disabled={disabled}
      >
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue placeholder="System" />
        </SelectTrigger>
        <SelectContent>
          {INVITE_SYSTEM_ROLE_OPTIONS.map((role) => (
            <SelectItem key={role} value={role}>
              {COPY.roleDimensions.systemRoles[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={functionRole}
        onValueChange={(v) =>
          onChange({ systemRole, functionRole: v as FunctionRole })
        }
        disabled={disabled}
      >
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue placeholder="Funktion" />
        </SelectTrigger>
        <SelectContent>
          {INVITE_FUNCTION_ROLE_OPTIONS.map((role) => (
            <SelectItem key={role} value={role}>
              {COPY.roleDimensions.functionRoles[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

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
            className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_minmax(220px,1fr)]"
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
            <InviteRoleSelects
              systemRole={row.systemRole}
              functionRole={row.functionRole}
              disabled={disabled || sending}
              onChange={(roles) => {
                const next = invites.slice()
                next[idx] = { ...row, ...roles }
                onChange(next)
              }}
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <button
            type="button"
            disabled={
              disabled || sending || invites.length >= ONBOARDING_MAX_TEAM_INVITES
            }
            onClick={() => onChange([...invites, emptyInviteRow()])}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            + Weitere einladen
          </button>
          {invites.length > ONBOARDING_DEFAULT_TEAM_INVITES ? (
            <button
              type="button"
              disabled={disabled || sending}
              onClick={() => onChange(removeLastInviteRow(invites))}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
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
        className="text-center text-sm text-muted-foreground transition-colors hover:text-muted-foreground disabled:opacity-40"
      >
        Diesen Schritt überspringen
      </button>
    </div>
  )
}
