import { NextRequest, NextResponse } from 'next/server'

import { analyzeRfp } from '@/lib/deal-desk/analyze-rfp'
import { finalizeRfpAnalysis } from '@/lib/deal-desk/finalize-rfp-analysis'
import { ensureDealDeskProjectForDeal } from '@/lib/deal-desk/ensure-deal-desk-project'
import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import { syncRfpDeadlinesFromTimeline } from '@/lib/deals/deadlines'
import { loadDealDocumentAsFile } from '@/lib/deals/load-deal-document-file'
import { extractRfpPlainTextFromFile } from '@/lib/document-text'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

type AnalyzeBody = {
  dealId?: string
  dealDocumentId?: string
  companyContextId?: string
  stage?: 'quick' | 'full'
}

async function parseAnalyzeRequest(req: NextRequest): Promise<AnalyzeBody | null> {
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      return (await req.json()) as AnalyzeBody
    } catch {
      return null
    }
  }

  try {
    const formData = await req.formData()
    return {
      dealId:
        typeof formData.get('dealId') === 'string'
          ? formData.get('dealId')!.toString()
          : undefined,
      dealDocumentId:
        typeof formData.get('dealDocumentId') === 'string'
          ? formData.get('dealDocumentId')!.toString()
          : undefined,
      companyContextId:
        typeof formData.get('companyContextId') === 'string'
          ? formData.get('companyContextId')!.toString()
          : undefined,
      stage: formData.get('stage') === 'quick' ? 'quick' : 'full',
    }
  } catch {
    return null
  }
}

/**
 * RFP-Analyse aus kanonischem `deal_documents`-Eintrag (`kind=ausschreibung`).
 * Persistiert Snapshot in `deal_desk_projects` — keine Kopie in `deal_desk_documents` / `rfp-documents`.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Nicht angemeldet.' },
      { status: 401 },
    )
  }

  const visibility = await loadReferenceVisibilityForUser(supabase, user.id)
  if (!visibility) {
    return NextResponse.json(
      { success: false, error: 'Keine Organisation zugeordnet.' },
      { status: 403 },
    )
  }

  const orgId = visibility.organizationId
  const salesVisibleOnly = visibility.salesVisibleOnly

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          'RFP-Analyse ist deaktiviert: OPENAI_API_KEY ist nicht konfiguriert (fehlender OPENAI-Schlüssel).',
      },
      { status: 501 },
    )
  }

  const body = await parseAnalyzeRequest(req)
  if (!body) {
    return NextResponse.json(
      { success: false, error: 'Ungültige Anfrage.' },
      { status: 400 },
    )
  }

  const dealId = body.dealId?.trim() ?? ''
  const dealDocumentId = body.dealDocumentId?.trim() ?? ''

  if (!dealId) {
    return NextResponse.json({ success: false, error: 'dealId fehlt.' }, { status: 400 })
  }
  if (!dealDocumentId) {
    return NextResponse.json(
      { success: false, error: 'dealDocumentId fehlt.' },
      { status: 400 },
    )
  }

  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .select('id, title, industry, volume, sales_manager_id, account_manager_id')
    .eq('id', dealId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (dealErr || !deal) {
    return NextResponse.json(
      { success: false, error: 'Deal nicht gefunden oder keine Berechtigung.' },
      { status: 404 },
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, function_role')
    .eq('id', user.id)
    .maybeSingle()

  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (
    !canManageDealDocuments(
      {
        sales_manager_id: deal.sales_manager_id ?? null,
        account_manager_id: deal.account_manager_id ?? null,
      },
      user.id,
      systemRole,
      functionRole,
    )
  ) {
    return NextResponse.json(
      { success: false, error: 'Keine Berechtigung für RFP-Analyse an diesem Deal.' },
      { status: 403 },
    )
  }

  const { data: dealDoc, error: docErr } = await supabase
    .from('deal_documents')
    .select(
      'id, deal_id, organization_id, file_name, kind, storage_path, mime_type, size_bytes',
    )
    .eq('id', dealDocumentId)
    .eq('deal_id', dealId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (docErr || !dealDoc) {
    return NextResponse.json(
      { success: false, error: 'Dokument nicht gefunden.' },
      { status: 404 },
    )
  }

  if (dealDoc.kind !== 'ausschreibung') {
    return NextResponse.json(
      {
        success: false,
        error: 'Nur Dokumente vom Typ Ausschreibung können analysiert werden.',
      },
      { status: 400 },
    )
  }

  let accountContextPrefix = ''
  const companyContextId = body.companyContextId?.trim()
  if (companyContextId) {
    const { data: co } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyContextId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (co?.name) {
      accountContextPrefix = `Relevanter Account-Kontext (optional): ${co.name}\n\n`
    }
  }

  const ensured = await ensureDealDeskProjectForDeal(supabase, {
    organizationId: orgId,
    userId: user.id,
    dealId,
    projectName: String(deal.title ?? 'RFP-Analyse'),
  })
  if ('error' in ensured) {
    return NextResponse.json({ success: false, error: ensured.error }, { status: 500 })
  }
  const projectId = ensured.projectId

  await supabase
    .from('deal_desk_projects')
    .update({ analysis_status: 'processing', error_message: null })
    .eq('id', projectId)

  const fail = async (message: string, status = 500) => {
    await supabase
      .from('deal_desk_projects')
      .update({ analysis_status: 'failed', error_message: message })
      .eq('id', projectId)
    return NextResponse.json({ success: false, error: message }, { status })
  }

  const loaded = await loadDealDocumentAsFile(supabase, dealDoc)
  if (!loaded.success) {
    return fail(loaded.error, 400)
  }

  const plain = await extractRfpPlainTextFromFile(loaded.file, { maxChars: 120_000 })
  if (!plain.success) {
    return fail(plain.error, 400)
  }

  const mergedText = accountContextPrefix + plain.text
  const fileNames = [dealDoc.file_name || 'document']

  const analyzed = await analyzeRfp({
    apiKey,
    supabase,
    organizationId: orgId,
    salesVisibleOnly,
    projectName: String(deal.title ?? 'RFP-Analyse'),
    fileNames,
    mergedText,
    deal: {
      title: deal.title ?? null,
      industry: deal.industry ?? null,
      volume: deal.volume ?? null,
    },
    projectDocuments: [
      {
        id: dealDoc.id,
        file_name: dealDoc.file_name,
        storage_path: dealDoc.storage_path,
        mime_type: dealDoc.mime_type,
      },
    ],
    stage: body.stage === 'quick' ? 'quick' : 'full',
  })

  if ('error' in analyzed) {
    return fail(analyzed.error, 422)
  }

  const persistedSnapshot = await finalizeRfpAnalysis(supabase, {
    projectId,
    organizationId: orgId,
    dealId,
    analyzed,
  })

  const { error: doneError } = await supabase
    .from('deal_desk_projects')
    .update({
      analysis_status: 'completed',
      analysis_snapshot: persistedSnapshot,
      analysis_source: 'api',
      win_probability: analyzed.snapshot.winProbability,
      customer_name: analyzed.snapshot.customerName,
      error_message: null,
    })
    .eq('id', projectId)

  if (doneError) {
    return fail(doneError.message)
  }

  await syncRfpDeadlinesFromTimeline(supabase, {
    dealId,
    organizationId: orgId,
    timelineItems: analyzed.snapshot.timelineItems ?? [],
  })

  return NextResponse.json({
    success: true,
    projectId,
    dealDocumentId: dealDoc.id,
    requirements: analyzed.requirements,
    coverage: analyzed.coverage,
  })
}
