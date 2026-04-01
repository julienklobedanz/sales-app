'use client'

import { useEffect, useState } from 'react'
import { CopyIcon, ExternalLink, LinkIcon, Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AppIcon } from '@/lib/icons'

import type { ReferenceRow } from '../actions'
import { createSharedPortfolio, getExistingShareForReference } from '../actions'
import { ReferenceReader } from '../reference-reader'

function sanitizeSharedUrl(url: string) {
  return url.replace(/\[([^\]]+)\]/g, '$1').replace(/\[|\]/g, '')
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

  const refId = reference?.id ?? null

  useEffect(() => {
    if (!refId) {
      setShareLinkUrl(null)
      return
    }
    setShareLinkLoading(true)
    getExistingShareForReference(refId)
      .then((existing) =>
        setShareLinkUrl(existing?.url ? sanitizeSharedUrl(existing.url) : null),
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
              <h3 className="text-lg font-semibold">Kundenlink erstellen</h3>
              <div className="space-y-3">
                {shareLinkLoading ? (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <AppIcon icon={Loader} size={16} className="animate-spin" /> Wird geladen…
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
                        const result = await createSharedPortfolio([reference.id])
                        if (result.success) {
                          setShareLinkUrl(sanitizeSharedUrl(result.url))
                          toast.success('Kundenlink erstellt')
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
