'use client'

import { useEffect, useState } from 'react'
import { CopyIcon, ExternalLink, LinkIcon, Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AppIcon } from '@/lib/icons'

import type { ReferenceRow } from '../actions'
import { createSharedPortfolio, getExistingShareForReference } from '../actions'
import { ReferenceReader } from '../reference-reader'

function sanitizeSharedUrl(url: string) {
  return url.replace(/\[([^\]]+)\]/g, '$1').replace(/\[|\]/g, '')
}

function toAbsoluteUrl(url: string) {
  const clean = sanitizeSharedUrl(url)
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean
  if (typeof window === 'undefined') return clean
  return new URL(clean, window.location.origin).toString()
}

export function ShareLinkDialog({
  reference,
  onClose,
}: {
  reference: ReferenceRow | null
  onClose: () => void
}) {
  const open = reference !== null
  const [shareLinkUrl, setShareLinkUrl] = useState<string | null>(null)
  const [shareLinkLoading, setShareLinkLoading] = useState(false)
  const [shareLinkGenerateLoading, setShareLinkGenerateLoading] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')

  const refId = reference?.id ?? null

  useEffect(() => {
    if (!refId) {
      setShareLinkUrl(null)
      return
    }
    setShareLinkLoading(true)
    getExistingShareForReference(refId)
      .then((existing) =>
        setShareLinkUrl(existing?.url ? toAbsoluteUrl(existing.url) : null),
      )
      .finally(() => setShareLinkLoading(false))
  }, [refId])

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="z-[60] max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-hidden rounded-xl border bg-background p-0 shadow-xl"
      >
        <div className="flex flex-col">
          <div className="preview-modal-scroll overflow-y-auto p-8 md:p-8 lg:p-8">
            <div className="mx-auto w-full max-w-4xl space-y-6">
              <DialogHeader>
                <DialogTitle className="text-lg">Kundenlink erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="share-recipient-name">
                      Für wen? (Name)
                    </label>
                    <Input
                      id="share-recipient-name"
                      placeholder="z. B. Max Mustermann"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-sm font-medium"
                      htmlFor="share-recipient-email"
                    >
                      E-Mail (optional)
                    </label>
                    <Input
                      id="share-recipient-email"
                      type="email"
                      placeholder="max@firma.de"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mit Name wird ein personalisierter Link erzeugt (Tracking pro
                  Empfänger).
                </p>
                {shareLinkLoading ? (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <AppIcon icon={Loader} size={16} className="animate-spin" /> Wird
                    geladen…
                  </p>
                ) : shareLinkUrl ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={shareLinkUrl}
                        readOnly
                        className="flex-1 font-mono text-xs"
                        aria-label="Generierter Kundenlink"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(shareLinkUrl)
                            toast.success('Link in Zwischenablage kopiert')
                          } catch {
                            toast.error('Kopieren fehlgeschlagen')
                          }
                        }}
                      >
                        <AppIcon icon={CopyIcon} size={16} className="mr-2" />
                        Kopieren
                      </Button>
                    </div>
                    <a
                      href={shareLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      URL öffnen <AppIcon icon={ExternalLink} size={12} />
                    </a>
                  </div>
                ) : (
                  <Button
                    disabled={shareLinkGenerateLoading || !reference}
                    onClick={async () => {
                      if (!reference) return
                      setShareLinkGenerateLoading(true)
                      try {
                        const result = await createSharedPortfolio(
                          [reference.id],
                          recipientName.trim()
                            ? {
                                label: recipientName.trim(),
                                visitorEmail: recipientEmail.trim() || null,
                              }
                            : null,
                        )
                        if (result.success) {
                          const publicUrl = toAbsoluteUrl(result.url)
                          setShareLinkUrl(publicUrl)
                          try {
                            await navigator.clipboard.writeText(publicUrl)
                            toast.success('Kundenlink in die Zwischenablage kopiert.')
                          } catch {
                            toast.success('Kundenlink erstellt')
                          }
                        } else {
                          toast.error(result.error ?? 'Erstellen fehlgeschlagen')
                        }
                      } finally {
                        setShareLinkGenerateLoading(false)
                      }
                    }}
                  >
                    {shareLinkGenerateLoading ? (
                      <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                    ) : (
                      <AppIcon icon={LinkIcon} size={16} className="mr-2" />
                    )}
                    Link erstellen
                  </Button>
                )}
              </div>
              {reference && (
                <div className="pt-4">
                  <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
                    Kundenansicht (Vorschau)
                  </p>
                  <ReferenceReader reference={reference} />
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 justify-center border-t bg-muted/30 px-8 py-4">
            <Button
              variant="outline"
              onClick={() => {
                onClose()
              }}
            >
              Schließen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
