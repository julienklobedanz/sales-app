"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createDealReferenceRequest } from '../../actions'
import { Loader } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'

export function RequestNewClient({
  deals,
  initialDealId,
}: {
  deals: Array<{ id: string; title: string }>
  initialDealId: string | null
}) {
  const router = useRouter()
  const [dealId, setDealId] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialDealId) setDealId(initialDealId)
  }, [initialDealId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dealId) return toast.error('Bitte Deal auswählen.')
    if (!message.trim()) return toast.error('Bitte Beschreibung eingeben.')

    setSaving(true)
    try {
      const result = await createDealReferenceRequest({ dealId, message: message.trim() })
      if (!result.success) {
        toast.error(result.error ?? 'Konnte Anfrage nicht speichern.')
        return
      }
      toast.success('Referenzanfrage erstellt.')
      router.push(`${ROUTES.deals.root}?open=${dealId}`)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neue Referenzanfrage</CardTitle>
        <CardDescription>Wird im System gespeichert (und kann später ausgewertet werden).</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Deal *</Label>
            <Select value={dealId || '__none__'} onValueChange={(v) => setDealId(v === '__none__' ? '' : v)} disabled={saving}>
              <SelectTrigger>
                <SelectValue placeholder="Deal auswählen …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Auswählen —</SelectItem>
                {deals.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Beschreibung *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="z. B. Referenz aus Finanzdienstleistung mit SAP/S4HANA Migration, Cloud Landing Zone, ISO27001 …"
              disabled={saving}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
              Anfrage speichern
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => router.push(ROUTES.deals.root)}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

