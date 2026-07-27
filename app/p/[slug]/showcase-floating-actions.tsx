'use client'

import { Suspense } from 'react'

import { ShowcaseContactFab } from './showcase-contact-fab'
import { ShowcaseRevokeAction } from './showcase-revoke-action'

/**
 * Floating-Actions in Sperr-/Manage-Ansicht (unten rechts).
 * Reihenfolge (oben → unten): Zugriff sperren, dann Sales-Ansprechpartner.
 */
export function ShowcaseFloatingActions({
  slug,
  showRevoke,
  shareOwnerName,
  shareOwnerPosition,
  shareOwnerAvatar,
  shareOwnerEmail,
  shareOwnerPhone,
}: {
  slug: string
  showRevoke: boolean
  shareOwnerName: string
  shareOwnerPosition: string
  shareOwnerAvatar: string | null
  shareOwnerEmail: string | null
  shareOwnerPhone: string | null
}) {
  const showContact = Boolean(shareOwnerName?.trim())

  if (!showRevoke && !showContact) return null

  return (
    <div className="fixed bottom-6 right-8 z-50 flex flex-col items-end gap-3">
      {showRevoke ? (
        <Suspense fallback={null}>
          <ShowcaseRevokeAction slug={slug} />
        </Suspense>
      ) : null}

      {showContact ? (
        <ShowcaseContactFab
          name={shareOwnerName}
          position={shareOwnerPosition}
          avatarUrl={shareOwnerAvatar}
          email={shareOwnerEmail}
          phone={shareOwnerPhone}
        />
      ) : null}
    </div>
  )
}
