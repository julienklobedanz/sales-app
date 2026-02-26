'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEAL_STATUS_LABELS, type DealWithReferences } from './types'
import { submitReferenceRequest, addReferenceToDeal, removeReferenceFromDeal } from './actions'
import { FileTextIcon, SendIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

export type RefOption = { id: string; title: string; company_name: string }

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
}

export function DealDetailContent({
  deal,
  allReferences,
}: {
  deal: DealWithReferences
  allReferences: RefOption[]
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const linkedIds = new Set(deal.references.map((r) => r.id))
  const availableRefs = allReferences.filter((r) => !linkedIds.has(r.id))
  const [linkRefId, setLinkRefId] = useState('')
  const [linking, setLinking] = useState(false)

  async function handleSubmitRequest() {
    setSending(true)
    const result = await submitReferenceRequest(deal.id, message)
    setSending(false)
    if (result.success) {
      toast.success('Nachricht an den Reference Manager gesendet.')
      setModalOpen(false)
      setMessage('')
    } else {
      toast.error(result.error)
    }
  }

  async function handleAddReference() {
    if (!linkRefId) return
    setLinking(true)
    const result = await addReferenceToDeal(deal.id, linkRefId)
    setLinking(false)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Referenz verknüpft.')
      setLinkRefId('')
      router.refresh()
    }
  }

  async function handleRemoveReference(referenceId: string) {
    const result = await removeReferenceFromDeal(deal.id, referenceId)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Verknüpfung entfernt.')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold leading-tight tracking-tight">{deal.title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{DEAL_STATUS_LABELS[deal.status]}</Badge>
          {deal.company_name && (
            <span className="text-muted-foreground text-sm">{deal.company_name}</span>
          )}
          {deal.expiry_date && (
            <span className="text-muted-foreground text-sm">Ablauf: {formatDate(deal.expiry_date)}</span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Deal-Infos</CardTitle>
          <CardDescription className="text-xs">Unternehmen, Volumen, Verantwortliche.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 py-0 text-sm">
          {deal.company_name && <p><strong>Unternehmen:</strong> {deal.company_name}</p>}
          {deal.industry && <p><strong>Branche:</strong> {deal.industry}</p>}
          {deal.volume && <p><strong>Volumen:</strong> {deal.volume}</p>}
          {deal.account_manager_name && <p><strong>Account Manager:</strong> {deal.account_manager_name}</p>}
          {deal.sales_manager_name && <p><strong>Sales Manager:</strong> {deal.sales_manager_name}</p>}
          <p><strong>Sichtbarkeit:</strong> {deal.is_public ? 'Öffentlich (Team)' : 'Privat'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Verknüpfte Referenzen</CardTitle>
          <CardDescription className="text-xs">Mit diesem Deal verknüpfte Referenzen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-0">
          {deal.references.length === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Referenzen verknüpft.</p>
          ) : (
            <ul className="space-y-2">
              {deal.references.map((ref) => (
                <li key={ref.id} className="flex items-center gap-2">
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <Link href={`/dashboard/edit/${ref.id}`} className="min-w-0 flex-1 hover:underline truncate text-sm">
                    {ref.title}
                  </Link>
                  <span className="text-muted-foreground text-xs shrink-0">({ref.company_name})</span>
                  <Button variant="ghost" size="sm" className="h-7" onClick={() => handleRemoveReference(ref.id)}>
                    <Trash2Icon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {availableRefs.length > 0 && (
            <div className="flex gap-2 pt-2">
              <Select value={linkRefId || '__none__'} onValueChange={(v) => setLinkRefId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="max-w-[240px] h-8 text-xs">
                  <SelectValue placeholder="Referenz verknüpfen …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Auswählen —</SelectItem>
                  {availableRefs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.title} ({r.company_name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" onClick={handleAddReference} disabled={!linkRefId || linking}>
                <PlusCircleIcon className="mr-1 size-4" />
                Verknüpfen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Referenzbedarf melden</CardTitle>
          <CardDescription className="text-xs">
            Keine passende Referenz? Nachricht an den Reference Manager senden.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-0">
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <SendIcon className="mr-2 size-4" />
                Referenzbedarf melden
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Referenzbedarf melden</DialogTitle>
                <DialogDescription>
                  Beschreiben Sie kurz, welche Art von Referenz Sie für diesen Deal benötigen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <p><strong>Deal:</strong> {deal.title}</p>
                  {deal.company_name && <p><strong>Unternehmen:</strong> {deal.company_name}</p>}
                  {deal.industry && <p><strong>Branche:</strong> {deal.industry}</p>}
                  {deal.volume && <p><strong>Volumen:</strong> {deal.volume}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref-request-message">Ihre Nachricht *</Label>
                  <Textarea
                    id="ref-request-message"
                    placeholder="z. B. Referenz aus dem Finanzsektor mit Cloud-Migration …"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)} disabled={sending}>
                  Abbrechen
                </Button>
                <Button onClick={handleSubmitRequest} disabled={sending || !message.trim()}>
                  {sending ? 'Wird gesendet …' : 'Nachricht senden'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
