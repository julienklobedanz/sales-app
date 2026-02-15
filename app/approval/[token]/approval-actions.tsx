'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateStatusViaToken } from './actions'

export function ApprovalActions({ id, token }: { id: string; token: string }) {
  const [loading, setLoading] = useState(false)

  const handleDecision = async (newStatus: string) => {
    setLoading(true)
    try {
      await updateStatusViaToken(id, token, newStatus)
      toast.success('Entscheidung gespeichert')
      window.location.reload()
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Button
        onClick={() => handleDecision('external')}
        variant="default"
        disabled={loading}
        className="bg-green-600 hover:bg-green-700"
      >
        Extern Freigegeben
      </Button>
      <Button
        onClick={() => handleDecision('internal')}
        variant="outline"
        disabled={loading}
      >
        Intern Freigegeben
      </Button>
      <Button
        onClick={() => handleDecision('anonymous')}
        variant="outline"
        disabled={loading}
      >
        Anonymisieren
      </Button>
      <Button
        onClick={() => handleDecision('restricted')}
        variant="secondary"
        disabled={loading}
      >
        Eingeschränkt
      </Button>
    </div>
  )
}
