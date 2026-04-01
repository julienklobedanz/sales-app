'use client'

import { useRouter } from 'next/navigation'
import { Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

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
import { AppIcon } from '@/lib/icons'

import { deleteReference } from '../actions'

export function BulkDeleteReferencesDialog({
  open,
  onOpenChange,
  ids,
  loading,
  onLoadingChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ids: string[]
  loading: boolean
  onLoadingChange: (loading: boolean) => void
  onSuccess: () => void
}) {
  const router = useRouter()
  const count = ids.length

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Referenzen löschen</AlertDialogTitle>
          <AlertDialogDescription>
            Möchtest du die {count} ausgewählten Referenz{count !== 1 ? 'en' : ''} wirklich
            dauerhaft löschen?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={async (e: React.MouseEvent) => {
              e.preventDefault()
              onLoadingChange(true)
              try {
                for (const id of ids) {
                  try {
                    await deleteReference(id)
                  } catch {
                    toast.error('Fehler beim Löschen einer Referenz.')
                    onLoadingChange(false)
                    onOpenChange(false)
                    return
                  }
                }
                onSuccess()
                toast.success(`${count} Referenz${count !== 1 ? 'en' : ''} gelöscht.`)
                router.refresh()
              } finally {
                onLoadingChange(false)
              }
            }}
          >
            {loading ? (
              <>
                <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                Wird gelöscht…
              </>
            ) : (
              'Dauerhaft löschen'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
