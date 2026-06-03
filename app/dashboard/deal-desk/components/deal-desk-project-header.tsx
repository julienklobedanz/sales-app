'use client'

import { useEffect, useRef, useState } from 'react'
import { Briefcase, ChevronDown, Loader2, MapPin, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DealDeskProjectSwitcher } from '@/app/dashboard/deal-desk/components/deal-desk-project-switcher'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DealDeskDomainTags } from '@/app/dashboard/deal-desk/components/deal-desk-domain-tags'
import type { DealDeskProject } from '@/lib/deal-desk/deal-desk-project'
import { cn } from '@/lib/utils'

type Props = {
  activeProjects: DealDeskProject[]
  archivedProjects: DealDeskProject[]
  activeProject: DealDeskProject
  domainTags?: string[]
  projectLocation?: string | null
  showDemoBadge?: boolean
  onSelectProject: (id: string) => void
  onArchiveProject: (id: string) => void
  onUnarchiveProject: (id: string) => void
  onDeleteProject: (id: string) => void
  onRenameProject: (id: string, name: string) => void
  onRemoveDocument: (projectId: string, fileName: string) => void
  onAddDocuments?: (files: File[]) => void
  addingDocuments?: boolean
  maxDocuments?: number
  acceptFileAttr?: string
  onNewRfp: () => void
  onClose: () => void
  fileIcon: (name: string) => React.ComponentType<{ className?: string }>
}

