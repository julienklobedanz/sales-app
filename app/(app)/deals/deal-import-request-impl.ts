import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import * as XLSX from 'xlsx'
import { log } from '@/lib/observability/logger'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'

/** Marktlisten (xlsx) importieren: Zeilen als Expiring Deals anlegen. */
export async function importDealsFromXlsxImpl(
  formData: FormData,
): Promise<{ success: boolean; created?: number; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (profileIsSalesRestricted(systemRole, functionRole)) {
    return { success: false, error: 'Keine Berechtigung.' }
  }

  const file = formData.get('file') as File | null
  if (!file || !(file instanceof File))
    return { success: false, error: 'Keine Datei übergeben.' }
  const buf = Buffer.from(await file.arrayBuffer())
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buf, { type: 'buffer' })
  } catch (e) {
    log.error('parse error', { action: 'importDealsFromXlsx.parse' }, e)
    return { success: false, error: 'Ungültige Excel-Datei.' }
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return { success: false, error: 'Kein Arbeitsblatt in der Datei.' }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  if (!rows.length) return { success: false, error: 'Keine Datenzeilen in der Datei.' }

  const col = (obj: Record<string, unknown>, ...names: string[]) => {
    const objKeys = Object.keys(obj)
    for (const n of names) {
      const lower = n.trim().toLowerCase()
      const k = objKeys.find(
        (key) =>
          key.trim().toLowerCase().includes(lower) ||
          lower.includes(key.trim().toLowerCase()),
      )
      if (k) {
        const v = obj[k]
        return typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : ''
      }
    }
    return ''
  }

  let created = 0
  for (const row of rows) {
    const title = col(row, 'titel', 'title', 'name') || col(row, 'deal', 'bezeichnung')
    if (!title) continue
    const industry = col(row, 'branche', 'industry', 'sector')
    const volume = col(row, 'volumen', 'volume', 'value', 'wert')
    const incumbent_provider = col(
      row,
      'anbieter',
      'incumbent',
      'provider',
      'aktueller anbieter',
      'current provider',
    )
    let expiry_date: string | null = null
    const dateVal = col(row, 'ablauf', 'expiry', 'expiry date', 'datum', 'date', 'end')
    if (dateVal) {
      const d = new Date(dateVal)
      if (!Number.isNaN(d.getTime())) expiry_date = d.toISOString().slice(0, 10)
    }
    const { error } = await supabase.from('deals').insert({
      organization_id: orgId,
      title,
      company_id: null,
      industry: industry || null,
      volume: volume || null,
      incumbent_provider: incumbent_provider || null,
      is_public: true,
      status: 'open',
      expiry_date,
    })
    if (error) {
      log.error('insert error', { action: 'importDealsFromXlsx.insert' }, error)
      continue
    }
    created++
  }
  revalidatePath(ROUTES.deals.root)
  return { success: true, created }
}

export async function createDealReferenceRequestImpl(args: {
  dealId: string
  message: string
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const message = args.message.trim()
  if (!message) return { success: false, error: 'Beschreibung ist erforderlich.' }

  const { data, error } = await supabase
    .from('deal_reference_requests')
    .insert({
      organization_id: orgId,
      deal_id: args.dealId,
      message,
      status: 'open',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(args.dealId))
  return { success: true, id: data?.id as string }
}
