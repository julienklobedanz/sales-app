'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Loader, RefreshCw, Trash2 } from '@hugeicons/core-free-icons'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppIcon } from '@/lib/icons'

import type { DeletedReferenceRow } from '../actions'
import { emptyTrash, hardDeleteReference, restoreReference } from '../actions'

export function TrashDialog({
  open,
  onOpenChange,
  deletedCount,
  trashLoading,
  trashItems,
  setTrashItems,
  confirmEmptyOpen,
  setConfirmEmptyOpen,
  emptyingTrash,
  setEmptyingTrash,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  deletedCount: number
  trashLoading: boolean
  trashItems: DeletedReferenceRow[]
  setTrashItems: Dispatch<SetStateAction<DeletedReferenceRow[]>>
  confirmEmptyOpen: boolean
  setConfirmEmptyOpen: (open: boolean) => void
  emptyingTrash: boolean
  setEmptyingTrash: (v: boolean) => void
}) {
  const router = useRouter()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setTrashItems([])
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Papierkorb ({deletedCount})</DialogTitle>
          <DialogDescription>
            Gelöschte Referenzen können hier wiederhergestellt oder endgültig entfernt werden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {trashLoading ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
              Lädt gelöschte Referenzen…
            </div>
          ) : trashItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aktuell befinden sich keine Referenzen im Papierkorb.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 text-xs">
              {trashItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {item.company_name}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={async () => {
                        try {
                          await restoreReference(item.id)
                          setTrashItems((prev) => prev.filter((x) => x.id !== item.id))
                          toast.success('Referenz wiederhergestellt.')
                          router.refresh()
                        } catch {
                          toast.error('Fehler beim Wiederherstellen.')
                        }
                      }}
                    >
                      <AppIcon icon={RefreshCw} size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        try {
                          await hardDeleteReference(item.id)
                          setTrashItems((prev) => prev.filter((x) => x.id !== item.id))
                          toast.success('Referenz endgültig gelöscht.')
                          router.refresh()
                        } catch {
                          toast.error('Fehler beim endgültigen Löschen.')
                        }
                      }}
                    >
                      <AppIcon icon={Trash2} size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {trashItems.length > 0 && (
          <DialogFooter>
            <AlertDialog
              open={confirmEmptyOpen}
              onOpenChange={(next) => {
                if (!emptyingTrash) setConfirmEmptyOpen(next)
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Papierkorb unwiderruflich leeren?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bist du sicher? Alle {trashItems.length} Referenzen im Papierkorb werden
                    endgültig gelöscht und können nicht wiederhergestellt werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={emptyingTrash}>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={emptyingTrash}
                    onClick={async (e) => {
                      e.preventDefault()
                      setEmptyingTrash(true)
                      try {
                        const result = await emptyTrash()
                        if (result.success) {
                          toast.success(
                            `Papierkorb geleert (${result.deleted} Referenz${
                              result.deleted !== 1 ? 'en' : ''
                            }).`,
                          )
                          setTrashItems([])
                          setConfirmEmptyOpen(false)
                          onOpenChange(false)
                          router.refresh()
                        } else {
                          toast.error(result.error ?? 'Fehler beim endgültigen Löschen.')
                        }
                      } catch {
                        toast.error('Fehler beim endgültigen Löschen.')
                      } finally {
                        setEmptyingTrash(false)
                      }
                    }}
                  >
                    {emptyingTrash ? (
                      <>
                        <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                        Wird geleert…
                      </>
                    ) : (
                      'Ja, alles löschen'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-2 sm:mt-0"
              disabled={emptyingTrash}
              onClick={() => setConfirmEmptyOpen(true)}
            >
              Papierkorb unwiderruflich leeren
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
