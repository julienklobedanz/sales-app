'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { revalidateOrgCachesForReference, revalidateOrgReferences } from '@/lib/cache/revalidate-org'

export async function deleteReferenceImpl(id: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('references')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(ROUTES.home)
  await revalidateOrgCachesForReference(id)
}

export async function restoreReferenceImpl(id: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('references').update({ deleted_at: null }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(ROUTES.home)
  await revalidateOrgCachesForReference(id)
}

export async function hardDeleteReferenceImpl(id: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('references').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(ROUTES.home)
  await revalidateOrgCachesForReference(id)
}

export type EmptyTrashResult = {
  success: boolean
  deleted: number
  error?: string
}

export async function emptyTrashImpl(): Promise<EmptyTrashResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, deleted: 0, error: 'Nicht angemeldet.' }
  }

  const { data, error } = await supabase
    .from('references')
    .delete()
    .not('deleted_at', 'is', null)
    .select('id')

  if (error) {
    return { success: false, deleted: 0, error: error.message }
  }

  const deleted = (data as { id: string }[] | null)?.length ?? 0
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.organization_id) {
    revalidateOrgReferences(profile.organization_id)
  }
  revalidatePath(ROUTES.home)
  return { success: true, deleted }
}

