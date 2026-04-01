'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UploadIcon, FileText, Cancel01Icon, Loader } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import { bulkCreateReferencesFromFiles } from '../actions'

export type BulkImportGroupItem = { id: string; projectName: string; files: File[] }

export function BulkImportDialog({
  open,
  onOpenChange,
  loading,
  onLoadingChange,
  groups,
  setGroups,
  dropRef,
  addFiles,
  removeFile,
  moveFileToGroup,
  setGroupName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  onLoadingChange?: (loading: boolean) => void
  groups: BulkImportGroupItem[]
  setGroups: React.Dispatch<React.SetStateAction<BulkImportGroupItem[]>>
  dropRef: React.RefObject<HTMLInputElement | null>
  addFiles: (files: File[]) => void
  removeFile: (groupId: string, fileIndex: number) => void
  moveFileToGroup: (fromGroupIndex: number, fromFileIndex: number, toGroupIndex: number) => void
  setGroupName: (groupId: string, projectName: string) => void
}) {
  const router = useRouter()
  const totalFiles = groups.reduce((s, g) => s + g.files.length, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>Referenzen importieren</DialogTitle>
          <DialogDescription>
            Bis zu 20 Dateien ablegen. Pro Gruppe wird eine Referenz mit mehreren Assets angelegt.
            Ziehe Dateikarten auf eine andere, um sie zu einer Projekt-Gruppe zu bündeln.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={dropRef as React.RefObject<HTMLInputElement>}
            type="file"
            multiple
            accept=".pdf,.pptx,.ppt"
            className="hidden"
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : []
              addFiles(list)
              e.target.value = ''
            }}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => !loading && dropRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && !loading && dropRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (loading) return
              const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : []
              addFiles(list)
            }}
            className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-60"
          >
            <AppIcon icon={UploadIcon} size={32} />
            <span>Dateien hier ablegen oder klicken (max. 20)</span>
          </div>

          {groups.length > 0 && (
            <div className="max-h-[280px] space-y-3 overflow-y-auto">
              {groups.map((group, groupIndex) => (
                <div key={group.id} className="rounded-lg border border-border bg-muted/10 p-3">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Projektname
                  </label>
                  <Input
                    value={group.projectName}
                    onChange={(e) => setGroupName(group.id, e.target.value)}
                    disabled={loading}
                    className="mb-2 h-8 text-sm"
                    placeholder="Name der Referenz"
                  />
                  <div className="flex flex-wrap gap-2">
                    {group.files.map((file, fileIndex) => (
                      <div
                        key={`${group.id}-${fileIndex}-${file.name}`}
                        draggable={!loading}
                        onDragStart={(e: React.DragEvent) => {
                          if (loading) return
                          e.dataTransfer.setData('text/plain', `${groupIndex}-${fileIndex}`)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragOver={(e: React.DragEvent) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(e: React.DragEvent) => {
                          e.preventDefault()
                          if (loading) return
                          const raw = e.dataTransfer.getData('text/plain')
                          const [fromGi, fromFi] = raw.split('-').map(Number)
                          if (
                            Number.isFinite(fromGi) &&
                            Number.isFinite(fromFi) &&
                            (fromGi !== groupIndex || fromFi !== fileIndex)
                          ) {
                            moveFileToGroup(fromGi, fromFi, groupIndex)
                          }
                        }}
                        className="flex cursor-grab items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm shadow-sm active:cursor-grabbing"
                      >
                        <AppIcon icon={FileText} size={14} className="shrink-0 text-muted-foreground" />
                        <span className="max-w-[140px] truncate">{file.name}</span>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            removeFile(group.id, fileIndex)
                          }}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`${file.name} entfernen`}
                        >
                          <AppIcon icon={Cancel01Icon} size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>

          <Button
            disabled={totalFiles === 0 || loading}
            onClick={async () => {
              const formData = new FormData()
              formData.append(
                'groups',
                JSON.stringify(
                  groups.map((g) => ({
                    projectName: g.projectName,
                    fileCount: g.files.length,
                  })),
                ),
              )
              groups.forEach((g) => {
                g.files.forEach((f) => formData.append('files', f))
              })

              onLoadingChange?.(true)
              try {
                const result = await bulkCreateReferencesFromFiles(formData)
                if (result.success) {
                  toast.success(
                    `${result.created} Referenz${result.created !== 1 ? 'en' : ''} (Entwürfe) erfolgreich erstellt.`,
                  )
                  onOpenChange(false)
                  setGroups([])
                  router.refresh()
                } else {
                  toast.error(result.error)
                }
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Import fehlgeschlagen.')
              } finally {
                onLoadingChange?.(false)
              }
            }}
          >
            {loading ? (
              <>
                <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                Import läuft…
              </>
            ) : (
              `Import starten (${groups.length} Gruppe${groups.length !== 1 ? 'n' : ''}, ${totalFiles} Dateien)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

