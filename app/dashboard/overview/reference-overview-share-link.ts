import { toast } from 'sonner'

import {
  createSharedPortfolio,
  getExistingShareForReference,
} from '@/app/dashboard/actions'

function toAbsoluteShareUrl(shareUrl: string): string {
  if (shareUrl.startsWith('http://') || shareUrl.startsWith('https://')) {
    return shareUrl
  }
  return new URL(shareUrl, window.location.origin).toString()
}

/** Bestehenden oder neuen Kundenlink für eine Referenz in die Zwischenablage kopieren. */
export async function copyReferenceShareLink(referenceId: string): Promise<void> {
  const existing = await getExistingShareForReference(referenceId)
  let shareUrl = existing?.url ?? null
  if (!shareUrl) {
    const created = await createSharedPortfolio([referenceId])
    if (!created.success) {
      toast.error(created.error ?? 'Kundenlink konnte nicht erstellt werden.')
      return
    }
    shareUrl = created.url
  }
  await navigator.clipboard.writeText(toAbsoluteShareUrl(shareUrl))
  toast.success('Kundenlink kopiert.')
}

/** Kollektions-Link für mehrere Referenzen erstellen und kopieren. */
export async function createAndCopyCollectionShareLink(
  referenceIds: string[],
): Promise<void> {
  const result = await createSharedPortfolio(referenceIds)
  if (!result.success) {
    toast.error(result.error ?? 'Kollektions-Link konnte nicht erstellt werden.')
    return
  }
  await navigator.clipboard.writeText(toAbsoluteShareUrl(result.url))
  toast.success('Kollektions-Link erstellt und kopiert.')
}
