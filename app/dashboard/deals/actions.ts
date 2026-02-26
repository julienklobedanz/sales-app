'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type DealStatus =
  | 'in_negotiation'
  | 'rfp_phase'
  | 'won'
  | 'lost'
  | 'on_hold'

export type DealRow = {
  id: string
  title: string
  company_id: string | null
  company_name: string | null
  industry: string | null
  volume: string | null
  is_public: boolean
  account_manager_id: string | null
  account_manager_name: string | null
  sales_manager_id: string | null
  sales_manager_name: string | null
  status: DealStatus
  expiry_date: string | null
  created_at: string
  updated_at: string | null
}

export type DealWithReferences = DealRow & {
  references: { id: string; title: string; company_name: string }[]
}

const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  in_negotiation: 'In Verhandlung',
  rfp_phase: 'RFP Phase',
  won: 'Gewonnen',
  lost: 'Verloren',
  on_hold: 'Pausiert',
}

export { DEAL_STATUS_LABELS }

export async function getDeals(): Promise<DealRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return []

  const { data: rows, error } = await supabase
    .from('deals')
    .select(`
      id,
      title,
      company_id,
      industry,
      volume,
      is_public,
      account_manager_id,
      sales_manager_id,
      status,
      expiry_date,
      created_at,
      updated_at,
      companies ( name )
    `)
    .eq('organization_id', orgId)
    .order('expiry_date', { ascending: true, nullsFirst: false })

  if (error) return []

  const accountManagerIds = [
    ...new Set((rows ?? []).map((r) => r.account_manager_id).filter(Boolean)),
  ] as string[]
  const salesManagerIds = [
    ...new Set((rows ?? []).map((r) => r.sales_manager_id).filter(Boolean)),
  ] as string[]
  const allUserIds = [...new Set([...accountManagerIds, ...salesManagerIds])]

  let names: Record<string, string> = {}
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allUserIds)
    for (const p of profiles ?? []) {
      names[p.id] = p.full_name ?? p.id.slice(0, 8)
    }
  }

  return (rows ?? []).map((r) => {
    const company = Array.isArray(r.companies) ? (r.companies[0] as { name?: string }) : (r.companies as { name?: string } | null)
    return {
      id: r.id,
      title: r.title,
      company_id: r.company_id ?? null,
      company_name: company?.name ?? null,
      industry: r.industry ?? null,
      volume: r.volume ?? null,
      is_public: r.is_public ?? true,
      account_manager_id: r.account_manager_id ?? null,
      account_manager_name: r.account_manager_id ? names[r.account_manager_id] ?? null : null,
      sales_manager_id: r.sales_manager_id ?? null,
      sales_manager_name: r.sales_manager_id ? names[r.sales_manager_id] ?? null : null,
      status: r.status as DealStatus,
      expiry_date: r.expiry_date ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at ?? null,
    }
  })
}

/** Deals mit Ablaufdatum in den nächsten 180 Tagen (oder bereits abgelaufen), für Progress-Anzeige */
export async function getExpiringDeals(): Promise<DealRow[]> {
  const all = await getDeals()
  const now = new Date()
  const in180 = new Date(now)
  in180.setDate(in180.getDate() + 180)
  return all.filter((d) => {
    if (!d.expiry_date) return false
    const exp = new Date(d.expiry_date)
    return exp <= in180
  })
}

export async function getDealWithReferences(id: string): Promise<DealWithReferences | null> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  if (!profile?.organization_id) return null

  const { data: deal, error } = await supabase
    .from('deals')
    .select(`
      id,
      title,
      company_id,
      industry,
      volume,
      is_public,
      account_manager_id,
      sales_manager_id,
      status,
      expiry_date,
      created_at,
      updated_at,
      companies ( name )
    `)
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (error || !deal) return null

  const { data: drRows } = await supabase
    .from('deal_references')
    .select('reference_id')
    .eq('deal_id', id)

  const refIds = (drRows ?? []).map((r) => r.reference_id).filter(Boolean) as string[]
  let references: { id: string; title: string; company_name: string }[] = []
  if (refIds.length > 0) {
    const { data: refs } = await supabase
      .from('references')
      .select('id, title, companies(name)')
      .in('id', refIds)
    for (const r of refs ?? []) {
      const company = Array.isArray(r.companies) ? (r.companies as { name?: string }[])[0] : (r.companies as { name?: string } | null)
      references.push({
        id: r.id,
        title: r.title ?? '',
        company_name: company?.name ?? '—',
      })
    }
  }

  const accountManagerName = deal.account_manager_id
    ? (await supabase.from('profiles').select('full_name').eq('id', deal.account_manager_id).single()).data?.full_name ?? null
    : null
  const salesManagerName = deal.sales_manager_id
    ? (await supabase.from('profiles').select('full_name').eq('id', deal.sales_manager_id).single()).data?.full_name ?? null
    : null

  const company = Array.isArray(deal.companies) ? deal.companies[0] : deal.companies

  return {
    id: deal.id,
    title: deal.title,
    company_id: deal.company_id ?? null,
    company_name: (company as { name?: string })?.name ?? null,
    industry: deal.industry ?? null,
    volume: deal.volume ?? null,
    is_public: deal.is_public ?? true,
    account_manager_id: deal.account_manager_id ?? null,
    account_manager_name: accountManagerName,
    sales_manager_id: deal.sales_manager_id ?? null,
    sales_manager_name: salesManagerName,
    status: deal.status as DealStatus,
    expiry_date: deal.expiry_date ?? null,
    created_at: deal.created_at,
    updated_at: deal.updated_at ?? null,
    references,
  }
}

