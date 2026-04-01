'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type ReferenceAssetRow = {
  id: string
  reference_id: string
  file_path: string
  file_name: string | null
  file_type: string | null
  category: 'sales' | 'contract' | 'other'
  created_at: string
}

export async function getReferenceAssetsImpl(referenceId: string): Promise<ReferenceAssetRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('reference_assets')
    .select('id, reference_id, file_path, file_name, file_type, category, created_at')
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: true })
  if (error) return []
  return (data ?? []).map((r) => ({
    id: r.id,
    reference_id: r.reference_id,
    file_path: r.file_path,
    file_name: r.file_name ?? null,
    file_type: r.file_type ?? null,
    category: (r.category as 'sales' | 'contract' | 'other') || 'other',
    created_at: r.created_at,
  }))
}

export async function updateReferenceAssetCategoryImpl(
  assetId: string,
  category: 'sales' | 'contract' | 'other'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('reference_assets').update({ category }).eq('id', assetId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

