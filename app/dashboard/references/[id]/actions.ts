'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteReference } from '@/app/dashboard/actions'
import {
  prepareCustomerApproval,
  getApprovalLink,
  resendClientApprovalEmail,
  withdrawApprovalRequest,
} from '@/app/dashboard/actions'
import { asReferenceStatus, asTableInsert } from '@/lib/supabase/db-types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { logEventForCurrentOrg } from '@/lib/events/log-event'
import { clampNarrativeTextNullable } from '@/lib/references/reference-narrative-limits'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { userCanAnonymizeReference } from '@/lib/roles/reference-access'

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

export async function prepareCustomerApprovalFromDetail(referenceId: string) {
  const result = await prepareCustomerApproval(referenceId)
  if (result.success) {
    revalidatePath(ROUTES.references.detail(referenceId))
  }
  return result
}

export async function resendApprovalFromDetail(referenceId: string) {
  await resendClientApprovalEmail(referenceId)
  revalidatePath(ROUTES.references.detail(referenceId))
}

export async function withdrawApprovalFromDetail(referenceId: string) {
  await withdrawApprovalRequest(referenceId)
  revalidatePath(ROUTES.references.detail(referenceId))
}

export async function getApprovalLinkFromDetail(referenceId: string) {
  return getApprovalLink(referenceId)
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
  const cleaned = raw
    .replace(/[^\d.,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
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
  industry: string | null,
): AnonymizedContent {
  const genericCompany = `Führendes ${industry?.trim() || 'Branche'}-Unternehmen`
  const normalizeText = (text: string | null): string | null =>
    text
      ? text
          .replace(
            new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
            genericCompany,
          )
          .replace(
            /\b(SAP|Salesforce|AWS|Azure|GCP|Microsoft|Oracle|ServiceNow|Kubernetes|Snowflake)\b/gi,
            'führende Enterprise-Technologie',
          )
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
  const prompt = `Du anonymisierst Referenzinhalte für NDA-sichere Freigaben.
Regeln:
- Firmenname "${params.companyName}" und Kontakte dürfen nicht vorkommen.
- Verwende stattdessen "Führendes ${params.industry?.trim() || 'Branche'}-Unternehmen".
- Mache spezifische Technologien/Vendoren generisch.
- Gib nur JSON zurück:
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
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
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

export async function createAnonymizedReferenceVersion(
  id: string,
): Promise<AnonymizeResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return { success: false, error: 'Kein Workspace gefunden.' }
  }
  const roles = parseProfileRoles(profile)
  if (
    !userCanAnonymizeReference(roles.functionRole, roles.systemRole, roles.capabilities)
  ) {
    return { success: false, error: 'Keine Berechtigung für diese Aktion.' }
  }

  const { data: row, error } = await supabase
    .from('references')
    .select(
      `
      *,
      companies ( id, name )
    `,
    )
    .eq('id', id)
    .single()

  if (error || !row) {
    return { success: false, error: 'Referenz nicht gefunden.' }
  }

  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
  const originalCompanyName = company?.name ?? 'Unternehmen'

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

  const anonymized =
    aiVersion ??
    applyFallbackAnonymization(
      contentInput,
      originalCompanyName,
      (row.industry as string | null) ?? null,
    )

  const payload = {
    organization_id: row.organization_id as string,
    // Keine anonymen Firmen mehr anlegen: die anonymisierte Version bleibt beim bestehenden Account.
    company_id: row.company_id as string,
    title: anonymized.title,
    summary: clampNarrativeTextNullable(anonymized.summary),
    industry: row.industry as string | null,
    country: row.country as string | null,
    status: asReferenceStatus('anonymized'),
    tags: anonymized.tags,
    website: null,
    employee_count: row.employee_count as number | null,
    volume_eur: volumeToRange((row.volume_eur as string | null) ?? null),
    contract_type: anonymized.contract_type,
    incumbent_provider: anonymized.incumbent_provider,
    competitors: anonymized.competitors,
    customer_challenge: clampNarrativeTextNullable(anonymized.customer_challenge),
    our_solution: clampNarrativeTextNullable(anonymized.our_solution),
    contact_id: null,
    customer_contact_id: null,
    customer_contact: null,
    file_path: null,
    project_status: row.project_status as string | null,
    project_start: row.project_start as string | null,
    project_end: row.project_end as string | null,
    is_nda_deal: true,
    anonymized_from_id: id,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('references')
    .insert(asTableInsert<'references'>(payload))
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    return {
      success: false,
      error:
        insertError?.message ?? 'Anonymisierte Referenz konnte nicht erstellt werden.',
    }
  }

  revalidatePath(ROUTES.references.root)
  revalidatePath(ROUTES.references.detail(inserted.id))
  return { success: true, referenceId: inserted.id }
}
