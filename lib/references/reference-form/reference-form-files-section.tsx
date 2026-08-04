'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Command, CommandItem, CommandList } from '@/components/ui/command'
import {
  STATUS_HELP_TEXT,
  STATUS_OPTIONS,
} from '@/lib/references/reference-form/reference-form-constants'
import { RequiredLabel, OptionalLabel } from '@/lib/references/reference-form/reference-form-labels'
import type { ReferenceFormInitialData } from '@/lib/references/reference-form/reference-form-types'
import type { ReferenceFormViewModel } from '@/lib/references/reference-form/use-reference-form'
import { FileDropZone } from '@/app/dashboard/references/new/reference-form-fields'
import { getCompetitorSuggestions, getIncumbentSuggestions } from '@/app/dashboard/actions'

export type ReferenceFormFilesSectionProps = Pick<
  ReferenceFormViewModel,
  | 'initialData'
  | 'submitting'
  | 'incumbentProvider'
  | 'setIncumbentProvider'
  | 'competitors'
  | 'setCompetitors'
  | 'status'
  | 'setStatus'
  | 'ndaDeal'
  | 'setNdaDeal'
  | 'statusBeforeNdaRef'
  | 'competitorInputValue'
  | 'setCompetitorInputValue'
  | 'incumbentInputValue'
  | 'setIncumbentInputValue'
  | 'incumbentSuggestions'
  | 'setIncumbentSuggestions'
  | 'competitorSuggestions'
  | 'setCompetitorSuggestions'
  | 'selectedFile'
  | 'setSelectedFile'
>

