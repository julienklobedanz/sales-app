'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type {
  ContactPersonRow,
  ExternalContactRow,
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
  updateExternalContactBuyingCenterRole,
  updateStakeholder,
} from './actions'

export function useAccountDetailBuyingCenter({
  companyId,
  initialStakeholders,
  initialExternalContacts,
  initialInternalContacts,
  initialInternalRefApprovalContactId,
  canEdit,
}: {
  companyId: string
  initialStakeholders: StakeholderRow[]
  initialExternalContacts: ExternalContactRow[]
  initialInternalContacts: ContactPersonRow[]
  initialInternalRefApprovalContactId: string | null
  canEdit: boolean
}) {
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [externalContacts, setExternalContacts] = useState(initialExternalContacts)
  const [internalContacts, setInternalContacts] = useState(initialInternalContacts)
  const [internalRefApprovalContactId, setInternalRefApprovalContactId] = useState<
    string | null
  >(initialInternalRefApprovalContactId)

  useEffect(() => {
    setInternalRefApprovalContactId(initialInternalRefApprovalContactId)
  }, [initialInternalRefApprovalContactId])

  const [stakeholderOpen, setStakeholderOpen] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState<StakeholderRow | null>(
    null,
  )
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
  const [cLinkedIn, setCLinkedIn] = useState('')
  const [cIsRefApprovalContact, setCIsRefApprovalContact] = useState(false)

  const openStakeholderDialog = (s?: StakeholderRow) => {
    setEditingStakeholder(s ?? null)
    setShName(s?.name ?? '')
    setShTitle(s?.title ?? '')
    setShRole(s?.role ?? 'champion')
    setShInfluence(s?.influence_level ?? '')
    setShAttitude(s?.attitude ?? '')
    setShNotes(s?.notes ?? '')
    setShLinkedIn(s?.linkedin_url ?? '')
    setShPriorities(s?.priorities_topics ?? '')
    const lastI = s?.last_interaction_at ?? s?.last_contact_at ?? ''
    setShLastContact(lastI.slice(0, 10))
    setShSentiment(s?.sentiment ?? '')
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
          prev.map((p) =>
            p.id === editingStakeholder.id
              ? {
                  ...p,
                  ...payload,
                  role: payload.role,
                }
              : p,
          ),
        )
      } else {
        const res = await createStakeholder(companyId, payload)
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
    setCIsRefApprovalContact(Boolean(c?.id && c.id === internalRefApprovalContactId))
    setCFirst(c?.first_name ?? '')
    setCLast(c?.last_name ?? '')
    setCEmail(c?.email ?? '')
    setCPhone(c?.phone ?? '')
    const legacyPosition = c?.position?.trim()
    setCRole(c?.role?.trim() || legacyPosition || '')
    setCLinkedIn(c?.linkedin_url ?? '')
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
        })
        if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        if (cIsRefApprovalContact) {
          const ar = await setCompanyInternalReferenceApprovalContact(
            companyId,
            editingContact.id,
          )
          if (!ar.success) {
            toast.error(ar.error ?? 'Referenzfreigabe-Zuordnung fehlgeschlagen.')
            return
          }
          setInternalRefApprovalContactId(editingContact.id)
        } else if (internalRefApprovalContactId === editingContact.id) {
          const ar = await setCompanyInternalReferenceApprovalContact(companyId, null)
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
                } as ContactPersonRow)
              : p,
          ),
        )
      } else {
        const res = await createContactPerson(companyId, {
          first_name: cFirst.trim() || null,
          last_name: cLast.trim() || null,
          email: cEmail.trim() || null,
          phone: cPhone.trim() || null,
          linkedin_url: cLinkedIn.trim() || null,
          role: cRole.trim() || null,
        })
        if (!res.success) return toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        const created = res.contact
        if (created && cIsRefApprovalContact) {
          const ar = await setCompanyInternalReferenceApprovalContact(
            companyId,
            created.id,
          )
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
    if (!canEdit) return
    const res = await deleteContactPerson(id)
    if (!res.success) return toast.error(res.error ?? 'Löschen fehlgeschlagen.')
    if (internalRefApprovalContactId === id) setInternalRefApprovalContactId(null)
    setInternalContacts((prev) => prev.filter((c) => c.id !== id))
    toast.success('Kontakt gelöscht.')
  }

  const setStakeholderRole = async (id: string, role: StakeholderRole) => {
    const res = await updateStakeholder(id, { role })
    if (!res.success) {
      toast.error(res.error ?? 'Speichern fehlgeschlagen.')
      return
    }
    setStakeholders((prev) =>
      prev.map((s) => (s.id === id ? ({ ...s, role } as StakeholderRow) : s)),
    )
    if (role !== 'unknown') {
      setExternalContacts((prev) =>
        prev.map((c) =>
          c.buying_center_role === role
            ? { ...c, buying_center_role: 'unknown' as const }
            : c,
        ),
      )
    }
    toast.success('Rolle aktualisiert.')
  }

  const setExternalBuyingCenterRole = async (id: string, role: StakeholderRole) => {
    const res = await updateExternalContactBuyingCenterRole(id, role)
    if (!res.success) {
      toast.error(res.error ?? 'Speichern fehlgeschlagen.')
      return
    }
    setExternalContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, buying_center_role: role } : c)),
    )
    if (role !== 'unknown') {
      setStakeholders((prev) =>
        prev.map((s) =>
          s.role === role ? ({ ...s, role: 'unknown' as const } as StakeholderRow) : s,
        ),
      )
    }
    toast.success('Rolle aktualisiert.')
  }

  return {
    stakeholders,
    externalContacts,
    internalContacts,
    internalRefApprovalContactId,
    stakeholderOpen,
    setStakeholderOpen,
    editingStakeholder,
    shName,
    setShName,
    shTitle,
    setShTitle,
    shRole,
    setShRole,
    shInfluence,
    setShInfluence,
    shAttitude,
    setShAttitude,
    shNotes,
    setShNotes,
    shLinkedIn,
    setShLinkedIn,
    shPriorities,
    setShPriorities,
    shLastContact,
    setShLastContact,
    shSentiment,
    setShSentiment,
    stakeholderSaving,
    openStakeholderDialog,
    saveStakeholder,
    removeStakeholder,
    contactOpen,
    setContactOpen,
    editingContact,
    cFirst,
    setCFirst,
    cLast,
    setCLast,
    cEmail,
    setCEmail,
    cPhone,
    setCPhone,
    cRole,
    setCRole,
    contactSaving,
    cLinkedIn,
    setCLinkedIn,
    cIsRefApprovalContact,
    setCIsRefApprovalContact,
    openContactDialog,
    saveContact,
    removeContact,
    setStakeholderRole,
    setExternalBuyingCenterRole,
  }
}
