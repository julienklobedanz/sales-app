import type { SupabaseClient } from '@supabase/supabase-js'

import { getAppOrigin } from '@/lib/env/app-origin'

export function buildCustomerManageUrl(
  publicPreviewUrl: string,
  manageToken: string,
): string {
  const u = new URL(publicPreviewUrl)
  u.searchParams.set('manage', manageToken)
  u.searchParams.set('mode', 'revoke')
  return u.toString()
}

export async function getPublicPreviewUrlForReference(
  supabase: SupabaseClient,
  referenceId: string,
): Promise<string | null> {
  const id = String(referenceId ?? '').trim()
  if (!id) return null

  const { data: rows } = await supabase
    .from('shared_portfolios')
    .select('slug')
    .eq('is_active', true)
    .contains('reference_ids', [id])
    .limit(1)

  const slug = (rows?.[0] as { slug?: string } | undefined)?.slug
  if (!slug) return null
  return `${getAppOrigin()}/p/${encodeURIComponent(slug)}`
}
