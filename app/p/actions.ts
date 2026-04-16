'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

/** Referenz-Objekt wie von get_public_portfolio RPC zurückgegeben (kompatibel mit ReferenceRow) */
export type PublicReference = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  status: string
  company_name: string
  company_logo_url: string | null
  website: string | null
  employee_count: number | null
  volume_eur: string | null
  contract_type: string | null
  incumbent_provider: string | null
  competitors: string | null
  customer_challenge: string | null
  our_solution: string | null
  tags: string | null
  project_status: string | null
  project_start: string | null
  project_end: string | null
  duration_months: number | null
}

export type PublicPortfolioResult =
  | { found: true; slug: string; view_count: number; references: PublicReference[] }
  | { found: false }

export type PublicPortfolioBranding =
  | {
      found: true
      name: string
      logo_url: string | null
      primary_color: string
      secondary_color: string
    }
  | { found: false }

/** Öffentliches Portfolio per Slug laden (RPC; anon erlaubt wenn is_active) */
export async function getPublicPortfolio(slug: string): Promise<PublicPortfolioResult> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('get_public_portfolio', { p_slug: slug })
  if (error) return { found: false }
  const payload = data as { found?: boolean; slug?: string; view_count?: number; references?: PublicReference[] } | null
  if (!payload?.found || !payload.slug) return { found: false }
  return {
    found: true,
    slug: payload.slug,
    view_count: payload.view_count ?? 0,
    references: Array.isArray(payload.references) ? payload.references : [],
  }
}

/** Aufrufzähler erhöhen (wird beim Anzeigen der Public Page aufgerufen) */
export async function incrementPortfolioViews(slug: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.rpc('increment_portfolio_views', { p_slug: slug })
  await supabase.rpc('log_share_link_viewed', { p_slug: slug })
}

export async function getPublicPortfolioBranding(
  slug: string
): Promise<PublicPortfolioBranding> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('get_public_portfolio_branding', { p_slug: slug })
  if (error) return { found: false }
  const payload = data as {
    found?: boolean
    name?: string
    logo_url?: string | null
    primary_color?: string
    secondary_color?: string
  } | null
  if (!payload?.found || !payload.name) return { found: false }
  return {
    found: true,
    name: payload.name,
    logo_url: payload.logo_url ?? null,
    primary_color: payload.primary_color ?? '#0f172a',
    secondary_color: payload.secondary_color ?? '#334155',
  }
}

/** Kunden-Killswitch: Link sofort sperren (anon erlaubt – wer den Link hat, darf sperren) */
export async function deactivatePortfolio(slug: string): Promise<{ success: boolean }> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('deactivate_portfolio', { p_slug: slug })
  if (error) return { success: false }
  return { success: data === true }
}
