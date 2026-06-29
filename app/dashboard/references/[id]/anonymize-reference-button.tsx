'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { createAnonymizedReferenceVersion } from './actions'
import { ROUTES } from '@/lib/routes'

export function AnonymizeReferenceButton({ referenceId }: { referenceId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full" disabled={isPending}>
          Anonymisierte Version erstellen
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anonymisierte Version erstellen?</AlertDialogTitle>
          <AlertDialogDescription>
            KI wird Firmennamen, Kontakte und Volumen automatisch anonymisieren. Fortfahren?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              startTransition(async () => {
                const result = await createAnonymizedReferenceVersion(referenceId)
                if (!result.success) {
                  toast.error(result.error)
                  return
                }
                toast.success('Anonymisierte Version erstellt.')
                router.push(ROUTES.evidence.detail(result.referenceId))
              })
            }}
          >
            {isPending ? 'Wird erstellt ...' : 'Fortfahren'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
