'use client'

import { CirclePlus } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'

export function AccountsOnboardingEmptyState({
  onCreateManual,
  canCreateManual = false,
}: {
  onCreateManual?: () => void
  canCreateManual?: boolean
}) {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center p-8">
      <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
        Lege deinen ersten Account an
      </h2>
      <p className="mx-auto mb-8 max-w-lg text-center text-sm text-muted-foreground">
        Accounts sind die Firmen, für die ihr Beweise platziert. Danach erscheint der
        Anlege-Knopf in der Sammel-Toolbar.
      </p>
      {canCreateManual && onCreateManual ? (
        <button
          type="button"
          onClick={onCreateManual}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
        >
          <AppIcon icon={CirclePlus} size={16} className="shrink-0" />
          Ersten Account anlegen
        </button>
      ) : (
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Noch keine Accounts in deinem Workspace. Bitte dein Team, einen Account
          anzulegen.
        </p>
      )}
    </div>
  )
}
