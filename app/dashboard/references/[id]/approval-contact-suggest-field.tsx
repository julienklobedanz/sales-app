'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import type { ApprovalContactOption } from '@/lib/references/library/approval-contacts'
import { filterApprovalContactSuggestions } from '@/lib/references/approval-recipient-input'
import { cn } from '@/lib/utils'

type Props = {
  id: string
  contacts: ApprovalContactOption[]
  loading?: boolean
  disabled?: boolean
  value: string
  selected: ApprovalContactOption | null
  onValueChange: (value: string) => void
  onSelectContact: (contact: ApprovalContactOption) => void
  onClearSelection: () => void
}

export function ApprovalContactSuggestField({
  id,
  contacts,
  loading = false,
  disabled = false,
  value,
  selected,
  onValueChange,
  onSelectContact,
  onClearSelection,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const trimmed = value.trim()
  const suggestions = filterApprovalContactSuggestions(contacts, trimmed)
  const showDropdown = open && !disabled && trimmed.length > 0 && suggestions.length > 0

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <div className="relative" ref={wrapRef}>
      <Input
        id={id}
        type="text"
        value={value}
        disabled={disabled || loading}
        autoComplete="off"
        placeholder={loading ? 'Kontakte werden geladen…' : 'Name oder E-Mail eingeben…'}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? `${id}-suggestions` : undefined}
        onChange={(e) => {
          const next = e.target.value
          onValueChange(next)
          if (selected && next !== selected.label && next !== (selected.email ?? '')) {
            onClearSelection()
          }
          setOpen(true)
        }}
        onFocus={() => {
          if (trimmed.length > 0) setOpen(true)
        }}
      />
      {showDropdown ? (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md"
        >
          {suggestions.map((s) => (
            <li key={`${s.kind}-${s.id}`}>
              <button
                type="button"
                role="option"
                aria-selected={selected?.id === s.id && selected?.kind === s.kind}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground',
                  selected?.id === s.id && selected?.kind === s.kind && 'bg-accent/60'
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelectContact(s)
                  setOpen(false)
                }}
              >
                <span className="font-medium text-foreground">{s.label}</span>
                {s.email ? (
                  <span className="text-xs text-muted-foreground">{s.email}</span>
                ) : (
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    Keine E-Mail — bitte Adresse manuell eintragen
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!loading && trimmed.length > 0 && suggestions.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Kein Treffer — E-Mail direkt eintragen; der Kontakt wird beim Start der Freigabe angelegt.
        </p>
      ) : null}
    </div>
  )
}