export function DealDeskProjectHeader({
  activeProjects,
  archivedProjects,
  activeProject,
  domainTags = [],
  projectLocation = null,
  showDemoBadge = false,
  onSelectProject,
  onArchiveProject,
  onUnarchiveProject,
  onDeleteProject,
  onRenameProject,
  onRemoveDocument,
  onAddDocuments,
  addingDocuments = false,
  maxDocuments = 10,
  acceptFileAttr = '.pdf,.doc,.docx,.xls,.xlsx',
  onNewRfp,
  onClose,
  fileIcon,
}: Props) {
  const [docsOpen, setDocsOpen] = useState(false)
  const [docDragActive, setDocDragActive] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const addDocInputRef = useRef<HTMLInputElement>(null)
  const docCount = activeProject.analysis.documentNames.length
  const editingTitle = editingProjectId === activeProject.id
  const atDocLimit = docCount >= maxDocuments
  const canAddMore =
    Boolean(onAddDocuments) &&
    !atDocLimit &&
    activeProject.analysisStatus !== 'processing' &&
    !addingDocuments
  const actionsBusy = activeProject.analysisStatus === 'processing' || addingDocuments

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [editingTitle])

  function commitTitleEdit() {
    setEditingProjectId(null)
  }

  function pickAdditionalFiles(fileList: FileList | null | undefined) {
    if (!fileList?.length || !onAddDocuments) return
    onAddDocuments(Array.from(fileList))
    if (addDocInputRef.current) addDocInputRef.current.value = ''
    setDocDragActive(false)
  }

  const docCountLabel = `${docCount} Dokument${docCount === 1 ? '' : 'e'}`
  const locationLabel = projectLocation?.trim()
  const showLocation = Boolean(locationLabel && locationLabel !== '—')

  return (
    <div className="flex w-full items-center justify-between gap-6 rounded-xl border border-border bg-card px-6 py-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-100">
          <Briefcase className="size-5" />
        </div>
        <div className="min-w-0 flex flex-col">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            {editingTitle ? (
              <div className="min-w-0 flex-1">
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
                  className="h-10 max-w-lg text-2xl font-bold tracking-tight"
                  placeholder="Projektname"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingProjectId(activeProject.id)}
                className="max-w-full truncate text-left text-2xl font-bold tracking-tight text-foreground transition-colors hover:text-foreground/80"
                title="Klicken zum Bearbeiten"
              >
                {activeProject.projectName || 'Unbenanntes Projekt'}
              </button>
            )}
            {showDemoBadge ? (
              <span
                className="inline-flex shrink-0 items-center rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                title="Beispieldaten — keine echte RFP-Auswertung"
              >
                Demo
              </span>
            ) : null}
          </div>
          <DealDeskDomainTags tags={domainTags} className="mt-3" />
          <p className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <span className="truncate">{activeProject.analysis.customerName}</span>
            {showLocation ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 shrink-0">
                  <MapPin className="size-3 shrink-0 opacity-70" aria-hidden />
                  <span>{locationLabel}</span>
                </span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <Popover open={docsOpen} onOpenChange={setDocsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 text-foreground/85 underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`${docCountLabel} anzeigen und verwalten`}
                >
                  {addingDocuments ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                  ) : null}
                  <span>{docCountLabel}</span>
                  <ChevronDown className="size-3 opacity-70" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
                <PopoverHeader className="border-b border-border px-4 py-3">
                  <PopoverTitle>Dokumente</PopoverTitle>
                  <PopoverDescription>
                    Unterlagen dieses RFP-Projekts — entfernen oder weitere Dateien hinzufügen.
                  </PopoverDescription>
                </PopoverHeader>
                <ul className="max-h-[220px] space-y-2 overflow-y-auto px-4 py-3">
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
                            disabled={
                              activeProject.analysis.documentNames.length <= 1 ||
                              activeProject.analysisStatus === 'processing' ||
                              addingDocuments
                            }
                            onClick={() => onRemoveDocument(activeProject.id, name)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </li>
                      )
                    })
                  )}
                </ul>
                {onAddDocuments ? (
                  <div className="border-t border-border px-4 py-3">
                    <input
                      ref={addDocInputRef}
                      type="file"
                      multiple
                      accept={acceptFileAttr}
                      className="sr-only"
                      disabled={!canAddMore}
                      onChange={(e) => {
                        pickAdditionalFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />
                    <div
                      role="button"
                      tabIndex={canAddMore ? 0 : -1}
                      aria-disabled={!canAddMore}
                      onKeyDown={(e) => {
                        if (!canAddMore) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          addDocInputRef.current?.click()
                        }
                      }}
                      onClick={() => {
                        if (!canAddMore) return
                        addDocInputRef.current?.click()
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault()
                        if (canAddMore) setDocDragActive(true)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (canAddMore) setDocDragActive(true)
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        setDocDragActive(false)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDocDragActive(false)
                        if (!canAddMore) return
                        pickAdditionalFiles(e.dataTransfer.files)
                      }}
                      className={cn(
                        'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-3 py-5 text-center transition-colors',
                        canAddMore
                          ? docDragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
                          : 'cursor-not-allowed border-border/60 bg-muted/10 opacity-60'
                      )}
                    >
                      {addingDocuments ? (
                        <>
                          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
                          <p className="mt-2 text-xs font-medium text-foreground">
                            Wird hochgeladen und analysiert …
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="size-5 text-muted-foreground" aria-hidden />
                          <p className="mt-2 text-xs font-medium text-foreground">
                            Weitere Dokumente hinzufügen
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {atDocLimit
                              ? `Maximal ${maxDocuments} Dokumente erreicht.`
                              : 'PDF, Word oder Excel — Drag & Drop oder Klick.'}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {docCount} / {maxDocuments} Dokumente
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
            {activeProject.analysisStatus === 'processing' ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  Analyse läuft
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DealDeskProjectSwitcher
          activeProjects={activeProjects}
          archivedProjects={archivedProjects}
          selectedProjectId={activeProject.id}
          onSelectProject={onSelectProject}
          onArchiveProject={onArchiveProject}
          onUnarchiveProject={onUnarchiveProject}
          onDeleteProject={onDeleteProject}
          onNewRfp={onNewRfp}
          actionsBusy={actionsBusy}
          variant="compact"
        />

        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Detailansicht schließen und Upload anzeigen"
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
