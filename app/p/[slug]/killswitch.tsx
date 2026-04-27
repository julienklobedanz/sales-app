'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { ShieldAlert } from '@hugeicons/core-free-icons'
import { deactivatePortfolio } from '../actions'
import { toast } from 'sonner'
import { AppIcon } from '@/lib/icons'

export function PublicPortfolioKillswitch({ slug }: { slug: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDeactivate() {
    setLoading(true)
    try {
      const { success } = await deactivatePortfolio(slug)
      if (success) {
        toast.success('Zugriff gesperrt. Dieser Link ist nicht mehr gültig.')
        setOpen(false)
        router.refresh()
      } else {
        toast.error('Sperren fehlgeschlagen.')
      }
    } catch {
      toast.error('Sperren fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive text-xs">
          <AppIcon icon={ShieldAlert} size={14} className="mr-1.5" />
          Diesen Zugriff sofort sperren
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Zugriff sperren?</AlertDialogTitle>
          <AlertDialogDescription>
            Der Link wird sofort deaktiviert und ist danach für niemanden mehr erreichbar – auch nicht für Sie.
            Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDeactivate()
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Wird gesperrt…' : 'Ja, Zugriff sperren'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
