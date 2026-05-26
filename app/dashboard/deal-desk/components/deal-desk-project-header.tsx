'use client'

import { useEffect, useRef, useState } from 'react'
import { Briefcase, FileText, Loader2, RefreshCw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import type { DealDeskProject } from '@/lib/deal-desk/deal-desk-project'
import { cn } from '@/lib/utils'

type Props = {
  projects: DealDeskProject[]
  activeProject: DealDeskProject
  showDemoBadge?: boolean
  canResetDemo?: boolean
  onResetDemo?: () => void
  onSelectProject: (id: string) => void
  onDeleteProject: (id: string) => void
  onRenameProject: (id: string, name: string) => void
  onRemoveDocument: (projectId: string, fileName: string) => void
  onNewRfp: () => void
  onReanalyze?: () => void
  reanalyzing?: boolean
  canReanalyze?: boolean
  fileIcon: (name: string) => React.ComponentType<{ className?: string }>
}

export function DealDeskProjectHeader({
  projects,
  activeProject,
  showDemoBadge = false,
  canResetDemo = false,
  onResetDemo,
  onSelectProject,
  onDeleteProject,
  onRenameProject,
  onRemoveDocument,
  onNewRfp,
  onReanalyze,
  reanalyzing = false,
  canReanalyze = true,
  fileIcon,
}: Props) {
  const [docsOpen, setDocsOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const docCount = activeProject.analysis.documentNames.length
  const editingTitle = editingProjectId === activeProject.id

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [editingTitle])

  function commitTitleEdit() {
    setEditingProjectId(null)
  }

  return (
    <>
      <div className="flex w-full flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-100">
            <Briefcase className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {editingTitle ? (
                <div className="space-y-1">
                  <Label htmlFor="deal-desk-project-name" className="sr-only">
                    Projektname
                  </Label>
                  <Input
                    ref={titleInputRef}
                    id="deal-desk-project-name"
                    value={activeProject.projectName}
                    onChange={(e) => onRenameProject(activeProject.id, e.target.value)}
                    onBlur={commitTitleEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.preventDefault()
                        commitTitleEdit()
                      }
                    }}
                    className="h-10 max-w-lg text-lg font-semibold"
                    placeholder="Projektname"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingProjectId(activeProject.id)}
                  className={cn(
                    DASHBOARD_PAGE_TITLE_CLASS,
                    'block max-w-full truncate text-left transition-colors hover:text-foreground/80'
                  )}
                  title="Klicken zum Bearbeiten"
                >
                  {activeProject.projectName || 'Unbenanntes Projekt'}
                </button>
              )}
              {showDemoBadge ? (
                <span
                  className="inline-flex shrink-0 items-center rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm"
                  title="Beispieldaten — keine echte RFP-Auswertung"
                >
                  Demo
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {activeProject.analysis.customerName} · {docCount} Dokument
              {docCount === 1 ? '' : 'e'}
              {activeProject.analysisStatus === 'processing' ? ' · Analyse läuft' : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canResetDemo && onResetDemo ? (
            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={onResetDemo}>
              Demo zurücksetzen
            </Button>
          ) : null}
          {onReanalyze && canReanalyze ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={reanalyzing || activeProject.analysisStatus === 'processing'}
              onClick={onReanalyze}
            >
              {reanalyzing ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
              Analyse erneut starten
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onNewRfp}>
            Neues RFP
          </Button>
          <div className="flex items-center gap-1">
            <Select value={activeProject.id} onValueChange={onSelectProject}>
              <SelectTrigger className="h-9 w-[min(100%,200px)] text-xs">
                <SelectValue placeholder="Projekt wählen …" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Aktuelles Projekt entfernen"
              onClick={() => onDeleteProject(activeProject.id)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="Hochgeladene Dokumente verwalten"
            onClick={() => setDocsOpen(true)}
          >
            <FileText className="size-4" />
          </Button>
        </div>
      </div>

      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dokumente — {activeProject.projectName}</DialogTitle>
            <DialogDescription>
              Alle Unterlagen dieses RFP-Projekts. Entfernen, was nicht mehr zur Analyse gehört.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {activeProject.analysis.documentNames.length === 0 ? (
              <li className="text-sm text-muted-foreground">Keine Dokumente.</li>
            ) : (
              activeProject.analysis.documentNames.map((name) => {
                const Icon = fileIcon(name)
                return (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`${name} entfernen`}
                      disabled={activeProject.analysis.documentNames.length <= 1}
                      onClick={() => onRemoveDocument(activeProject.id, name)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                )
              })
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
