'use client'

import { useCallback, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createComplianceDocumentType,
  deleteComplianceDocumentType,
  listComplianceDocumentTypeOptions,
  updateComplianceDocumentType,
} from '@/app/dashboard/settings/compliance-document-type-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getSystemComplianceDocumentTypes,
  sortComplianceDocumentTypeOptions,
  type ComplianceDocumentTypeOption,
} from '@/lib/compliance/document-types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTypesChange?: (types: ComplianceDocumentTypeOption[]) => void
}

export function ComplianceDocumentTypesDialog({ open, onOpenChange, onTypesChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [types, setTypes] = useState<ComplianceDocumentTypeOption[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const customTypes = types.filter((t) => !t.isSystem)
  const systemTypes = sortComplianceDocumentTypeOptions(getSystemComplianceDocumentTypes())

  const reload = useCallback(async () => {
    setLoading(true)
    const result = await listComplianceDocumentTypeOptions()
    setLoading(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setTypes(result.types)
    onTypesChange?.(result.types)
  }, [onTypesChange])

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (next) {
      setEditingId(null)
      setNewLabel('')
      void reload()
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const label = newLabel.trim()
    if (!label) return
    setCreating(true)
    const result = await createComplianceDocumentType(label)
    setCreating(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Dokumenttyp hinzugefügt.')
    setNewLabel('')
    await reload()
  }

  async function handleSaveEdit(id: string) {
    const label = editLabel.trim()
    if (!label) return
    setSavingEdit(true)
    const result = await updateComplianceDocumentType(id, label)
    setSavingEdit(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Dokumenttyp aktualisiert.')
    setEditingId(null)
    await reload()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteComplianceDocumentType(id)
    setDeletingId(null)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Dokumenttyp gelöscht.')
    await reload()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2 pb-2">
          <DialogTitle>Dokumenttypen verwalten</DialogTitle>
          <DialogDescription>
            Standardtypen sind fest hinterlegt. Eigene Typen kannst du hinzufügen, umbenennen und
            löschen (sofern nicht in Verwendung).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Standard
            </p>
            <ul className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              {systemTypes.map((t) => (
                <li key={t.slug} className="py-1">
                  {t.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eigene Typen
            </p>
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Laden…
              </div>
            ) : customTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine eigenen Typen angelegt.</p>
            ) : (
              <ul className="space-y-2">
                {customTypes.map((t) => (
                  <li
                    key={t.id ?? t.slug}
                    className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2"
                  >
                    {editingId === t.id ? (
                      <>
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-8 flex-1"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          disabled={savingEdit}
                          onClick={() => t.id && void handleSaveEdit(t.id)}
                        >
                          Speichern
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => setEditingId(null)}
                        >
                          Abbrechen
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                          {t.label}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label={`${t.label} bearbeiten`}
                          onClick={() => {
                            setEditingId(t.id ?? null)
                            setEditLabel(t.label)
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`${t.label} löschen`}
                          disabled={deletingId === t.id}
                          onClick={() => t.id && void handleDelete(t.id)}
                        >
                          {deletingId === t.id ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="size-4" aria-hidden />
                          )}
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleCreate} className="space-y-2 border-t border-border/70 pt-4">
            <Label htmlFor="new-compliance-type">Neuer Dokumenttyp</Label>
            <div className="flex gap-2">
              <Input
                id="new-compliance-type"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="z. B. TISAX"
                disabled={creating}
                className="flex-1"
              />
              <Button type="submit" size="sm" className="h-10 shrink-0 gap-1" disabled={creating}>
                {creating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                Hinzufügen
              </Button>
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
