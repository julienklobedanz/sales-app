'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRole } from '@/hooks/useRole'
import { Building2Icon, Globe2, Loader2, MapPinIcon, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import type {
  AccountDealRow,
  CompanyRefRow,
  CompanyStrategyRow,
  ContactPersonRow,
  StakeholderRole,
  StakeholderRow,
} from './actions'
import {
  createContactPerson,
  createStakeholder,
  deleteContactPerson,
  deleteStakeholder,
  suggestStrategyField,
  updateContactPerson,
  updateStakeholder,
  upsertCompanyStrategy,
} from './actions'

const STAKEHOLDER_ROLE_BADGES: Record<StakeholderRole, { label: string; className: string }> = {
  economic_buyer: { label: 'Economic Buyer', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  champion: { label: 'Champion', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  blocker: { label: 'Blocker', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  technical_buyer: { label: 'Technical Buyer', className: 'bg-slate-50 text-slate-700 border-slate-200' },
  user_buyer: { label: 'User Buyer', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  unknown: { label: 'Unbekannt', className: 'bg-muted text-foreground border-border' },
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
  contacts: ContactPersonRow[]
  references: CompanyRefRow[]
  activeDeals: AccountDealRow[]
}

export function CompanyDetailClient({
  company,
  strategy: initialStrategy,
  stakeholders: initialStakeholders,
  contacts: initialContacts,
  references,
  activeDeals,
}: Props) {
  const { isAdmin, isAccountManager, isSales } = useRole()
  const canEdit = isAdmin || isAccountManager

  const [goals, setGoals] = useState(initialStrategy?.company_goals ?? '')
  const [valueProposition, setValueProposition] = useState(initialStrategy?.value_proposition ?? '')
  const [redFlags, setRedFlags] = useState(initialStrategy?.red_flags ?? '')
  const [competition, setCompetition] = useState(initialStrategy?.competition ?? '')
  const [nextSteps, setNextSteps] = useState(initialStrategy?.next_steps ?? '')
  const [strategySaving, setStrategySaving] = useState(false)

  const lastSavedRef = useRef({
    goals: initialStrategy?.company_goals ?? '',
    valueProposition: initialStrategy?.value_proposition ?? '',
    redFlags: initialStrategy?.red_flags ?? '',
    competition: initialStrategy?.competition ?? '',
    nextSteps: initialStrategy?.next_steps ?? '',
  })

  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [contacts, setContacts] = useState(initialContacts)

  const [stakeholderOpen, setStakeholderOpen] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState<StakeholderRow | null>(null)
  const [shName, setShName] = useState('')
  const [shTitle, setShTitle] = useState('')
  const [shRole, setShRole] = useState<StakeholderRole>('champion')
  const [shNotes, setShNotes] = useState('')
  const [stakeholderSaving, setStakeholderSaving] = useState(false)

  const [contactOpen, setContactOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactPersonRow | null>(null)
  const [cFirst, setCFirst] = useState('')
  const [cLast, setCLast] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cRole, setCRole] = useState('')
  const [contactSaving, setContactSaving] = useState(false)

  const saveStrategy = async (opts?: { silent?: boolean }) => {
    if (!canEdit) return
    const snapshot = { goals, valueProposition, redFlags, competition, nextSteps }
    const last = lastSavedRef.current
    const changed =
      snapshot.goals !== last.goals ||
      snapshot.valueProposition !== last.valueProposition ||
      snapshot.redFlags !== last.redFlags ||
      snapshot.competition !== last.competition ||
      snapshot.nextSteps !== last.nextSteps
    if (!changed) return

    setStrategySaving(true)
    try {
      const res = await upsertCompanyStrategy(company.id, {
        company_goals: snapshot.goals || null,
        red_flags: snapshot.redFlags || null,
        competition: snapshot.competition || null,
        next_steps: snapshot.nextSteps || null,
        value_proposition: snapshot.valueProposition || null,
      })
      if (!res.success) {
        if (!opts?.silent) toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        return
      }
      lastSavedRef.current = snapshot
      if (!opts?.silent) toast.success('Gespeichert.')
    } finally {
      setStrategySaving(false)
    }
  }

  const strategyFields = useMemo(
    () => [
      { key: 'company_goals' as const, label: 'Unternehmensziele', value: goals, set: setGoals },
      { key: 'value_proposition' as const, label: 'Value Proposition', value: valueProposition, set: setValueProposition },
      { key: 'red_flags' as const, label: 'Herausforderungen / Red Flags', value: redFlags, set: setRedFlags },
      { key: 'competition' as const, label: 'Wettbewerb', value: competition, set: setCompetition },
      { key: 'next_steps' as const, label: 'Nächste Schritte', value: nextSteps, set: setNextSteps },
    ],
    [goals, valueProposition, redFlags, competition, nextSteps]
  )

  const referenceStatusLabel = (s: string) => {
    if (s === 'approved') return 'Freigegeben'
    if (s === 'internal_only') return 'Intern'
    if (s === 'draft') return 'Entwurf'
    if (s === 'anonymized') return 'Anonymisiert'
    return s
  }

  const openStakeholderDialog = (s?: StakeholderRow) => {
    setEditingStakeholder(s ?? null)
    setShName(s?.name ?? '')
    setShTitle(s?.title ?? '')
    setShRole(s?.role ?? 'champion')
    setShNotes((s as unknown as { priorities_topics?: string | null })?.priorities_topics ?? '')
    setStakeholderOpen(true)
  }

  const saveStakeholder = async () => {
    if (!canEdit) return
    if (!shName.trim()) return toast.error('Name ist erforderlich.')
    setStakeholderSaving(true)
    try {
      const payload = {
        name: shName.trim(),
        title: shTitle.trim() || null,
        role: shRole,
        priorities_topics: shNotes.trim() || null,
      }
      const res = editingStakeholder
        ? await updateStakeholder(editingStakeholder.id, payload)
        : await createStakeholder(company.id, payload)
      if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
      toast.success(editingStakeholder ? 'Stakeholder aktualisiert.' : 'Stakeholder hinzugefügt.')
      setStakeholderOpen(false)
      if (editingStakeholder) {
        setStakeholders((prev) =>
          prev.map((p) => (p.id === editingStakeholder.id ? ({ ...p, ...payload } as StakeholderRow) : p))
        )
      }
    } finally {
      setStakeholderSaving(false)
    }
  }

  const removeStakeholder = async (id: string) => {
    if (!canEdit) return
    const res = await deleteStakeholder(id)
    if (!res.success) return toast.error(res.error ?? 'Löschen fehlgeschlagen.')
    setStakeholders((prev) => prev.filter((s) => s.id !== id))
    toast.success('Stakeholder gelöscht.')
  }

  const openContactDialog = (c?: ContactPersonRow) => {
    setEditingContact(c ?? null)
    setCFirst(c?.first_name ?? '')
    setCLast(c?.last_name ?? '')
    setCEmail(c?.email ?? '')
    setCPhone(c?.phone ?? '')
    setCRole(c?.role ?? '')
    setContactOpen(true)
  }

  const saveContact = async () => {
    if (!canEdit) return
    setContactSaving(true)
    try {
      const payload = {
        first_name: cFirst.trim() || null,
        last_name: cLast.trim() || null,
        email: cEmail.trim() || null,
        phone: cPhone.trim() || null,
        role: cRole.trim() || null,
      }
      const res = editingContact
        ? await updateContactPerson(editingContact.id, payload)
        : await createContactPerson(company.id, payload)
      if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
      toast.success(editingContact ? 'Kontakt aktualisiert.' : 'Kontakt hinzugefügt.')
      setContactOpen(false)
      if (editingContact) {
        setContacts((prev) => prev.map((p) => (p.id === editingContact.id ? ({ ...p, ...payload } as ContactPersonRow) : p)))
      }
    } finally {
      setContactSaving(false)
    }
  }

  const removeContact = async (id: string) => {
    if (!canEdit) return
    const res = await deleteContactPerson(id)
    if (!res.success) return toast.error(res.error ?? 'Löschen fehlgeschlagen.')
    setContacts((prev) => prev.filter((c) => c.id !== id))
    toast.success('Kontakt gelöscht.')
  }

  const roleBadge = (role: StakeholderRole) => {
    const cfg = STAKEHOLDER_ROLE_BADGES[role] ?? STAKEHOLDER_ROLE_BADGES.unknown
    return (
      <Badge variant="outline" className={cfg.className}>
        {cfg.label}
      </Badge>
    )
  }

  const runSuggestion = async (field: (typeof strategyFields)[number]['key'], currentText: string) => {
    try {
      const res = await suggestStrategyField({ companyId: company.id, field, currentText })
      if (!res.success || !res.suggestion) {
        toast.error(res.error ?? 'KI-Vorschlag fehlgeschlagen.')
        return null
      }
      return res.suggestion
    } catch {
      toast.error('KI-Vorschlag fehlgeschlagen.')
      return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          {company.logo_url ? (
            <div className="relative size-14 overflow-hidden rounded-2xl border bg-muted">
              <Image src={company.logo_url} alt="" fill className="object-contain" sizes="56px" />
            </div>
          ) : (
            <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted">
              <Building2Icon className="size-7 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{company.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {company.industry && <span>{company.industry}</span>}
              {company.headquarters && (
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="h-3.5 w-3.5" />
                  {company.headquarters}
                </span>
              )}
              {company.website_url && (
                <a
                  className="inline-flex items-center gap-1 hover:underline"
                  href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/accounts">Zurück</Link>
        </Button>
      </div>

      <Tabs defaultValue="strategy" className="w-full">
        <TabsList className="w-full justify-start gap-1">
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholder</TabsTrigger>
          <TabsTrigger value="contacts">Kontakte</TabsTrigger>
          <TabsTrigger value="links">Referenzen &amp; Deals</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy</CardTitle>
              <CardDescription>
                {isSales ? 'Read-only – nur Account Manager/Admin können bearbeiten.' : 'Inline editieren. Autosave bei Blur.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {strategyFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>{f.label}</Label>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const s = await runSuggestion(f.key, f.value)
                          if (s) f.set(s)
                        }}
                        disabled={strategySaving}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        KI-Vorschlag
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    onBlur={() => void saveStrategy({ silent: true })}
                    disabled={!canEdit || strategySaving}
                    className="min-h-[110px]"
                  />
                </div>
              ))}
              <div className="flex items-center justify-end gap-2">
                <Button type="button" onClick={() => void saveStrategy()} disabled={!canEdit || strategySaving}>
                  {strategySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stakeholders" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Stakeholder</h2>
              <p className="text-sm text-muted-foreground">Economic Buyer, Champion, Blocker, etc.</p>
            </div>
            {canEdit && (
              <Button type="button" onClick={() => openStakeholderDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Stakeholder hinzufügen
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              {stakeholders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine Stakeholder.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Titel</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stakeholders.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.title ?? '—'}</TableCell>
                        <TableCell>{roleBadge(s.role)}</TableCell>
                        <TableCell className="text-right">
                          {canEdit ? (
                            <div className="inline-flex items-center gap-1">
                              <Button type="button" variant="ghost" size="icon" onClick={() => openStakeholderDialog(s)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" onClick={() => void removeStakeholder(s.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Kontakte</h2>
              <p className="text-sm text-muted-foreground">Ansprechpartner (intern/extern).</p>
            </div>
            {canEdit && (
              <Button type="button" onClick={() => openContactDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Kontakt hinzufügen
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine Kontakte.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c) => {
                      const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{c.role ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            {canEdit ? (
                              <div className="inline-flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon" onClick={() => openContactDialog(c)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => void removeContact(c.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verknüpfte Referenzen</CardTitle>
              <CardDescription>{references.length} Referenzen</CardDescription>
            </CardHeader>
            <CardContent>
              {references.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Referenzen verknüpft.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Nutzung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {references.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          <Link className="hover:underline" href={`/dashboard/evidence/${r.id}`}>
                            {r.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{referenceStatusLabel(r.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aktive Deals</CardTitle>
              <CardDescription>{activeDeals.length} Deals</CardDescription>
            </CardHeader>
            <CardContent>
              {activeDeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine aktiven Deals.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titel</TableHead>
                      <TableHead>Volumen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ablauf</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeDeals.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          <Link className="hover:underline" href={`/dashboard/deals/${d.id}`}>
                            {d.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{d.volume ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{d.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{d.expiry_date ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={stakeholderOpen} onOpenChange={(v) => !stakeholderSaving && setStakeholderOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStakeholder ? 'Stakeholder bearbeiten' : 'Stakeholder hinzufügen'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={shName} onChange={(e) => setShName(e.target.value)} disabled={stakeholderSaving} />
            </div>
            <div className="grid gap-2">
              <Label>Titel</Label>
              <Input value={shTitle} onChange={(e) => setShTitle(e.target.value)} disabled={stakeholderSaving} />
            </div>
            <div className="grid gap-2">
              <Label>Rolle</Label>
              <Select value={shRole} onValueChange={(v) => setShRole(v as StakeholderRole)} disabled={stakeholderSaving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STAKEHOLDER_ROLE_BADGES) as StakeholderRole[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {STAKEHOLDER_ROLE_BADGES[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Notizen</Label>
              <Textarea value={shNotes} onChange={(e) => setShNotes(e.target.value)} disabled={stakeholderSaving} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStakeholderOpen(false)} disabled={stakeholderSaving}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void saveStakeholder()} disabled={stakeholderSaving}>
              {stakeholderSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={(v) => !contactSaving && setContactOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Kontakt bearbeiten' : 'Kontakt hinzufügen'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Vorname</Label>
              <Input value={cFirst} onChange={(e) => setCFirst(e.target.value)} disabled={contactSaving} />
            </div>
            <div className="grid gap-2">
              <Label>Nachname</Label>
              <Input value={cLast} onChange={(e) => setCLast(e.target.value)} disabled={contactSaving} />
            </div>
            <div className="grid gap-2">
              <Label>E-Mail</Label>
              <Input value={cEmail} onChange={(e) => setCEmail(e.target.value)} disabled={contactSaving} />
            </div>
            <div className="grid gap-2">
              <Label>Telefon</Label>
              <Input value={cPhone} onChange={(e) => setCPhone(e.target.value)} disabled={contactSaving} />
            </div>
            <div className="grid gap-2">
              <Label>Rolle</Label>
              <Input value={cRole} onChange={(e) => setCRole(e.target.value)} disabled={contactSaving} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setContactOpen(false)} disabled={contactSaving}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void saveContact()} disabled={contactSaving}>
              {contactSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

