'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  setCompanyInternalReferenceApprovalContact,
  updateContactPerson,
  updateStakeholder,
  upsertCompanyStrategy,
} from './actions'
import { CompanyContactDialog } from './company-contact-dialog'
import type { CompanyDetailClientProps } from './company-detail-types'
import { CompanyDetailHeader } from './company-detail-header'
import { CompanyDetailStrategyTab } from './company-detail-strategy-tab'
import { CompanyStakeholderDialog } from './company-stakeholder-dialog'
import { EditAccountDialog } from './edit-account-dialog'
import { CompanyDetailPipelineTab } from './company-detail-pipeline-tab'
import { CompanyDetailProofPointsTab } from './company-detail-proof-points-tab'
import { CompanyDetailPowerMapTab } from './company-detail-power-map-tab'

export function CompanyDetailClient({
  company,
  organizationName,
  strategy: initialStrategy,
  stakeholders: initialStakeholders,
  internalContacts: initialInternalContacts,
  externalContacts,
  references,
  activeDeals,
  marketSignals,
  initialEditOpen,
}: CompanyDetailClientProps) {
  const { isAdmin, isAccountManager, isSales } = useRole()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const canEditAccount = isAdmin || isAccountManager
  const canEditStrategy = isAdmin || isAccountManager || isSales
  const canEditBuyingCenter = isAdmin || isAccountManager || isSales
  const canEditPipeline = isAdmin || isAccountManager || isSales
  const initialTabParam = searchParams.get('tab')
  const initialTab =
    initialTabParam === 'mission_control' ||
    initialTabParam === 'buying_center' ||
    initialTabParam === 'pipeline' ||
    initialTabParam === 'proof_points'
      ? initialTabParam
      : 'mission_control'
  const [activeTab, setActiveTab] = useState<
    'mission_control' | 'buying_center' | 'pipeline' | 'proof_points'
  >(initialTab)

  const [goals, setGoals] = useState(initialStrategy?.company_goals ?? '')
  const [valueProposition, setValueProposition] = useState(initialStrategy?.value_proposition ?? '')
  const [redFlags, setRedFlags] = useState(initialStrategy?.red_flags ?? '')
  const [competition, setCompetition] = useState(initialStrategy?.competition ?? '')
  const [nextSteps, setNextSteps] = useState(initialStrategy?.next_steps ?? '')
  const [metricsPain, setMetricsPain] = useState((initialStrategy as { metrics_pain?: string | null } | null)?.metrics_pain ?? '')
  const [mhAssessment] = useState<Record<string, unknown>>(
    ((initialStrategy as { mh_assessment?: Record<string, unknown> | null } | null)?.mh_assessment as Record<string, unknown> | null) ?? {}
  )
  const [strategySaving, setStrategySaving] = useState(false)

  const lastSavedRef = useRef({
    goals: initialStrategy?.company_goals ?? '',
    valueProposition: initialStrategy?.value_proposition ?? '',
    redFlags: initialStrategy?.red_flags ?? '',
    competition: initialStrategy?.competition ?? '',
    nextSteps: initialStrategy?.next_steps ?? '',
    metricsPain: (initialStrategy as { metrics_pain?: string | null } | null)?.metrics_pain ?? '',
    mhAssessment: ((initialStrategy as { mh_assessment?: Record<string, unknown> | null } | null)?.mh_assessment as Record<string, unknown> | null) ?? {},
  })

  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [internalContacts, setInternalContacts] = useState(initialInternalContacts)
  const [internalRefApprovalContactId, setInternalRefApprovalContactId] = useState<string | null>(
    company.internal_reference_approval_contact_id ?? null
  )

  useEffect(() => {
    setInternalRefApprovalContactId(company.internal_reference_approval_contact_id ?? null)
  }, [company.internal_reference_approval_contact_id])

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
  const [cLastInteraction, setCLastInteraction] = useState('')
  const [cIsRefApprovalContact, setCIsRefApprovalContact] = useState(false)

  const saveStrategy = async (opts?: { silent?: boolean }) => {
    if (!canEditStrategy) return
    const snapshot = { goals, valueProposition, redFlags, competition, nextSteps, metricsPain, mhAssessment }
    const last = lastSavedRef.current
    const changed =
      snapshot.goals !== last.goals ||
      snapshot.valueProposition !== last.valueProposition ||
      snapshot.redFlags !== last.redFlags ||
      snapshot.competition !== last.competition ||
      snapshot.nextSteps !== last.nextSteps ||
      snapshot.metricsPain !== last.metricsPain ||
      JSON.stringify(snapshot.mhAssessment) !== JSON.stringify(last.mhAssessment)
    if (!changed) return

    setStrategySaving(true)
    try {
      const res = await upsertCompanyStrategy(company.id, {
        metrics_pain: snapshot.metricsPain || null,
        company_goals: snapshot.goals || null,
        red_flags: snapshot.redFlags || null,
        competition: snapshot.competition || null,
        next_steps: snapshot.nextSteps || null,
        value_proposition: snapshot.valueProposition || null,
        mh_assessment: snapshot.mhAssessment,
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
      { key: 'metrics_pain', label: 'Metrics & Pain', value: metricsPain, set: setMetricsPain },
      { key: 'company_goals', label: 'Geschäftsziele', value: goals, set: setGoals },
      {
        key: 'value_proposition',
        label: 'Value Proposition',
        value: valueProposition,
        set: setValueProposition,
      },
      {
        key: 'red_flags',
        label: 'Risiken / Red Flags',
        value: redFlags,
        set: setRedFlags,
      },
      { key: 'competition', label: 'Wettbewerb / Incumbent', value: competition, set: setCompetition },
      { key: 'next_steps', label: 'Nächste Schritte', value: nextSteps, set: setNextSteps },
    ],
    [metricsPain, goals, valueProposition, redFlags, competition, nextSteps]
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
    const lastI = ((s as unknown as { last_interaction_at?: string | null })?.last_interaction_at ??
      (s as unknown as { last_contact_at?: string | null })?.last_contact_at ??
      '') as string
    setShLastContact((lastI ?? '').slice(0, 10))
    setShSentiment((s as unknown as { sentiment?: string | null })?.sentiment ?? '')
    setStakeholderOpen(true)
  }

  const saveStakeholder = async () => {
    if (!canEditBuyingCenter) return
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
        last_interaction_at: shLastContact || null,
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
    if (!canEditBuyingCenter) return
    const res = await deleteStakeholder(id)
    if (!res.success) return toast.error(res.error ?? 'Löschen fehlgeschlagen.')
    setStakeholders((prev) => prev.filter((s) => s.id !== id))
    toast.success('Stakeholder gelöscht.')
  }

  const openContactDialog = (c?: ContactPersonRow) => {
    setEditingContact(c ?? null)
    setCIsRefApprovalContact(Boolean(c?.id && c.id === internalRefApprovalContactId))
    setCFirst(c?.first_name ?? '')
    setCLast(c?.last_name ?? '')
    setCEmail(c?.email ?? '')
    setCPhone(c?.phone ?? '')
    setCRole(c?.role ?? '')
    setCPosition((c as unknown as { position?: string | null })?.position ?? '')
    setCLinkedIn((c as unknown as { linkedin_url?: string | null })?.linkedin_url ?? '')
    setCLastInteraction(((c as unknown as { last_interaction_at?: string | null })?.last_interaction_at ?? '')?.slice(0, 10))
    setContactOpen(true)
  }

  const saveContact = async () => {
    if (!canEditBuyingCenter) return
    setContactSaving(true)
    try {
      if (editingContact) {
        const res = await updateContactPerson(editingContact.id, {
          first_name: cFirst.trim() || null,
          last_name: cLast.trim() || null,
          email: cEmail.trim() || null,
          phone: cPhone.trim() || null,
          linkedin_url: cLinkedIn.trim() || null,
          last_interaction_at: cLastInteraction || null,
          role: cRole.trim() || null,
          position: cPosition.trim() || null,
        })
        if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        if (cIsRefApprovalContact) {
          const ar = await setCompanyInternalReferenceApprovalContact(company.id, editingContact.id)
          if (!ar.success) {
            toast.error(ar.error ?? 'Referenzfreigabe-Zuordnung fehlgeschlagen.')
            return
          }
          setInternalRefApprovalContactId(editingContact.id)
        } else if (internalRefApprovalContactId === editingContact.id) {
          const ar = await setCompanyInternalReferenceApprovalContact(company.id, null)
          if (!ar.success) {
            toast.error(ar.error ?? 'Zuordnung konnte nicht entfernt werden.')
            return
          }
          setInternalRefApprovalContactId(null)
        }
        toast.success('Kontakt aktualisiert.')
        setContactOpen(false)
        setInternalContacts((prev) =>
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
          last_interaction_at: cLastInteraction || null,
          role: cRole.trim() || null,
          position: cPosition.trim() || null,
        })
        if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        const created = res.contact
        if (created && cIsRefApprovalContact) {
          const ar = await setCompanyInternalReferenceApprovalContact(company.id, created.id)
          if (!ar.success) {
            toast.error(ar.error ?? 'Referenzfreigabe-Zuordnung fehlgeschlagen.')
            return
          }
          setInternalRefApprovalContactId(created.id)
        }
        toast.success('Kontakt hinzugefügt.')
        setContactOpen(false)
        if (created) setInternalContacts((prev) => [...prev, created])
      }
    } finally {
      setContactSaving(false)
    }
  }

  const removeContact = async (id: string) => {
    if (!canEditBuyingCenter) return
    const res = await deleteContactPerson(id)
    if (!res.success) return toast.error(res.error ?? 'Löschen fehlgeschlagen.')
    if (internalRefApprovalContactId === id) setInternalRefApprovalContactId(null)
    setInternalContacts((prev) => prev.filter((c) => c.id !== id))
    toast.success('Kontakt gelöscht.')
  }

  return (
    <div className="space-y-6">
      <CompanyDetailHeader
        company={company}
        canEdit={canEditAccount}
        onEditClick={() => setEditAccountOpen(true)}
      />

      <EditAccountDialog open={editAccountOpen} onOpenChange={setEditAccountOpen} company={company} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const next =
            value === 'mission_control' ||
            value === 'buying_center' ||
            value === 'pipeline' ||
            value === 'proof_points'
              ? value
              : 'mission_control'
          setActiveTab(next)
          const params = new URLSearchParams(searchParams.toString())
          params.set('tab', next)
          router.replace(`${pathname}?${params.toString()}`)
        }}
        className="w-full"
      >
        <TabsList className="w-full justify-start gap-1">
          <TabsTrigger value="mission_control">Strategie</TabsTrigger>
          <TabsTrigger value="buying_center">Buying Center</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="proof_points">Passende Referenzen</TabsTrigger>
        </TabsList>

        <TabsContent value="mission_control" className="mt-6">
          <CompanyDetailStrategyTab
            canEdit={canEditStrategy}
            strategySaving={strategySaving}
            strategyFields={strategyFields}
            saveStrategy={saveStrategy}
            stakeholders={stakeholders}
            marketSignals={marketSignals}
            onSetStakeholderRole={async (id, role) => {
              const res = await updateStakeholder(id, { role })
              if (!res.success) {
                toast.error(res.error ?? 'Speichern fehlgeschlagen.')
                return
              }
              setStakeholders((prev) => prev.map((s) => (s.id === id ? ({ ...s, role } as StakeholderRow) : s)))
              toast.success('Rolle aktualisiert.')
            }}
          />
        </TabsContent>

        <TabsContent value="buying_center" className="mt-6">
          <CompanyDetailPowerMapTab
            stakeholders={stakeholders}
            marketSignals={marketSignals}
            internalContacts={internalContacts}
            externalContacts={externalContacts}
            organizationName={organizationName}
            internalReferenceApprovalContactId={internalRefApprovalContactId}
            canEdit={canEditBuyingCenter}
            onAddStakeholder={() => openStakeholderDialog()}
            onEditStakeholder={openStakeholderDialog}
            onRemoveStakeholder={removeStakeholder}
            onAddInternalContact={() => openContactDialog()}
            onEditInternalContact={openContactDialog}
            onRemoveInternalContact={removeContact}
          />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          <CompanyDetailPipelineTab activeDeals={activeDeals} canEdit={canEditPipeline} />
        </TabsContent>

        <TabsContent value="proof_points" className="mt-6">
          <CompanyDetailProofPointsTab company={company} references={references} />
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
        cLastInteraction={cLastInteraction}
        setCLastInteraction={setCLastInteraction}
        cIsRefApprovalContact={cIsRefApprovalContact}
        setCIsRefApprovalContact={setCIsRefApprovalContact}
        onSave={saveContact}
      />
    </div>
  )
}
