'use client'

import { useRouter } from 'next/navigation'
import { Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { deleteComplianceDocuments } from '@/app/(app)/settings/compliance-actions'
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
import { COPY } from '@/lib/copy'
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

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{COPY.compliance.deleteConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {COPY.compliance.deleteConfirmDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{COPY.compliance.deleteConfirmCancel}</AlertDialogCancel>
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
                  COPY.compliance.deleteSuccess.replace(
                    '{count}',
                    String(result.deleted),
                  ),
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
                {COPY.compliance.deletePending}
              </>
            ) : (
              COPY.compliance.deleteConfirmAction
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
