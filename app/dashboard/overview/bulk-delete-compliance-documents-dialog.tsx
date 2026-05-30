'use client'

import { useRouter } from 'next/navigation'
import { Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { deleteComplianceDocuments } from '@/app/dashboard/settings/compliance-actions'
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
import { buttonVariants } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export function BulkDeleteComplianceDocumentsDialog({
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
          <AlertDialogTitle>Zertifikate löschen</AlertDialogTitle>
          <AlertDialogDescription>
            Möchtest du die {count} ausgewählten Zertifikat{count !== 1 ? 'e' : ''} wirklich
            dauerhaft löschen? Die zugehörigen PDF-Dateien werden ebenfalls entfernt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: 'destructive' }))}
            disabled={loading}
            onClick={async (e: React.MouseEvent) => {
              e.preventDefault()
              onLoadingChange(true)
              try {
                const result = await deleteComplianceDocuments(ids)
                if (!result.success) {
                  toast.error(result.error)
                  return
                }
                onSuccess()
                toast.success(
                  `${result.deleted} Zertifikat${result.deleted !== 1 ? 'e' : ''} gelöscht.`
                )
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
