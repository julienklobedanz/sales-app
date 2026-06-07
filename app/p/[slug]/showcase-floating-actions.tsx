'use client'

import { Suspense } from 'react'

import { cn } from '@/lib/utils'
import { ShowcaseContactFab } from './showcase-contact-fab'
import { ShowcaseRevokeAction } from './showcase-revoke-action'

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
    <>
      {showContact ? (
        <div
          className={cn(
            'fixed right-8 z-50',
            showRevoke ? 'bottom-[4.75rem]' : 'bottom-6'
          )}
        >
          <ShowcaseContactFab
            name={shareOwnerName}
            position={shareOwnerPosition}
            avatarUrl={shareOwnerAvatar}
            email={shareOwnerEmail}
            phone={shareOwnerPhone}
          />
        </div>
      ) : null}

      {showRevoke ? (
        <div className="fixed bottom-6 right-8 z-40">
          <Suspense fallback={null}>
            <ShowcaseRevokeAction slug={slug} />
          </Suspense>
        </div>
      ) : null}
    </>
  )
}
