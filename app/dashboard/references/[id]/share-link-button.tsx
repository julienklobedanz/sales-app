'use client'

import { useEffect, useRef, useState } from 'react'
import { LinkIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { AppIcon } from '@/lib/icons'
import {
  createSharedPortfolio,
  getCustomerApprovalRecipientEmail,
  getExistingShareForReference,
  getPortfolioViewSessions,
  resetSharedPortfolioManageToken,
  updateShareLinkSecurity,
} from '@/app/dashboard/actions'
import {
  ShareLinkPopoverPanel,
  ShareLinkSecurityDialog,
  ShareLinkSperrlinkConfirmDialog,
} from './share-link-dialog-panel'
import {
  buildManageUrl,
  defaultExpiryDateInput,
  toAbsoluteUrl,
  toDateInputValue,
} from './share-link-helpers'

export function ShareLinkButton({
  referenceId,
  triggerClassName,
}: {
  referenceId: string
  triggerClassName?: string
}) {
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [metaExpiresAt, setMetaExpiresAt] = useState<string | null>(null)
  const [metaHasPassword, setMetaHasPassword] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [copiedSuccess, setCopiedSuccess] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [burstKey, setBurstKey] = useState(0)
  const timeoutRefs = useRef<number[]>([])

  const [securityOpen, setSecurityOpen] = useState(false)
  const [secPassword, setSecPassword] = useState('')
  const [secExpires, setSecExpires] = useState('')
  const [secNoExpiry, setSecNoExpiry] = useState(false)
  const [secRemovePw, setSecRemovePw] = useState(false)
  const [secGateMode, setSecGateMode] = useState<'none' | 'password' | 'email'>('none')
  const [viewSessions, setViewSessions] = useState<
    Awaited<ReturnType<typeof getPortfolioViewSessions>>
  >([])
  const [secSaving, setSecSaving] = useState(false)

  /** Vollständige URL inkl. ?manage=… – nur wenn Klartext-Token gerade bekannt (Erstellung / Reset). */
  const [manageUrl, setManageUrl] = useState<string | null>(null)
  const [hasCustomerManageToken, setHasCustomerManageToken] = useState(false)
  const [issuingManage, setIssuingManage] = useState(false)
  const [sperrlinkConfirmOpen, setSperrlinkConfirmOpen] = useState(false)
  const [customerEmailForSperrlink, setCustomerEmailForSperrlink] = useState<
    string | null
  >(null)

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timer) => window.clearTimeout(timer))
      timeoutRefs.current = []
    }
  }, [])

  useEffect(() => {
    if (!securityOpen) return
    setSecPassword('')
    setSecExpires(toDateInputValue(metaExpiresAt) || defaultExpiryDateInput())
    setSecNoExpiry(!metaExpiresAt)
    setSecRemovePw(false)
    void getExistingShareForReference(referenceId).then((ex) => {
      if (ex) setSecGateMode(ex.gateMode)
    })
  }, [securityOpen, metaExpiresAt, referenceId])

  useEffect(() => {
    if (!open || !url) return
    void getPortfolioViewSessions(referenceId).then(setViewSessions)
  }, [open, url, referenceId])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function loadOrCreateShareUrl() {
      setLoading(true)
      setLoadError(null)
      try {
        const existing = await getExistingShareForReference(referenceId)
        if (cancelled) return
        if (existing?.url) {
          setUrl(toAbsoluteUrl(existing.url))
          setMetaExpiresAt(existing.expiresAt)
          setMetaHasPassword(existing.hasPassword)
          setHasCustomerManageToken(existing.hasCustomerManageToken)
          setSecGateMode(existing.gateMode)
          setManageUrl(null)
          return
        }

        const created = await createSharedPortfolio([referenceId])
        if (cancelled) return
        if (!created.success) {
          setLoadError(created.error ?? 'Link konnte nicht erstellt werden.')
          setUrl(null)
          return
        }
        const abs = toAbsoluteUrl(created.url)
        setUrl(abs)
        if (created.manageToken) {
          setManageUrl(buildManageUrl(abs, created.manageToken))
          setHasCustomerManageToken(true)
          toast.message('Sperr-Link für die freigebende Person', {
            description:
              'Separat vom Kundenlink – nur an die Person geben, die den Zugriff nötigenfalls beenden soll.',
            duration: 14000,
          })
        } else {
          setManageUrl(null)
          setHasCustomerManageToken(false)
        }
        if (created.initialPassword) {
          toast.message('Passwort für diesen Link', {
            description: `Einmalig anzeigen: ${created.initialPassword}`,
            duration: 20000,
          })
          setMetaHasPassword(true)
        } else {
          setMetaHasPassword(false)
        }
        const again = await getExistingShareForReference(referenceId)
        if (again) {
          setMetaExpiresAt(again.expiresAt)
          setMetaHasPassword(again.hasPassword)
          setHasCustomerManageToken(again.hasCustomerManageToken)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadOrCreateShareUrl()
    return () => {
      cancelled = true
    }
  }, [open, referenceId])

  async function copyManageToClipboard(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Sperr-Link kopiert – nur an die freigebende Person senden.')
    } catch {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  async function issueManageToken(notifyCustomer: boolean) {
    if (!url) return
    setIssuingManage(true)
    try {
      const res = await resetSharedPortfolioManageToken(referenceId, { notifyCustomer })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setManageUrl(buildManageUrl(url, res.manageToken))
      setHasCustomerManageToken(true)
      if (notifyCustomer) {
        if (res.customerEmailSent) {
          toast.success('Neuer Sperrlink erzeugt', {
            description: `E-Mail an ${customerEmailForSperrlink ?? 'den Kunden'} gesendet.`,
          })
        } else {
          toast.success('Neuer Sperrlink erzeugt', {
            description:
              'E-Mail konnte nicht gesendet werden (z. B. fehlender Resend-Key).',
          })
        }
      } else {
        toast.success(
          hasCustomerManageToken
            ? 'Neuer Sperr-Link erzeugt (alter ist ungültig).'
            : 'Sperr-Link eingerichtet.',
        )
      }
    } finally {
      setIssuingManage(false)
      setSperrlinkConfirmOpen(false)
    }
  }

  async function onRequestManageToken() {
    if (!url) return
    if (hasCustomerManageToken) {
      const email = await getCustomerApprovalRecipientEmail(referenceId)
      if (email?.includes('@')) {
        setCustomerEmailForSperrlink(email)
        setSperrlinkConfirmOpen(true)
        return
      }
    }
    await issueManageToken(false)
  }

  async function copyToClipboard(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedSuccess(true)
      setShowConfetti(true)
      setBurstKey((prev) => prev + 1)

      timeoutRefs.current.push(
        window.setTimeout(() => {
          setCopiedSuccess(false)
        }, 1100),
      )
      timeoutRefs.current.push(
        window.setTimeout(() => {
          setShowConfetti(false)
        }, 650),
      )

      toast.custom(
        () => (
          <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white px-4 py-3 shadow-lg dark:border-emerald-500/35 dark:from-emerald-500/15 dark:to-background">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Link kopiert!
            </p>
            <p className="mt-0.5 text-xs text-emerald-800/90 dark:text-emerald-100/80">
              Bereit zum Teilen mit dem Kunden.
            </p>
          </div>
        ),
        { duration: 2800 },
      )
    } catch {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  async function saveSecurity() {
    setSecSaving(true)
    try {
      const expiresIso =
        secNoExpiry || !secExpires
          ? null
          : new Date(`${secExpires}T23:59:59.000Z`).toISOString()
      const res = await updateShareLinkSecurity(referenceId, {
        passwordPlain: secRemovePw
          ? null
          : secPassword.trim()
            ? secPassword.trim()
            : null,
        removePassword: secRemovePw,
        expiresAtIso: expiresIso,
        clearExpires: secNoExpiry,
        gateMode: secGateMode,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Sicherheitseinstellungen gespeichert')
      setSecurityOpen(false)
      const again = await getExistingShareForReference(referenceId)
      if (again) {
        setMetaExpiresAt(again.expiresAt)
        setMetaHasPassword(again.hasPassword)
        setHasCustomerManageToken(again.hasCustomerManageToken)
        setSecGateMode(again.gateMode)
      }
    } finally {
      setSecSaving(false)
    }
  }

  async function retryCreate() {
    setLoading(true)
    setLoadError(null)
    try {
      const created = await createSharedPortfolio([referenceId])
      if (!created.success) {
        setLoadError(created.error ?? 'Link konnte nicht erstellt werden.')
        return
      }
      const abs = toAbsoluteUrl(created.url)
      setUrl(abs)
      if (created.manageToken) {
        setManageUrl(buildManageUrl(abs, created.manageToken))
        setHasCustomerManageToken(true)
      } else {
        setManageUrl(null)
      }
      if (created.initialPassword) {
        toast.message('Passwort für diesen Link', {
          description: created.initialPassword,
          duration: 20000,
        })
      }
      const again = await getExistingShareForReference(referenceId)
      if (again) {
        setMetaExpiresAt(again.expiresAt)
        setMetaHasPassword(again.hasPassword)
        setHasCustomerManageToken(again.hasCustomerManageToken)
      }
    } finally {
      setLoading(false)
    }
  }

  async function createNewShare() {
    setCreating(true)
    try {
      const result = await createSharedPortfolio([referenceId])
      if (!result.success) {
        toast.error(result.error ?? 'Neuer Link konnte nicht erstellt werden.')
        return
      }
      const sharedUrl = toAbsoluteUrl(result.url)
      setUrl(sharedUrl)
      if (result.manageToken) {
        setManageUrl(buildManageUrl(sharedUrl, result.manageToken))
        setHasCustomerManageToken(true)
        toast.message('Neuer Sperr-Link für die freigebende Person', {
          description: 'Unten kopieren – getrennt vom Kundenlink halten.',
          duration: 12000,
        })
      } else {
        setManageUrl(null)
      }
      if (result.initialPassword) {
        toast.message('Neues Passwort', {
          description: result.initialPassword,
          duration: 20000,
        })
      }
      const again = await getExistingShareForReference(referenceId)
      if (again) {
        setMetaExpiresAt(again.expiresAt)
        setMetaHasPassword(again.hasPassword)
        setHasCustomerManageToken(again.hasCustomerManageToken)
      }
      await copyToClipboard(sharedUrl)
    } finally {
      setCreating(false)
    }
  }

  const maxPicker = new Date()
  maxPicker.setFullYear(maxPicker.getFullYear() + 10)
  const maxDateStr = toDateInputValue(maxPicker.toISOString())

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={triggerClassName ? `gap-2 ${triggerClassName}` : 'gap-2'}
          >
            <AppIcon icon={LinkIcon} size={16} />
            Teilen
          </Button>
        </PopoverTrigger>
        <ShareLinkPopoverPanel
          loading={loading}
          loadError={loadError}
          url={url}
          metaExpiresAt={metaExpiresAt}
          metaHasPassword={metaHasPassword}
          viewSessions={viewSessions}
          creating={creating}
          copiedSuccess={copiedSuccess}
          showConfetti={showConfetti}
          burstKey={burstKey}
          manageUrl={manageUrl}
          hasCustomerManageToken={hasCustomerManageToken}
          issuingManage={issuingManage}
          onRetryCreate={() => void retryCreate()}
          onOpenSecurity={() => setSecurityOpen(true)}
          onCopyUrl={(link) => void copyToClipboard(link)}
          onCreateNew={() => void createNewShare()}
          onCopyManage={(link) => void copyManageToClipboard(link)}
          onRequestManageToken={() => void onRequestManageToken()}
        />
      </Popover>

      <ShareLinkSecurityDialog
        open={securityOpen}
        onOpenChange={setSecurityOpen}
        metaHasPassword={metaHasPassword}
        secPassword={secPassword}
        setSecPassword={setSecPassword}
        secExpires={secExpires}
        setSecExpires={setSecExpires}
        secNoExpiry={secNoExpiry}
        setSecNoExpiry={setSecNoExpiry}
        secRemovePw={secRemovePw}
        setSecRemovePw={setSecRemovePw}
        secGateMode={secGateMode}
        setSecGateMode={setSecGateMode}
        secSaving={secSaving}
        maxDateStr={maxDateStr}
        onSave={() => void saveSecurity()}
      />

      <ShareLinkSperrlinkConfirmDialog
        open={sperrlinkConfirmOpen}
        onOpenChange={setSperrlinkConfirmOpen}
        customerEmail={customerEmailForSperrlink}
        issuingManage={issuingManage}
        onConfirm={() => void issueManageToken(true)}
      />
    </>
  )
}