export function ReferenceFormFilesSection({
  initialData,
  submitting,
  incumbentProvider,
  setIncumbentProvider,
  competitors,
  setCompetitors,
  status,
  setStatus,
  ndaDeal,
  setNdaDeal,
  statusBeforeNdaRef,
  competitorInputValue,
  setCompetitorInputValue,
  incumbentInputValue,
  setIncumbentInputValue,
  incumbentSuggestions,
  setIncumbentSuggestions,
  competitorSuggestions,
  setCompetitorSuggestions,
  selectedFile,
  setSelectedFile,
}: ReferenceFormFilesSectionProps) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <OptionalLabel htmlFor="incumbent_provider">
              Aktueller Dienstleister (Incumbent)
            </OptionalLabel>
            <input type="hidden" name="incumbent_provider" value={incumbentProvider} />
            <div className="relative">
              <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
                {incumbentProvider
                  .split(/[;,]+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                    >
                      {name}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setIncumbentProvider(
                            incumbentProvider
                              .split(/[;,]+/)
                              .map((s) => s.trim())
                              .filter((n) => n && n.toLowerCase() !== name.toLowerCase())
                              .join(', ')
                          )
                        }}
                        className="rounded-full px-1 hover:bg-accent"
                        aria-label={`Incumbent „${name}" entfernen`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                <input
                  id="incumbent_provider"
                  placeholder={
                    incumbentProvider.trim()
                      ? 'Weiteren Dienstleister hinzufügen…'
                      : 'z. B. bisheriger Anbieter'
                  }
                  disabled={submitting}
                  value={incumbentInputValue}
                  onChange={async (e) => {
                    const value = e.target.value
                    setIncumbentInputValue(value)
                    if (!value.trim()) {
                      setIncumbentSuggestions([])
                      return
                    }
                    try {
                      const list = await getIncumbentSuggestions(value)
                      setIncumbentSuggestions(list)
                    } catch {
                      setIncumbentSuggestions([])
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === ',' || e.key === 'Enter') {
                      e.preventDefault()
                      const raw = incumbentInputValue.trim()
                      if (!raw) return
                      const parts = raw.split(/[;,]+/).map((s) => s.trim()).filter(Boolean)
                      const existing = incumbentProvider
                        .split(/[;,]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                      const merged = [...existing]
                      parts.forEach((p) => {
                        if (!merged.some((n) => n.toLowerCase() === p.toLowerCase())) {
                          merged.push(p)
                        }
                      })
                      setIncumbentProvider(merged.join(', '))
                      setIncumbentInputValue('')
                      setIncumbentSuggestions([])
                    }
                  }}
                  className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              {incumbentSuggestions.length > 0 && incumbentInputValue.trim() && (
                <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-sm shadow-md">
                  <Command>
                    <CommandList>
                      {incumbentSuggestions.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={(val) => {
                            const existing = incumbentProvider
                              .split(/[;,]+/)
                              .map((s) => s.trim())
                              .filter(Boolean)
                            if (!existing.some((n) => n.toLowerCase() === val.toLowerCase())) {
                              setIncumbentProvider([...existing, val].join(', '))
                            }
                            setIncumbentInputValue('')
                            setIncumbentSuggestions([])
                          }}
                        >
                          {name}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <OptionalLabel htmlFor="competitors">
              Weitere beteiligte Wettbewerber
            </OptionalLabel>
            <div className="relative">
              <input type="hidden" name="competitors" value={competitors} />
              <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
                {competitors
                  .split(/[;,]+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                    >
                      {name}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setCompetitors(
                            competitors
                              .split(/[;,]+/)
                              .map((s) => s.trim())
                              .filter((n) => n && n !== name)
                              .join(', ')
                          )
                        }}
                        className="rounded-full px-1 hover:bg-accent"
                        aria-label={`Wettbewerber „${name}" entfernen`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                <div className="relative flex-1 min-w-[120px]">
                  <input
                    id="competitors"
                    placeholder={
                      competitors.trim()
                        ? 'Weiteren Wettbewerber hinzufügen…'
                        : 'z. B. Accenture, Deloitte'
                    }
                    disabled={submitting}
                    value={competitorInputValue}
                    onChange={async (e) => {
                      const value = e.target.value
                      setCompetitorInputValue(value)
                      if (!value.trim()) {
                        setCompetitorSuggestions([])
                        return
                      }
                      try {
                        const list = await getCompetitorSuggestions(value)
                        setCompetitorSuggestions(list)
                      } catch {
                        setCompetitorSuggestions([])
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === ',' || e.key === 'Enter') {
                        e.preventDefault()
                        const raw = competitorInputValue.trim()
                        if (!raw) return
                        const parts = raw.split(/[;,]+/).map((s) => s.trim()).filter(Boolean)
                        const existing = competitors
                          .split(/[;,]+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                        const merged = [...existing]
                        parts.forEach((p) => {
                          if (!merged.some((n) => n.toLowerCase() === p.toLowerCase())) {
                            merged.push(p)
                          }
                        })
                        setCompetitors(merged.join(', '))
                        setCompetitorInputValue('')
                        setCompetitorSuggestions([])
                      }
                    }}
                    className="w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  {competitorSuggestions.length > 0 && competitorInputValue.trim() && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-sm shadow-md">
                      <Command>
                        <CommandList>
                          {competitorSuggestions.map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={(val) => {
                                const existing = competitors
                                  .split(/[;,]+/)
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                                if (!existing.some((n) => n.toLowerCase() === val.toLowerCase())) {
                                  setCompetitors([...existing, val].join(', '))
                                }
                                setCompetitorInputValue('')
                                setCompetitorSuggestions([])
                              }}
                            >
                              {name}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <OptionalLabel>PDF Anhang</OptionalLabel>
          <FileDropZone
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            disabled={submitting}
            existingFilePath={initialData?.file_path}
          />
        </div>

        {/* Status + NDA */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <RequiredLabel htmlFor="status">Status / Freigabestufe</RequiredLabel>
            <input type="hidden" name="status" value={status} />
            <Select
              value={status}
              onValueChange={(val) => {
                const next = val as ReferenceFormInitialData['status']
                setStatus(next)
                if (ndaDeal && next !== 'internal_only') {
                  // Falls Status manuell geändert wird, lösen wir NDA-Modus wieder auf
                  setNdaDeal(false)
                  statusBeforeNdaRef.current = next
                }
              }}
              disabled={submitting || ndaDeal}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-[10px] italic">
              {ndaDeal
                ? 'NDA Deal aktiv: Status wird automatisch auf „Intern“ gesetzt.'
                : STATUS_HELP_TEXT[status]}
            </p>
          </div>

          <div className="space-y-1">
            <OptionalLabel htmlFor="nda_deal">Ist dies ein NDA Deal?</OptionalLabel>
            <Switch
              id="nda_deal"
              checked={ndaDeal}
              disabled={submitting}
              onCheckedChange={(checked) => {
                setNdaDeal(checked)
                if (checked) {
                  statusBeforeNdaRef.current = status
                  setStatus('internal_only')
                } else {
                  setStatus(statusBeforeNdaRef.current ?? 'draft')
                }
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
