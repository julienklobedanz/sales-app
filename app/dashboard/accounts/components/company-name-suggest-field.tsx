'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  searchCompanySuggestions,
  type CompanySearchSuggestion,
} from '@/app/dashboard/references/new/actions'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'

type Props = {
  id: string
  value: string
  onValueChange: (value: string) => void
  onSelectSuggestion: (suggestion: CompanySearchSuggestion) => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function CompanyNameSuggestField({
  id,
  value,
  onValueChange,
  onSelectSuggestion,
  disabled = false,
  placeholder,
  autoFocus,
  className,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<CompanySearchSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [searchHint, setSearchHint] = useState<string | null>(null)
  const searchAbortRef = useRef(0)

  const trimmed = value.trim()
  const showDropdown = open && !disabled && trimmed.length > 0

  useEffect(() => {
    if (!trimmed) return

    const debounce = window.setTimeout(() => {
      const reqId = ++searchAbortRef.current
      setSearching(true)
      void searchCompanySuggestions(trimmed).then((res) => {
        if (searchAbortRef.current !== reqId) return
        setSearching(false)
        if (res.success) {
          setSuggestions(res.suggestions)
        } else {
          setSuggestions([])
        }
      })
    }, 220)

    return () => window.clearTimeout(debounce)
  }, [trimmed])

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
        onChange={(e) => {
          const next = e.target.value
          onValueChange(next)
          setOpen(true)
          if (!next.trim()) {
            searchAbortRef.current += 1
            setSuggestions([])
            setSearchHint(null)
            setSearching(false)
          }
        }}
        onFocus={() => {
          if (trimmed.length > 0) setOpen(true)
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? `${id}-suggestions` : undefined}
        className={cn('bg-background', className)}
      />
      {showDropdown ? (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-56 overflow-y-auto overscroll-contain rounded-md border border-border bg-popover py-1 text-sm shadow-md"
        >
          {searching && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {COPY.accounts.createDialogSearching}
            </li>
          ) : null}
          {suggestions.map((s) => {
            const isExisting = s.source === 'local'
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground',
                    isExisting && 'bg-emerald-50/50 dark:bg-emerald-950/20',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    void Promise.resolve(onSelectSuggestion(s)).then(() => setOpen(false))
                  }}
                >
                  {s.logo_url ? (
                    <Image
                      src={s.logo_url}
                      alt=""
                      width={24}
                      height={24}
                      unoptimized
                      className="size-6 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
                      ?
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                  {isExisting ? (
                    <Check
                      className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-label={COPY.accounts.createDialogSuggestLocal}
                    />
                  ) : (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {COPY.accounts.createDialogSuggestBrandfetch}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
          {!searching && suggestions.length === 0 ? (
            <li
              className={cn(
                'px-3 py-2 text-xs',
                searchHint
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-muted-foreground',
              )}
            >
              {searchHint ??
                (trimmed.length < 2
                  ? COPY.accounts.createDialogTypeMore
                  : COPY.accounts.createDialogNoResults)}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
