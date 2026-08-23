'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteReference } from '@/app/(app)/actions'
import { ROUTES } from '@/lib/routes'
import { logEventForCurrentOrg } from '@/lib/events/log-event'

/** Einmal pro Detail-Ansicht: Referenz geöffnet (Epic 15). */
export async function logReferenceViewed(referenceId: string) {
  await logEventForCurrentOrg({
    eventType: 'reference_viewed',
    referenceId,
    payload: {},
  })
}

/** Nach Soft-Delete zurück zur Referenzen-Liste. */
export async function deleteReferenceFromDetailPage(id: string) {
  await deleteReference(id)
  revalidatePath(ROUTES.references.root)
  redirect(ROUTES.references.root)
}
