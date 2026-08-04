'use client'

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
import { Loader } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { deleteCompanyWithData } from './actions'
import type { CompanyCard } from './companies-grid-types'

export function CompaniesGridDeleteDialog({
  deleteTarget,
  deleting,
  setDeleteTarget,
  setDeleting,
}: {
  deleteTarget: CompanyCard | null
  deleting: boolean
  setDeleteTarget: (company: CompanyCard | null) => void
  setDeleting: (deleting: boolean) => void
}) {
  return (
    <AlertDialog
      open={!!deleteTarget}
      onOpenChange={(open) => {
        if (!open && !deleting) setDeleteTarget(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bist du dir absolut sicher?</AlertDialogTitle>
          <AlertDialogDescription>
            Diese Aktion kann nicht rückgängig gemacht werden. Dies wird den Kunden und alle damit verbundenen Deals,
            Strategien und Kontakte dauerhaft löschen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleting}
            onClick={() => {
              if (!deleting) setDeleteTarget(null)
            }}
          >
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting || !deleteTarget}
            onClick={async () => {
              if (!deleteTarget) return
              try {
                setDeleting(true)
                const result = await deleteCompanyWithData(deleteTarget.id)
                if (!result.success && result.error) {
                  console.error(result.error)
                }
                setDeleteTarget(null)
              } finally {
                setDeleting(false)
              }
            }}
            className={buttonVariants({ variant: 'destructive' })}
          >
            {deleting && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
