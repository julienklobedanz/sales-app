'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createDeal } from '../actions'
import { DEAL_STATUS_LABELS, type DealStatus } from '../actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function DealForm({
  companies,
  orgProfiles,
}: {
  companies: Company[]
  orgProfiles: OrgProfile[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [status, setStatus] = useState<DealStatus>('in_negotiation')
  const [isPublic, setIsPublic] = useState(true)
  const [accountManagerId, setAccountManagerId] = useState<string>('')
  const [salesManagerId, setSalesManagerId] = useState<string>('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('company_id', companyId)
    formData.set('status', status)
    formData.set('is_public', isPublic ? 'true' : 'false')
    formData.set('account_manager_id', accountManagerId || '')
    formData.set('sales_manager_id', salesManagerId || '')
    const result = await createDeal(formData)
    setPending(false)
    if (result.success && result.id) {
      toast.success('Deal angelegt.')
      router.push(`/dashboard/deals/${result.id}`)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Fehler beim Anlegen.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neuer Deal</CardTitle>
        <CardDescription>Titel, Unternehmen, Status und Ablaufdatum.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input id="title" name="title" required placeholder="z. B. Cloud-Migration BMW" disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label>Unternehmen</Label>
            <Select value={companyId || '__none__'} onValueChange={(v) => setCompanyId(v === '__none__' ? '' : v)} disabled={pending}>
              <SelectTrigger>
                <SelectValue placeholder="Optional auswählen …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Keins —</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="company_id" value={companyId} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Branche</Label>
              <Input id="industry" name="industry" placeholder="z. B. Automotive" disabled={pending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">Volumen</Label>
              <Input id="volume" name="volume" placeholder="z. B. €5 Mio" disabled={pending} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DealStatus)} disabled={pending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DEAL_STATUS_LABELS) as DealStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{DEAL_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry_date">Ablaufdatum</Label>
            <Input id="expiry_date" name="expiry_date" type="date" disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label>Sichtbarkeit</Label>
            <Select value={isPublic ? 'public' : 'private'} onValueChange={(v) => setIsPublic(v === 'public')} disabled={pending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Öffentlich (Team)</SelectItem>
                <SelectItem value="private">Privat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Manager</Label>
              <Select value={accountManagerId || '__none__'} onValueChange={(v) => setAccountManagerId(v === '__none__' ? '' : v)} disabled={pending}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keiner —</SelectItem>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sales Manager</Label>
              <Select value={salesManagerId || '__none__'} onValueChange={(v) => setSalesManagerId(v === '__none__' ? '' : v)} disabled={pending}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keiner —</SelectItem>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Deal anlegen
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => router.push('/dashboard/deals')}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