export async function createDeal(formData: FormData): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const title = formData.get('title')?.toString()?.trim()
  if (!title) return { success: false, error: 'Titel ist erforderlich.' }

  const companyId = formData.get('company_id')?.toString() || null
  const industry = formData.get('industry')?.toString()?.trim() || null
  const volume = formData.get('volume')?.toString()?.trim() || null
  const is_public = formData.get('is_public') !== 'false'
  const account_manager_id = formData.get('account_manager_id')?.toString() || null
  const sales_manager_id = formData.get('sales_manager_id')?.toString() || null
  const status = (formData.get('status')?.toString() || 'in_negotiation') as DealStatus
  const expiry_date = formData.get('expiry_date')?.toString()?.trim() || null

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      organization_id: orgId,
      title,
      company_id: companyId || null,
      industry,
      volume,
      is_public,
      account_manager_id: account_manager_id || null,
      sales_manager_id: sales_manager_id || null,
      status,
      expiry_date: expiry_date || null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/deals')
  revalidatePath(`/dashboard/deals/${deal.id}`)
  return { success: true, id: deal.id }
}

/** Referenzen der eigenen Org (id, title, company_name) für Verknüpfung mit Deal */
export async function getReferencesForOrg(): Promise<{ id: string; title: string; company_name: string }[]> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return []

  const { data: rows } = await supabase
    .from('references')
    .select('id, title, companies(name)')
    .order('title')
  if (!rows) return []

  return rows.map((r) => {
    const company = Array.isArray(r.companies) ? (r.companies[0] as { name?: string }) : (r.companies as { name?: string } | null)
    return {
      id: r.id,
      title: r.title ?? '',
      company_name: company?.name ?? '—',
    }
  })
}

export async function addReferenceToDeal(dealId: string, referenceId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('deal_references').insert({ deal_id: dealId, reference_id: referenceId })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/deals')
  revalidatePath(`/dashboard/deals/${dealId}`)
  return {}
}

export async function removeReferenceFromDeal(dealId: string, referenceId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('deal_references')
    .delete()
    .eq('deal_id', dealId)
    .eq('reference_id', referenceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/deals')
  revalidatePath(`/dashboard/deals/${dealId}`)
  return {}
}

/** Referenzbedarf melden: E-Mail an Reference Manager (Admins der Org). Verwendet REFERENCE_MANAGER_EMAIL oder erste Admin-E-Mail. */
export async function submitReferenceRequest(
  dealId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const deal = await getDealWithReferences(dealId)
  if (!deal) return { success: false, error: 'Deal nicht gefunden.' }

  const { data: profile } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation.' }

  const toEmail = process.env.REFERENCE_MANAGER_EMAIL ?? null
  if (!toEmail) {
    return { success: false, error: 'REFERENCE_MANAGER_EMAIL ist nicht konfiguriert. Bitte in den Einstellungen hinterlegen.' }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const requesterName = profile?.full_name ?? user.email ?? 'Ein Nutzer'
      await resend.emails.send({
        from: 'Refstack <onboarding@resend.dev>',
        to: toEmail,
        subject: `Referenzbedarf: ${deal.title}`,
        html: `
          <h2>Referenzbedarf gemeldet</h2>
          <p><strong>Von:</strong> ${requesterName} (${user.email})</p>
          <p><strong>Deal:</strong> ${deal.title}</p>
          ${deal.company_name ? `<p><strong>Unternehmen:</strong> ${deal.company_name}</p>` : ''}
          ${deal.industry ? `<p><strong>Branche:</strong> ${deal.industry}</p>` : ''}
          ${deal.volume ? `<p><strong>Volumen:</strong> ${deal.volume}</p>` : ''}
          <p><strong>Nachricht:</strong></p>
          <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 12px;">${message || '—'}</pre>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/deals/${dealId}">Deal in Refstack öffnen</a></p>
        `,
      })
    } catch (e) {
      console.error('Referenzbedarf E-Mail:', e)
      return { success: false, error: 'E-Mail konnte nicht gesendet werden.' }
    }
  }

  revalidatePath(`/dashboard/deals/${dealId}`)
  return { success: true }
}
