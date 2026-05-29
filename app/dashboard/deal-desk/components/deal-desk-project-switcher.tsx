'use client'

import { useState } from 'react'
import { Archive, ArchiveRestore, ChevronDown, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DealDeskProject } from '@/lib/deal-desk/deal-desk-project'
import { cn } from '@/lib/utils'

type Props = {
  activeProjects: DealDeskProject[]
  archivedProjects: DealDeskProject[]
  /** Aktuell geöffnetes Projekt; auf der Upload-Fläche oft `null`. */
  selectedProjectId: string | null
  onSelectProject: (id: string) => void
  onArchiveProject: (id: string) => void
  onUnarchiveProject: (id: string) => void
  onDeleteProject: (id: string) => void
  onNewRfp: () => void
  actionsBusy?: boolean
  /** Kompakter „Wechseln“-Link in der Detail-Header-Zeile. */
  variant?: 'compact' | 'bar'
  placeholder?: string
  className?: string
}

export function DealDeskProjectSwitcher({
  activeProjects,
  archivedProjects,
  selectedProjectId,
  onSelectProject,
  onArchiveProject,
  onUnarchiveProject,
  onDeleteProject,
  onNewRfp,
  actionsBusy = false,
  variant = 'compact',
  placeholder = 'RFP-Projekt wählen oder hochladen…',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const selected =
    activeProjects.find((p) => p.id === selectedProjectId) ??
    archivedProjects.find((p) => p.id === selectedProjectId) ??
    null

  const triggerLabel = selected?.projectName ?? placeholder

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {variant === 'bar' ? (
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-11 w-full justify-between gap-2 rounded-xl border-border bg-card px-4 text-sm font-normal shadow-sm',
              className
            )}
            aria-label="RFP-Projekt wählen oder verwalten"
          >
            <span className={cn('min-w-0 truncate text-left', !selected && 'text-muted-foreground')}>
              {triggerLabel}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-9 gap-1 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground',
              className
            )}
            aria-label="Projekt wechseln oder neues RFP hochladen"
          >
            <span>Wechseln</span>
            <ChevronDown className="size-4 opacity-70" aria-hidden />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === 'bar' ? 'start' : 'end'}
        className={cn(
          'p-0',
          variant === 'bar' ? 'w-[var(--radix-dropdown-menu-trigger-width)] min-w-[28rem]' : 'w-[28rem]'
        )}
      >
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-none px-3 py-2.5 font-medium"
          onSelect={() => {
            onNewRfp()
            setOpen(false)
          }}
        >
          <Upload className="size-4 shrink-0" aria-hidden />
          Neues RFP hochladen…
        </DropdownMenuItem>
        <DropdownMenuSeparator className="mx-0" />
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/60"
          onClick={() => setArchiveOpen((v) => !v)}
        >
          <Archive className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="flex-1 font-medium">Archiv</span>
          <ChevronDown
            className={cn('size-4 text-muted-foreground transition-transform', archiveOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
        {archiveOpen ? (
          <div className="border-b border-border px-2 pb-2">
            {archivedProjects.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">Keine archivierten RFPs.</p>
            ) : (
              <ul className="space-y-0.5">
                {archivedProjects.map((p) => (
                  <li key={p.id} className="flex items-center gap-0.5 rounded-md hover:bg-muted/50">
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        onSelectProject(p.id)
                        setOpen(false)
                      }}
                    >
                      {p.projectName || 'Unbenanntes Projekt'}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={`${p.projectName} wiederherstellen`}
                      onClick={() => onUnarchiveProject(p.id)}
                    >
                      <ArchiveRestore className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`${p.projectName} löschen`}
                      onClick={() => onDeleteProject(p.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        <div className="max-h-[min(280px,40vh)] space-y-0.5 overflow-y-auto px-2 py-2">
          {activeProjects.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Keine aktiven RFPs.</p>
          ) : (
            activeProjects.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-0.5 rounded-md',
                  p.id === selectedProjectId ? 'bg-muted' : 'hover:bg-muted/50'
                )}
              >
                <button
                  type="button"
                  className={cn(
                    'min-w-0 flex-1 truncate px-2 py-2 text-left text-sm',
                    p.id === selectedProjectId ? 'font-medium text-foreground' : 'text-foreground/90'
                  )}
                  onClick={() => {
                    onSelectProject(p.id)
                    setOpen(false)
                  }}
                >
                  {p.projectName || 'Unbenanntes Projekt'}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`${p.projectName} archivieren`}
                  disabled={actionsBusy}
                  onClick={() => onArchiveProject(p.id)}
                >
                  <Archive className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`${p.projectName} löschen`}
                  onClick={() => onDeleteProject(p.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
