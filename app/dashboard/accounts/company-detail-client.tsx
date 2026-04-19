'use client'

import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/hooks/useRole'
import type {
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
import { CompanyContactDialog } from './company-contact-dialog'
import type { CompanyDetailClientProps } from './company-detail-types'
import { CompanyDetailHeader } from './company-detail-header'
import { CompanyDetailLinksTab } from './company-detail-links-tab'
import { CompanyDetailContactsTab } from './company-detail-contacts-tab'
import { CompanyDetailStakeholdersTab } from './company-detail-stakeholders-tab'
import { CompanyDetailStrategyTab } from './company-detail-strategy-tab'
import { CompanyStakeholderDialog } from './company-stakeholder-dialog'
import { EditAccountDialog } from './edit-account-dialog'

export function CompanyDetailClient({
  company,
  strategy: initialStrategy,
  stakeholders: initialStakeholders,
  contacts: initialContacts,
  references,
  activeDeals,
  initialEditOpen,
}: CompanyDetailClientProps) {
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
  const [shInfluence, setShInfluence] = useState('')
  const [shAttitude, setShAttitude] = useState('')
  const [shNotes, setShNotes] = useState('')
  const [shLinkedIn, setShLinkedIn] = useState('')
  const [shPriorities, setShPriorities] = useState('')
  const [shLastContact, setShLastContact] = useState('')
  const [shSentiment, setShSentiment] = useState('')
  const [stakeholderSaving, setStakeholderSaving] = useState(false)

  const [editAccountOpen, setEditAccountOpen] = useState(Boolean(initialEditOpen))
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
        toast.error(res.error ?? 'Speichern fehlgeschlagen.')
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
      { key: 'company_goals', label: 'Unternehmensziele', value: goals, set: setGoals },
      {
        key: 'value_proposition',
        label: 'Value Proposition (Warum gewinnen wir hier?)',
        value: valueProposition,
        set: setValueProposition,
      },
      {
        key: 'red_flags',
        label: 'Herausforderungen / Red Flags',
        value: redFlags,
        set: setRedFlags,
      },
      { key: 'competition', label: 'Wettbewerb', value: competition, set: setCompetition },
      { key: 'next_steps', label: 'Nächste Schritte', value: nextSteps, set: setNextSteps },
    ],
    [goals, valueProposition, redFlags, competition, nextSteps]
  )

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

  return (
    <div className="space-y-6">
      <CompanyDetailHeader
        company={company}
        canEdit={canEdit}
        onEditClick={() => setEditAccountOpen(true)}
      />

      <EditAccountDialog open={editAccountOpen} onOpenChange={setEditAccountOpen} company={company} />

      <Tabs defaultValue="strategy" className="w-full">
        <TabsList className="w-full justify-start gap-1">
          <TabsTrigger value="strategy">Strategie</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholder</TabsTrigger>
          <TabsTrigger value="contacts">Kontakte</TabsTrigger>
          <TabsTrigger value="links">Referenzen &amp; Deals</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="mt-6">
          <CompanyDetailStrategyTab
            isSales={isSales}
            canEdit={canEdit}
            strategySaving={strategySaving}
            strategyFields={strategyFields}
            saveStrategy={saveStrategy}
          />
        </TabsContent>

        <TabsContent value="stakeholders" className="mt-6">
          <CompanyDetailStakeholdersTab
            stakeholders={stakeholders}
            canEdit={canEdit}
            onAdd={() => openStakeholderDialog()}
            onEdit={openStakeholderDialog}
            onRemove={removeStakeholder}
          />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <CompanyDetailContactsTab
            contacts={contacts}
            canEdit={canEdit}
            onAdd={() => openContactDialog()}
            onEdit={openContactDialog}
            onRemove={removeContact}
          />
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <CompanyDetailLinksTab references={references} activeDeals={activeDeals} />
        </TabsContent>
      </Tabs>

      <CompanyStakeholderDialog
        open={stakeholderOpen}
        onOpenChange={setStakeholderOpen}
        editing={!!editingStakeholder}
        saving={stakeholderSaving}
        shName={shName}
        setShName={setShName}
        shTitle={shTitle}
        setShTitle={setShTitle}
        shRole={shRole}
        setShRole={setShRole}
        shInfluence={shInfluence}
        setShInfluence={setShInfluence}
        shAttitude={shAttitude}
        setShAttitude={setShAttitude}
        shLinkedIn={shLinkedIn}
        setShLinkedIn={setShLinkedIn}
        shPriorities={shPriorities}
        setShPriorities={setShPriorities}
        shLastContact={shLastContact}
        setShLastContact={setShLastContact}
        shSentiment={shSentiment}
        setShSentiment={setShSentiment}
        shNotes={shNotes}
        setShNotes={setShNotes}
        onSave={saveStakeholder}
      />

      <CompanyContactDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        editing={!!editingContact}
        saving={contactSaving}
        companyName={company.name}
        cFirst={cFirst}
        setCFirst={setCFirst}
        cLast={cLast}
        setCLast={setCLast}
        cEmail={cEmail}
        setCEmail={setCEmail}
        cPosition={cPosition}
        setCPosition={setCPosition}
        cPhone={cPhone}
        setCPhone={setCPhone}
        cLinkedIn={cLinkedIn}
        setCLinkedIn={setCLinkedIn}
        cRole={cRole}
        setCRole={setCRole}
        onSave={saveContact}
      />
    </div>
  )
}
