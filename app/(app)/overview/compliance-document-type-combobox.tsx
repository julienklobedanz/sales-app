'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { createComplianceDocumentType } from '@/app/(app)/settings/compliance-document-type-actions'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
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
  const [menuWidth, setMenuWidth] = useState<number | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.slug === value)
  const inputValue = open ? query : (selected?.label ?? '')

  function openDropdown() {
    if (disabled) return
    setMenuWidth(anchorRef.current?.offsetWidth)
    setQuery('')
    setOpen(true)
  }

  function handleOpenChange(next: boolean) {
    // Nicht schließen, solange das Suchfeld fokussiert ist (verhindert Flackern im Dialog).
    if (!next && document.activeElement === inputRef.current) {
      return
    }
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
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          className={cn(
            'relative flex min-w-0 flex-1 items-center',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <Input
            ref={inputRef}
            id="compliance-doc-type"
            value={inputValue}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => {
              if (!open) openDropdown()
            }}
            onClick={() => {
              if (!open) openDropdown()
            }}
            placeholder={
              options.length > 0
                ? 'Dokumenttyp suchen oder wählen…'
                : 'Dokumenttypen werden geladen…'
            }
            disabled={disabled}
            className="h-10 rounded-lg border bg-card pr-9 shadow-sm"
            autoComplete="off"
            aria-expanded={open}
            aria-haspopup="listbox"
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={open ? 'Dokumenttyp-Liste schließen' : 'Dokumenttyp-Liste öffnen'}
            onMouseDown={(e) => {
              // Fokus im Input behalten, kein Toggle-Flackern durch Blur.
              e.preventDefault()
            }}
            onClick={() => {
              if (open) {
                setOpen(false)
              } else {
                openDropdown()
                inputRef.current?.focus()
              }
            }}
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="min-w-[min(100vw-2rem,22rem)] overflow-hidden p-0"
        style={menuWidth ? { width: Math.max(menuWidth, 352) } : undefined}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
        onInteractOutside={(e) => {
          // Klick ins Suchfeld soll die Liste nicht schließen.
          if (
            e.target === inputRef.current ||
            inputRef.current?.contains(e.target as Node)
          ) {
            e.preventDefault()
          }
        }}
      >
        <Command shouldFilter={false} className="h-auto overflow-hidden">
          <CommandList
            className="max-h-[min(240px,40vh)] overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            {options.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                Dokumenttypen werden geladen…
              </CommandEmpty>
            ) : filtered.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                Kein Treffer
              </CommandEmpty>
            ) : (
              <CommandGroup className="overflow-visible">
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
                        value === type.slug ? 'opacity-100' : 'opacity-0',
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
          </CommandList>
          {!exactMatch && query.trim() ? (
            <div className="shrink-0 border-t border-border/70 p-1">
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
            <div className="shrink-0 border-t border-border/70 p-1">
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
        </Command>
      </PopoverContent>
    </Popover>
  )
}
