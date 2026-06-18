'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

/** Prüft, ob der String wie eine Domain aussieht (z. B. "biontechse.com"). */
function looksLikeDomain(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (!t || t.includes(' ')) return false
  return /\.(com|de|net|org|io|eu|co|ai|cloud|global)$/i.test(t) || /\.[a-z]{2,}$/i.test(t)
}

/** Konvertiert Domain zu lesbarem Namen (z. B. "biontechse.com" → "Biontechse"). */
function domainToDisplayName(domain: string): string {
  const withoutProtocol =
    domain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0] ?? domain
  const withoutTld = withoutProtocol
    .replace(/\.(com|de|net|org|io|eu|co|ai|cloud|global|[a-z]{2,})$/i, '')
    .trim()
  const name = withoutTld || withoutProtocol
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

export type MergeDuplicateCompaniesResult =
  | { success: true; merged: number; deleted: number }
  | { success: false; error: string }

/** Dubletten zusammenführen: Pro Name/Domain eine company behalten, Referenzen umbiegen, Rest löschen. Nur eigene Org. */
export async function mergeDuplicateCompaniesImpl(): Promise<MergeDuplicateCompaniesResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }
  if (profile?.role !== 'admin') return { success: false, error: 'Nur für Admins.' }

  const { data: companies, error: fetchErr } = await supabase
    .from('companies')
    .select('id, name, website_url')
    .eq('organization_id', orgId)
  if (fetchErr) return { success: false, error: fetchErr.message }

  type CompanyRow = { id: string; name: string; website_url: string | null }
  const key = (c: CompanyRow) => {
    const nameNorm = (c.name ?? '').trim().toLowerCase()
    const domain =
      (c.website_url ?? '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0] ?? ''
    return domain || nameNorm || c.id
  }

  const groups = new Map<string, CompanyRow[]>()
  for (const c of (companies ?? []) as CompanyRow[]) {
    const k = key(c)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push({ id: c.id, name: c.name, website_url: c.website_url ?? null })
  }

  let merged = 0
  let deleted = 0
  for (const [, list] of groups) {
    if (list.length <= 1) continue
    const [keep, ...remove] = list
    for (const other of remove) {
      const { data: refs } = await supabase.from('references').select('id').eq('company_id', other.id)
      const refCount = refs?.length ?? 0
      const { error: upErr } = await supabase
        .from('references')
        .update({ company_id: keep.id })
        .eq('company_id', other.id)
      if (upErr) return { success: false, error: upErr.message }
      merged += refCount
      const { error: delErr } = await supabase.from('companies').delete().eq('id', other.id)
      if (delErr) return { success: false, error: delErr.message }
      deleted++
    }
  }

  revalidatePath(ROUTES.home)
  return { success: true, merged, deleted }
}

export type CleanupCompanyDomainNamesResult =
  | { success: true; updated: number }
  | { success: false; error: string }

/** Einträge korrigieren, bei denen fälschlicherweise eine URL/Domain als Name gespeichert wurde. */
export async function cleanupCompanyDomainNamesImpl(): Promise<CleanupCompanyDomainNamesResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }
  if (profile?.role !== 'admin') return { success: false, error: 'Nur für Admins.' }

  const { data: companies, error: fetchErr } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', orgId)
  if (fetchErr) return { success: false, error: fetchErr.message }

  let updated = 0
  for (const c of companies ?? []) {
    if (!c.name || !looksLikeDomain(c.name)) continue
    const newName = domainToDisplayName(c.name)
    const { error } = await supabase.from('companies').update({ name: newName }).eq('id', c.id)
    if (error) return { success: false, error: error.message }
    updated++
  }

  revalidatePath(ROUTES.home)
  return { success: true, updated }
}

