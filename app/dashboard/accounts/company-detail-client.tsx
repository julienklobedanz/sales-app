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
import { Building2Icon, Globe2, Loader2, MapPinIcon, Pencil, Plus, Trash2 } from 'lucide-react'
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
  const [strategyEditing, setStrategyEditing] = useState(false)

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
  const [shInfluence, setShInfluence] = useState('')
  const [shAttitude, setShAttitude] = useState('')
  const [shNotes, setShNotes] = useState('')
  const [shLinkedIn, setShLinkedIn] = useState('')
  const [shPriorities, setShPriorities] = useState('')
  const [shLastContact, setShLastContact] = useState('')
  const [shSentiment, setShSentiment] = useState('')
  const [stakeholderSaving, setStakeholderSaving] = useState(false)

  const [contactOpen, setContactOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactPersonRow | null>(null)
  const [cFirst, setCFirst] = useState('')
  const [cLast, setCLast] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cRole, setCRole] = useState('')
  const [contactSaving, setContactSaving] = useState(false)
  const [cPosition, setCPosition] = useState('')
  const [cLinkedIn, setCLinkedIn] = useState('')

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
    setShInfluence((s as unknown as { influence_level?: string | null })?.influence_level ?? '')
    setShAttitude((s as unknown as { attitude?: string | null })?.attitude ?? '')
    setShNotes((s as unknown as { notes?: string | null })?.notes ?? '')
    setShLinkedIn((s as unknown as { linkedin_url?: string | null })?.linkedin_url ?? '')
    setShPriorities((s as unknown as { priorities_topics?: string | null })?.priorities_topics ?? '')
    setShLastContact(((s as unknown as { last_contact_at?: string | null })?.last_contact_at ?? '')?.slice(0, 10))
    setShSentiment((s as unknown as { sentiment?: string | null })?.sentiment ?? '')
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
        influence_level: shInfluence.trim() || null,
        attitude: shAttitude.trim() || null,
        notes: shNotes.trim() || null,
        linkedin_url: shLinkedIn.trim() || null,
        priorities_topics: shPriorities.trim() || null,
        last_contact_at: shLastContact || null,
        sentiment: shSentiment.trim() || null,
      }
      if (editingStakeholder) {
        const res = await updateStakeholder(editingStakeholder.id, payload)
        if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        toast.success('Stakeholder aktualisiert.')
        setStakeholderOpen(false)
        setStakeholders((prev) =>
          prev.map((p) => (p.id === editingStakeholder.id ? ({ ...p, ...payload } as StakeholderRow) : p))
        )
      } else {
        const res = await createStakeholder(company.id, payload)
        if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        toast.success('Stakeholder hinzugefügt.')
        setStakeholderOpen(false)
        const created = res.stakeholder
        if (created) setStakeholders((prev) => [...prev, created])
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
    setCPosition((c as unknown as { position?: string | null })?.position ?? '')
    setCLinkedIn((c as unknown as { linkedin_url?: string | null })?.linkedin_url ?? '')
    setContactOpen(true)
  }

  const saveContact = async () => {
    if (!canEdit) return
    setContactSaving(true)
    try {
      if (editingContact) {
        const res = await updateContactPerson(editingContact.id, {
          first_name: cFirst.trim() || null,
          last_name: cLast.trim() || null,
          email: cEmail.trim() || null,
          phone: cPhone.trim() || null,
          linkedin_url: cLinkedIn.trim() || null,
          role: cRole.trim() || null,
          position: cPosition.trim() || null,
        })
        if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        toast.success('Kontakt aktualisiert.')
        setContactOpen(false)
        setContacts((prev) =>
          prev.map((p) =>
            p.id === editingContact.id
              ? ({
                  ...p,
                  first_name: cFirst.trim() || null,
                  last_name: cLast.trim() || null,
                  email: cEmail.trim() || null,
                  phone: cPhone.trim() || null,
                  linkedin_url: cLinkedIn.trim() || null,
                  role: cRole.trim() || null,
                  position: cPosition.trim() || null,
                } as ContactPersonRow)
              : p
          )
        )
      } else {
        const res = await createContactPerson(company.id, {
          first_name: cFirst.trim() || null,
          last_name: cLast.trim() || null,
          email: cEmail.trim() || null,
          phone: cPhone.trim() || null,
          linkedin_url: cLinkedIn.trim() || null,
          role: cRole.trim() || null,
          position: cPosition.trim() || null,
        })
        if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        toast.success('Kontakt hinzugefügt.')
        setContactOpen(false)
        const created = res.contact
        if (created) setContacts((prev) => [...prev, created])
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Strategy</CardTitle>
                  <CardDescription>
                    {isSales
                      ? 'Read-only – nur Account Manager/Admin können bearbeiten.'
                      : 'Bearbeiten über den Button „Bearbeiten“.'}
                  </CardDescription>
                </div>
                {!strategyEditing && canEdit ? (
                  <Button type="button" variant="outline" onClick={() => setStrategyEditing(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!strategyEditing ? (
                <div className="space-y-6">
                  {strategyFields.map((f) => (
                    <div key={f.key} className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {f.label}
                      </div>
                      <div className="whitespace-pre-wrap rounded-lg border bg-background px-3 py-2 text-sm">
                        {f.value.trim().length ? f.value : '—'}
                      </div>
                    </div>
                  ))}
                  {/* Bearbeiten-Button sitzt im Header */}
                </div>
              ) : (
                <div className="space-y-6">
                  {strategyFields.map((f) => (
                    <div key={f.key} className="space-y-2">
                      <Label>{f.label}</Label>
                      <Textarea
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        disabled={!canEdit || strategySaving}
                        className="min-h-[110px]"
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Reset auf letzten Save/Initial
                        const last = lastSavedRef.current
                        setGoals(last.goals)
                        setValueProposition(last.valueProposition)
                        setRedFlags(last.redFlags)
                        setCompetition(last.competition)
                        setNextSteps(last.nextSteps)
                        setStrategyEditing(false)
                      }}
                      disabled={strategySaving}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        await saveStrategy()
                        setStrategyEditing(false)
                      }}
                      disabled={!canEdit || strategySaving}
                    >
                      {strategySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Speichern
                    </Button>
                  </div>
                </div>
              )}
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
                      <TableHead>Einfluss</TableHead>
                      <TableHead>Haltung</TableHead>
                      <TableHead>Letzter Kontakt</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stakeholders.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.title ?? '—'}</TableCell>
                        <TableCell>{roleBadge(s.role)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(s as unknown as { influence_level?: string | null }).influence_level ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {(s as unknown as { attitude?: string | null }).attitude ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {((s as unknown as { last_contact_at?: string | null }).last_contact_at ?? '')?.slice(0, 10) || '—'}
                        </TableCell>
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
                      <TableHead>LinkedIn</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Position</TableHead>
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
                          <TableCell className="text-muted-foreground">{(c.phone ?? '') || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {(c as unknown as { linkedin_url?: string | null }).linkedin_url ? (
                              <a
                                className="hover:underline"
                                href={(c as unknown as { linkedin_url?: string | null }).linkedin_url as string}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Link
                              </a>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{(c.role ?? '') || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {((c as unknown as { position?: string | null }).position ?? '') || '—'}
                          </TableCell>
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
              <Label>Einfluss</Label>
              <Input value={shInfluence} onChange={(e) => setShInfluence(e.target.value)} disabled={stakeholderSaving} placeholder="z. B. hoch / mittel / niedrig" />
            </div>
            <div className="grid gap-2">
              <Label>Haltung</Label>
              <Input value={shAttitude} onChange={(e) => setShAttitude(e.target.value)} disabled={stakeholderSaving} placeholder="z. B. Champion / neutral / kritisch" />
            </div>
            <div className="grid gap-2">
              <Label>LinkedIn</Label>
              <Input value={shLinkedIn} onChange={(e) => setShLinkedIn(e.target.value)} disabled={stakeholderSaving} placeholder="https://…" />
            </div>
            <div className="grid gap-2">
              <Label>Prioritäten / Topics</Label>
              <Textarea value={shPriorities} onChange={(e) => setShPriorities(e.target.value)} disabled={stakeholderSaving} />
            </div>
            <div className="grid gap-2">
              <Label>Letzter Kontakt</Label>
              <Input type="date" value={shLastContact} onChange={(e) => setShLastContact(e.target.value)} disabled={stakeholderSaving} />
            </div>
            <div className="grid gap-2">
              <Label>Sentiment</Label>
              <Input value={shSentiment} onChange={(e) => setShSentiment(e.target.value)} disabled={stakeholderSaving} placeholder="z. B. positiv / neutral / negativ" />
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
              <Label>Account</Label>
              <Input value={company.name} disabled />
            </div>
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
              <Label>Position</Label>
              <Input value={cPosition} onChange={(e) => setCPosition(e.target.value)} disabled={contactSaving} placeholder="z. B. Head of Procurement" />
            </div>
            <div className="grid gap-2">
              <Label>Telefon</Label>
              <Input value={cPhone} onChange={(e) => setCPhone(e.target.value)} disabled={contactSaving} placeholder="(optional)" />
            </div>
            <div className="grid gap-2">
              <Label>LinkedIn</Label>
              <Input value={cLinkedIn} onChange={(e) => setCLinkedIn(e.target.value)} disabled={contactSaving} placeholder="https://… (optional)" />
            </div>
            <div className="grid gap-2">
              <Label>Rolle</Label>
              <Input value={cRole} onChange={(e) => setCRole(e.target.value)} disabled={contactSaving} placeholder="z. B. Economic Buyer (optional)" />
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

