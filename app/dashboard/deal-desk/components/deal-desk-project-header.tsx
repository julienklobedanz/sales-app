'use client'

import { useState } from 'react'
import { Briefcase, FileStack, X } from 'lucide-react'

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
import type { DealDeskProject } from '@/lib/deal-desk/deal-desk-project'

type Props = {
  projects: DealDeskProject[]
  activeProject: DealDeskProject
  onSelectProject: (id: string) => void
  onDeleteProject: (id: string) => void
  onRenameProject: (id: string, name: string) => void
  onRemoveDocument: (projectId: string, fileName: string) => void
  onNewRfp: () => void
  fileIcon: (name: string) => React.ComponentType<{ className?: string }>
}

export function DealDeskProjectHeader({
  projects,
  activeProject,
  onSelectProject,
  onDeleteProject,
  onRenameProject,
  onRemoveDocument,
  onNewRfp,
  fileIcon,
}: Props) {
  const [docsOpen, setDocsOpen] = useState(false)
  const docCount = activeProject.analysis.documentNames.length

  return (
    <>
      <div className="flex w-full flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-100">
            <Briefcase className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={activeProject.id} onValueChange={onSelectProject}>
                <SelectTrigger className="h-9 w-[min(100%,220px)] text-xs">
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
            <div className="space-y-1">
              <Label htmlFor="deal-desk-project-name" className="sr-only">
                Projektname
              </Label>
              <Input
                id="deal-desk-project-name"
                value={activeProject.projectName}
                onChange={(e) => onRenameProject(activeProject.id, e.target.value)}
                className="h-9 max-w-md text-base font-semibold"
                placeholder="Projektname"
              />
              <p className="text-sm text-muted-foreground">
                {activeProject.analysis.customerName} · {docCount} Dokument
                {docCount === 1 ? '' : 'e'} · Demo
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="Hochgeladene Dokumente verwalten"
            onClick={() => setDocsOpen(true)}
          >
            <FileStack className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onNewRfp}>
            Neues RFP
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
