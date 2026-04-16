'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteReference } from '@/app/dashboard/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

/** Nach Soft-Delete zurück zur Referenzen-Liste. */
export async function deleteReferenceFromDetailPage(id: string) {
  await deleteReference(id)
  revalidatePath(ROUTES.evidence.root)
  redirect(ROUTES.evidence.root)
}

type AnonymizeResult =
  | { success: true; referenceId: string }
  | { success: false; error: string }

type AnonymizedContent = {
  title: string
  summary: string | null
  customer_challenge: string | null
  our_solution: string | null
  incumbent_provider: string | null
  competitors: string | null
  contract_type: string | null
  tags: string | null
}

function volumeToRange(raw: string | null): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value) || value <= 0) return '>100k EUR'
  if (value >= 1_000_000) return '>1M EUR'
  if (value >= 500_000) return '500k-1M EUR'
  if (value >= 100_000) return '100k-500k EUR'
  return '<100k EUR'
}

function applyFallbackAnonymization(
  input: {
    title: string
    summary: string | null
    customer_challenge: string | null
    our_solution: string | null
    incumbent_provider: string | null
    competitors: string | null
    contract_type: string | null
    tags: string | null
  },
  companyName: string,
  industry: string | null
): AnonymizedContent {
  const genericCompany = `Führendes ${industry?.trim() || 'Branche'}-Unternehmen`
  const normalizeText = (text: string | null): string | null =>
    text
      ? text
          .replace(new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), genericCompany)
          .replace(/\b(SAP|Salesforce|AWS|Azure|GCP|Microsoft|Oracle|ServiceNow|Kubernetes|Snowflake)\b/gi, 'führende Enterprise-Technologie')
      : null

  const title = normalizeText(input.title) ?? input.title
  return {
    title: title.includes('(Anonymisiert)') ? title : `${title} (Anonymisiert)`,
    summary: normalizeText(input.summary),
    customer_challenge: normalizeText(input.customer_challenge),
    our_solution: normalizeText(input.our_solution),
    incumbent_provider: null,
    competitors: null,
    contract_type: normalizeText(input.contract_type),
    tags: input.tags
      ? input.tags
          .split(',')
          .map(() => 'Enterprise-Transformation')
          .slice(0, 3)
          .join(', ')
      : null,
  }
}

async function anonymizeWithOpenAI(params: {
  apiKey: string
  companyName: string
  industry: string | null
  content: {
    title: string
    summary: string | null
    customer_challenge: string | null
    our_solution: string | null
    incumbent_provider: string | null
    competitors: string | null
    contract_type: string | null
    tags: string | null
  }
}): Promise<AnonymizedContent | null> {
  const prompt = `Du anonymisierst Referenzinhalte fuer NDA-sichere Freigaben.
Regeln:
- Firmenname "${params.companyName}" und Kontakte duerfen nicht vorkommen.
- Verwende stattdessen "Führendes ${params.industry?.trim() || 'Branche'}-Unternehmen".
- Mache spezifische Technologien/Vendoren generisch.
- Gib nur JSON zurueck:
{
  "title":"...",
  "summary":"...",
  "customer_challenge":"...",
  "our_solution":"...",
  "incumbent_provider":null,
  "competitors":null,
  "contract_type":"...",
  "tags":"comma,separated,tags"
}`

  const userPayload = JSON.stringify(params.content)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userPayload },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) return null
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const raw = json?.choices?.[0]?.message?.content?.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<AnonymizedContent>
    if (!parsed.title) return null
    return {
      title: parsed.title,
      summary: parsed.summary ?? null,
      customer_challenge: parsed.customer_challenge ?? null,
      our_solution: parsed.our_solution ?? null,
      incumbent_provider: null,
      competitors: null,
      contract_type: parsed.contract_type ?? null,
      tags: parsed.tags ?? null,
    }
  } catch {
    return null
  }
}

export async function createAnonymizedReferenceVersion(id: string): Promise<AnonymizeResult> {
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

  if (!profile?.organization_id) {
    return { success: false, error: 'Kein Workspace gefunden.' }
  }
  const role = (profile.role as string | null) ?? 'sales'
  if (role === 'sales') {
    return { success: false, error: 'Keine Berechtigung für diese Aktion.' }
  }

  const { data: row, error } = await supabase
    .from('references')
    .select(`
      *,
      companies ( id, name )
    `)
    .eq('id', id)
    .single()

  if (error || !row) {
    return { success: false, error: 'Referenz nicht gefunden.' }
  }

  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
  const originalCompanyName = company?.name ?? 'Unternehmen'
  const anonymousCompanyName = `Führendes ${(row.industry as string | null)?.trim() || 'Branche'}-Unternehmen`

  const { data: anonymousCompany, error: companyInsertError } = await supabase
    .from('companies')
    .insert({
      organization_id: profile.organization_id,
      name: anonymousCompanyName,
    })
    .select('id')
    .single()
  if (companyInsertError || !anonymousCompany?.id) {
    return { success: false, error: companyInsertError?.message ?? 'Anonyme Firma konnte nicht erstellt werden.' }
  }

  const contentInput = {
    title: (row.title as string) ?? 'Anonymisierte Referenz',
    summary: (row.summary as string | null) ?? null,
    customer_challenge: (row.customer_challenge as string | null) ?? null,
    our_solution: (row.our_solution as string | null) ?? null,
    incumbent_provider: (row.incumbent_provider as string | null) ?? null,
    competitors: (row.competitors as string | null) ?? null,
    contract_type: (row.contract_type as string | null) ?? null,
    tags: (row.tags as string | null) ?? null,
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim()
  const aiVersion = openAiKey
    ? await anonymizeWithOpenAI({
        apiKey: openAiKey,
        companyName: originalCompanyName,
        industry: (row.industry as string | null) ?? null,
        content: contentInput,
      })
    : null

  const anonymized = aiVersion ?? applyFallbackAnonymization(
    contentInput,
    originalCompanyName,
    (row.industry as string | null) ?? null
  )

  const payload = {
    organization_id: row.organization_id as string,
    company_id: anonymousCompany.id,
    title: anonymized.title,
    summary: anonymized.summary,
    industry: row.industry as string | null,
    country: row.country as string | null,
    status: 'approved',
    tags: anonymized.tags,
    website: null,
    employee_count: row.employee_count as number | null,
    volume_eur: volumeToRange((row.volume_eur as string | null) ?? null),
    contract_type: anonymized.contract_type,
    incumbent_provider: anonymized.incumbent_provider,
    competitors: anonymized.competitors,
    customer_challenge: anonymized.customer_challenge,
    our_solution: anonymized.our_solution,
    contact_id: null,
    customer_contact_id: null,
    customer_contact: null,
    file_path: null,
    project_status: row.project_status as string | null,
    project_start: row.project_start as string | null,
    project_end: row.project_end as string | null,
    duration_months: row.duration_months as number | null,
    is_nda_deal: true,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('references')
    .insert(payload)
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    return { success: false, error: insertError?.message ?? 'Anonymisierte Referenz konnte nicht erstellt werden.' }
  }

  revalidatePath(ROUTES.evidence.root)
  revalidatePath(ROUTES.evidence.detail(inserted.id))
  return { success: true, referenceId: inserted.id }
}
