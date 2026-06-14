'use client'

import * as React from 'react'
import { ArrowRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export type WorkspaceStepValue = {
  firstName: string
  lastName: string
  email: string
  organizationName: string
}

const activeFieldClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 shadow-sm transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600'

const disabledFieldClass =
  'w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-400'

type WorkspaceStepProps = {
  value: WorkspaceStepValue
  onChange: (next: WorkspaceStepValue) => void
  onNext: () => void
  disabled?: boolean
  isInvite: boolean
}

export function WorkspaceStep({
  value,
  onChange,
  onNext,
  disabled,
  isInvite,
}: WorkspaceStepProps) {
  const canProceed =
    Boolean(value.firstName.trim()) &&
    Boolean(value.lastName.trim()) &&
    Boolean(value.organizationName.trim()) &&
    !disabled

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (canProceed) onNext()
      }}
    >
      <input
        id="onboarding_first_name"
        name="first_name"
        value={value.firstName}
        onChange={(e) => onChange({ ...value, firstName: e.target.value })}
        placeholder="Vorname"
        disabled={disabled}
        required
        autoComplete="given-name"
        className={activeFieldClass}
      />

      <input
        id="onboarding_last_name"
        name="last_name"
        value={value.lastName}
        onChange={(e) => onChange({ ...value, lastName: e.target.value })}
        placeholder="Nachname"
        disabled={disabled}
        required
        autoComplete="family-name"
        className={activeFieldClass}
      />

      <input
        id="onboarding_email"
        name="email"
        type="email"
        value={value.email}
        disabled
        readOnly
        aria-readonly
        className={disabledFieldClass}
      />

      <input
        id="organization_name"
        name="organization_name"
        value={value.organizationName}
        onChange={(e) => onChange({ ...value, organizationName: e.target.value })}
        placeholder="Dein Unternehmen z. B. Acme Corp"
        disabled={disabled || isInvite}
        required={!isInvite}
        className={cn(activeFieldClass, isInvite && 'cursor-not-allowed opacity-70')}
        autoComplete="organization"
      />

      <button
        type="submit"
        disabled={!canProceed}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? 'Wird gespeichert…' : 'Weiter zu Schritt 2'}
        {!disabled ? <ArrowRight className="size-4 shrink-0" aria-hidden /> : null}
      </button>
    </form>
  )
}
