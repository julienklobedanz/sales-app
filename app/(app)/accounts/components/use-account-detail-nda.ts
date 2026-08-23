'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { resolveNdaDisplayStatus } from '@/lib/accounts/account-entity'
import { shouldNotifyNdaExpiry } from '@/lib/accounts/nda-expiry'

import type { NdaAgreementRow } from '../nda-actions'
import {
  createNdaAgreement,
  deleteNdaAgreement,
  getNdaAgreementDownloadUrl,
  uploadNdaAgreementPdf,
} from '../nda-actions'
import type { NdaAddStatus } from './nda-add-dialog'
import { titleFromPdfFilename } from './nda-pdf-dropzone'

export function useAccountDetailNda({
  companyId,
  initialAgreements,
  openOnMount = false,
}: {
  companyId: string
  initialAgreements: NdaAgreementRow[]
  openOnMount?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(openOnMount)
  const [agreements, setAgreements] = useState(initialAgreements)
  const [addOpen, setAddOpen] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addStatus, setAddStatus] = useState<NdaAddStatus>('active')
  const [addUnlimited, setAddUnlimited] = useState(true)
  const [addValidUntil, setAddValidUntil] = useState('')
  const [addPdfFile, setAddPdfFile] = useState<File | null>(null)
  const [addNotes, setAddNotes] = useState('')
  const [addPending, setAddPending] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NdaAgreementRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploadPanelId, setUploadPanelId] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    setAgreements(initialAgreements)
  }, [initialAgreements])

  const displayStatus = resolveNdaDisplayStatus(
    agreements.map((a) => ({
      status: a.status,
      valid_until: a.valid_until,
      file_storage_path: a.file_storage_path,
    })),
  )

  const expiringSoon = agreements.filter((a) => {
    const notify = shouldNotifyNdaExpiry({ status: a.status, validUntil: a.valid_until })
    return notify !== null && notify.daysUntil >= 0
  }).length

  function resetAddForm() {
    setAddTitle('')
    setAddNotes('')
    setAddValidUntil('')
    setAddPdfFile(null)
    setAddUnlimited(true)
    setAddStatus('active')
  }

  function handleAddPdfFile(file: File | null) {
    setAddPdfFile(file)
    if (file) {
      const derived = titleFromPdfFilename(file.name)
      if (derived) setAddTitle(derived)
    }
  }

  async function refreshFromServer() {
    router.refresh()
  }

  async function handleCreate() {
    if (!addUnlimited && !addValidUntil.trim()) {
      toast.error('Bitte Enddatum angeben oder „Unbefristet“ aktivieren.')
      return
    }

    setAddPending(true)
    try {
      const res = await createNdaAgreement({
        companyId,
        title: addTitle,
        status: addPdfFile ? addStatus : 'pending',
        unlimited: addUnlimited,
        validUntil: addValidUntil || null,
        notes: addNotes,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Anlegen fehlgeschlagen.')
        return
      }

      if (addPdfFile) {
        const fd = new FormData()
        fd.set('file', addPdfFile)
        const uploadRes = await uploadNdaAgreementPdf(res.id, companyId, fd)
        if (!uploadRes.success) {
          toast.error(uploadRes.error ?? 'NDA angelegt, PDF-Upload fehlgeschlagen.')
          setAddOpen(false)
          resetAddForm()
          setUploadPanelId(res.id)
          await refreshFromServer()
          return
        }
      }

      toast.success(
        addPdfFile ? 'NDA mit PDF gespeichert.' : 'NDA-Vereinbarung angelegt.',
      )
      if (!res.titlePersisted) {
        toast.warning(
          'Titel konnte nicht gespeichert werden — bitte Datenbank-Migration für nda_agreements.title ausführen (Supabase SQL Editor).',
        )
      }
      setAddOpen(false)
      resetAddForm()
      await refreshFromServer()
    } finally {
      setAddPending(false)
    }
  }

  async function handleUpload(
    ndaId: string,
    file: File,
    meta: { version: string; signedAt: string },
  ) {
    setUploadingId(ndaId)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('document_version', meta.version)
      fd.set('signed_at', meta.signedAt)
      const res = await uploadNdaAgreementPdf(ndaId, companyId, fd)
      if (!res.success) {
        toast.error(res.error ?? 'Upload fehlgeschlagen.')
        return
      }
      toast.success('PDF gespeichert.')
      setUploadPanelId(null)
      await refreshFromServer()
    } finally {
      setUploadingId(null)
    }
  }

  async function handleDownload(ndaId: string) {
    setDownloadingId(ndaId)
    try {
      const res = await getNdaAgreementDownloadUrl(ndaId, companyId)
      if (!res.success) {
        toast.error(res.error ?? 'Download fehlgeschlagen.')
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await deleteNdaAgreement(deleteTarget.id, companyId)
      if (!res.success) {
        toast.error(res.error ?? 'Löschen fehlgeschlagen.')
        return
      }
      setAgreements((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      toast.success('NDA gelöscht.')
      setDeleteTarget(null)
      await refreshFromServer()
    } finally {
      setDeleting(false)
    }
  }

  function handleSheetOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setAddOpen(false)
      setUploadPanelId(null)
      resetAddForm()
    }
  }

  return {
    open,
    setOpen,
    handleSheetOpenChange,
    agreements,
    displayStatus,
    expiringSoon,
    addOpen,
    setAddOpen,
    addTitle,
    setAddTitle,
    addStatus,
    setAddStatus,
    addUnlimited,
    setAddUnlimited,
    addValidUntil,
    setAddValidUntil,
    addPdfFile,
    handleAddPdfFile,
    addNotes,
    setAddNotes,
    addPending,
    uploadingId,
    downloadingId,
    deleteTarget,
    setDeleteTarget,
    deleting,
    uploadPanelId,
    setUploadPanelId,
    fileInputRefs,
    handleCreate,
    handleUpload,
    handleDownload,
    confirmDelete,
  }
}
