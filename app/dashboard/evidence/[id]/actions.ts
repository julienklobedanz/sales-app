'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteReference } from '@/app/dashboard/actions'
import { ROUTES } from '@/lib/routes'

/** Nach Soft-Delete zurück zur Referenzen-Liste. */
export async function deleteReferenceFromDetailPage(id: string) {
  await deleteReference(id)
  revalidatePath(ROUTES.evidence.root)
  redirect(ROUTES.evidence.root)
}
