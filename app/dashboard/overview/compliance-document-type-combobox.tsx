'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { createComplianceDocumentType } from '@/app/dashboard/settings/compliance-document-type-actions'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  sortComplianceDocumentTypeOptions,
  type ComplianceDocumentTypeOption,
} from '@/lib/compliance/document-types'
import { cn } from '@/lib/utils'

type Props = {
  options: ComplianceDocumentTypeOption[]
  value: string
  onValueChange: (slug: string) => void
  onOptionsChange?: (options: ComplianceDocumentTypeOption[]) => void
  disabled?: boolean
  onManageTypesClick?: () => void
}

export function ComplianceDocumentTypeCombobox({
  options,
  value,
  onValueChange,
  onOptionsChange,
  disabled = false,
  onManageTypesClick,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.slug === value)
  const inputValue = open ? query : (selected?.label ?? '')

  function handleOpenChange(next: boolean) {
    if (next) setQuery('')
    setOpen(next)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return options.some((o) => o.label.toLowerCase() === q)
  }, [options, query])

  async function handleCreateType() {
    const label = query.trim()
    if (!label || exactMatch) return
    setCreating(true)
    const result = await createComplianceDocumentType(label)
    setCreating(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Dokumenttyp hinzugefügt.')
    const next = sortComplianceDocumentTypeOptions([...options, result.type])
    onOptionsChange?.(next)
    onValueChange(result.type.slug)
    setQuery('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'relative flex min-w-0 flex-1 items-center',
            disabled && 'pointer-events-none opacity-60'
          )}
        >
          <Input
            ref={inputRef}
            id="compliance-doc-type"
            value={inputValue}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setQuery('')
              setOpen(true)
            }}
            placeholder={
              options.length > 0
                ? 'Dokumenttyp suchen oder wählen…'
                : 'Dokumenttypen werden geladen…'
            }
            disabled={disabled}
            className="h-10 rounded-lg border bg-white pr-9 shadow-sm"
            autoComplete="off"
          />
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-[min(280px,50vh)]">
            {options.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                Dokumenttypen werden geladen…
              </CommandEmpty>
            ) : filtered.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                Kein Treffer
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((type) => (
                  <CommandItem
                    key={type.slug}
                    value={type.slug}
                    onSelect={() => {
                      onValueChange(type.slug)
                      setQuery('')
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4 shrink-0',
                        value === type.slug ? 'opacity-100' : 'opacity-0'
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{type.label}</span>
                    {type.isSystem ? (
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                        Standard
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!exactMatch && query.trim() ? (
              <div className="border-t border-border/70 p-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                  disabled={creating}
                  onClick={() => void handleCreateType()}
                >
                  {creating ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <Plus className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>
                    „<span className="font-medium">{query.trim()}</span>“ als neuen Typ
                    hinzufügen
                  </span>
                </button>
              </div>
            ) : null}
            {onManageTypesClick ? (
              <div className="border-t border-border/70 p-1">
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => {
                    setOpen(false)
                    onManageTypesClick()
                  }}
                >
                  Alle Dokumenttypen verwalten…
                </button>
              </div>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
