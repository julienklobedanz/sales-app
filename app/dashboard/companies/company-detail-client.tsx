'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  Building2Icon,
  Wallet,
  Trophy,
  ShieldAlert,
  Settings,
  Users,
  Plus,
  Loader2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CompanyStrategyRow, StakeholderRow, StakeholderRole, CompanyRefRow } from './actions'
import {
  upsertCompanyStrategy,
  getStakeholders,
  createStakeholder,
  deleteStakeholder,
} from './actions'

const STAKEHOLDER_ROLE_CONFIG: Record<
  StakeholderRole,
  { label: string; Icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  economic_buyer: {
    label: 'Economic Buyer',
    Icon: Wallet,
    className: 'text-amber-500',
  },
  champion: {
    label: 'Champion',
    Icon: Trophy,
    className: 'text-emerald-500',
  },
  blocker: {
    label: 'Blocker',
    Icon: ShieldAlert,
    className: 'text-rose-500',
  },
  technical_buyer: {
    label: 'Technical Buyer',
    Icon: Settings,
    className: 'text-slate-500',
  },
  user_buyer: {
    label: 'User Buyer',
    Icon: Users,
    className: 'text-blue-500',
  },
}

type Company = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
}

type Props = {
  company: Company
  strategy: CompanyStrategyRow | null
  stakeholders: StakeholderRow[]
  references: CompanyRefRow[]
}

export function CompanyDetailClient({
  company,
  strategy: initialStrategy,
  stakeholders: initialStakeholders,
  references,
}: Props) {
  const [strategy, setStrategy] = useState(initialStrategy)
  const [goals, setGoals] = useState(strategy?.company_goals ?? '')
  const [redFlags, setRedFlags] = useState(strategy?.red_flags ?? '')
  const [competition, setCompetition] = useState(strategy?.competition ?? '')
  const [nextSteps, setNextSteps] = useState(strategy?.next_steps ?? '')
  const [strategySaving, setStrategySaving] = useState(false)
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [stakeholderModalOpen, setStakeholderModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newRole, setNewRole] = useState<StakeholderRole>('champion')
  const [stakeholderSaving, setStakeholderSaving] = useState(false)

  const handleSaveStrategy = async () => {
    setStrategySaving(true)
    const res = await upsertCompanyStrategy(company.id, {
      company_goals: goals || null,
      red_flags: redFlags || null,
      competition: competition || null,
      next_steps: nextSteps || null,
    })
    setStrategySaving(false)
    if (res.success) {
      setStrategy((prev) => ({
        ...(prev ?? { id: '', company_id: company.id, updated_at: null }),
        company_goals: goals || null,
        red_flags: redFlags || null,
        competition: competition || null,
        next_steps: nextSteps || null,
      }))
      toast.success('Strategie gespeichert.')
    } else toast.error(res.error)
  }

  const handleAddStakeholder = async () => {
    if (!newName.trim()) return
    setStakeholderSaving(true)
    const res = await createStakeholder(company.id, {
      name: newName.trim(),
      title: newTitle.trim() || null,
      role: newRole,
    })
    setStakeholderSaving(false)
    if (res.success) {
      const list = await getStakeholders(company.id)
      setStakeholders(list)
      setStakeholderModalOpen(false)
      setNewName('')
      setNewTitle('')
      setNewRole('champion')
      toast.success('Stakeholder hinzugefügt.')
    } else toast.error(res.error)
  }

  const handleDeleteStakeholder = async (id: string) => {
    const { deleteStakeholder: del } = await import('./actions')
    const res = await del(id)
    if (res.success) {
      setStakeholders((prev) => prev.filter((s) => s.id !== id))
      toast.success('Stakeholder entfernt.')
    } else toast.error(res.error)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        {company.logo_url ? (
          <div className="relative size-16 shrink-0 rounded-lg border bg-muted overflow-hidden">
            <Image
              src={company.logo_url}
              alt=""
              fill
              className="object-contain"
              sizes="64px"
            />
          </div>
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border bg-muted">
            <Building2Icon className="size-8 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          {company.industry && (
            <p className="text-sm text-muted-foreground mt-0.5">{company.industry}</p>
          )}
          {company.headquarters && (
            <p className="text-sm text-muted-foreground">{company.headquarters}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="roadmap" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="roadmap">Opportunity Roadmap</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholder-Mapping</TabsTrigger>
          <TabsTrigger value="references">Referenz-Archiv</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strategische Analyse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Unternehmensziele (Was wollen sie erreichen?)</Label>
                <Textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Ziele des Unternehmens …"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Red Flags (Risiken im Deal)</Label>
                <Textarea
                  value={redFlags}
                  onChange={(e) => setRedFlags(e.target.value)}
                  placeholder="Risiken notieren …"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Wettbewerb (Wer funkt uns dazwischen?)</Label>
                <Textarea
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  placeholder="Wettbewerber …"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Nächste Schritte</Label>
                <Textarea
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="Konkrete nächste Schritte …"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <Button onClick={handleSaveStrategy} disabled={strategySaving}>
                {strategySaving && <Loader2 className="size-4 animate-spin mr-2" />}
                {strategySaving ? 'Speichern…' : 'Strategie speichern'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stakeholders" className="mt-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Schachfiguren im Deal – Rollen und Ansprechpartner.
            </p>
            <Button onClick={() => setStakeholderModalOpen(true)} size="sm">
              <Plus className="size-4 mr-2" />
              Stakeholder hinzufügen
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stakeholders.map((s) => {
              const config = STAKEHOLDER_ROLE_CONFIG[s.role]
              const Icon = config.Icon
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`size-5 shrink-0 ${config.className}`} />
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{s.name}</CardTitle>
                          {s.title && (
                            <p className="text-xs text-muted-foreground truncate">{s.title}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteStakeholder(s.id)}
                        aria-label="Stakeholder entfernen"
                      >
                        ×
                      </Button>
                    </div>
                    <span className={`text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
          {stakeholders.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Noch keine Stakeholder angelegt. Klicke auf „Stakeholder hinzufügen“.
            </p>
          )}

          <Dialog open={stakeholderModalOpen} onOpenChange={setStakeholderModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Stakeholder hinzufügen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Titel / Rolle im Unternehmen</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="z. B. CIO, Abteilungsleiter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rolle im Deal</Label>
                  <Select
                    value={newRole}
                    onValueChange={(v) => setNewRole(v as StakeholderRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STAKEHOLDER_ROLE_CONFIG) as StakeholderRole[]).map(
                        (role) => (
                          <SelectItem key={role} value={role}>
                            {STAKEHOLDER_ROLE_CONFIG[role].label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStakeholderModalOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleAddStakeholder} disabled={!newName.trim() || stakeholderSaving}>
                  {stakeholderSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  {stakeholderSaving ? 'Wird hinzugefügt…' : 'Hinzufügen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="references" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Projekte & Referenzen</CardTitle>
              <p className="text-sm text-muted-foreground">
                Alle dieser Firma zugeordneten Referenzen.
              </p>
            </CardHeader>
            <CardContent>
              {references.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Keine Referenzen für diese Firma.
                </p>
              ) : (
                <ul className="divide-y">
                  {references.map((ref) => (
                    <li key={ref.id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        href="/dashboard"
                        className="text-primary hover:underline font-medium"
                      >
                        {ref.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{ref.status}</span>
                        {ref.project_status && <span>· {ref.project_status}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
