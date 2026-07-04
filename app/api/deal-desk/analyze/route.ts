import { NextRequest, NextResponse } from 'next/server'

import { analyzeRfp } from '@/lib/deal-desk/analyze-rfp'
import { finalizeRfpAnalysis } from '@/lib/deal-desk/finalize-rfp-analysis'
import { buildDemoDealDeskAnalysis } from '@/lib/deal-desk/mock-analysis'
import { syncRfpDeadlinesFromTimeline } from '@/lib/deals/deadlines'
import { defaultWorkspaceState } from '@/lib/deal-desk/workspace-state'
import { persistNormalizedWorkspace } from '@/lib/deal-desk/workspace-persistence'
import { extractRfpPlainTextFromFile } from '@/lib/extract-rfp-plain-text'
import { isOpenAiQuotaErrorMessage } from '@/lib/openai-api-errors'
import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const OPENAI_QUOTA_MOCK_WARNING =
  'OpenAI-Kontingent erschöpft — Demo-Analyse wurde geladen. Bitte Guthaben unter platform.openai.com/account/billing prüfen.'

const MISSING_OPENAI_KEY_MESSAGE =
  'KI-Analyse ist deaktiviert (OPENAI_API_KEY fehlt).'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_FILES = 10
const MAX_MERGED_CHARS = 120_000

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180)
  return base || 'upload.bin'
}

type StoredDoc = {
  id: string
  file_name: string
  storage_path: string
  mime_type: string | null
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const visibility = await loadReferenceVisibilityForUser(supabase, user.id)
  if (!visibility) {
    return NextResponse.json(
      { success: false, error: 'Onboarding unvollständig — keine Organisation.' },
      { status: 403 }
    )
  }

  const orgId = visibility.organizationId
  const salesVisibleOnly = visibility.salesVisibleOnly
  const apiKey = process.env.OPENAI_API_KEY

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const projectIdRaw = formData.get('projectId')
  const projectId = typeof projectIdRaw === 'string' ? projectIdRaw.trim() : ''
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId fehlt.' }, { status: 400 })
  }

  const reRun =
    formData.get('reRun') === '1' ||
    formData.get('reRun') === 'true' ||
    formData.get('reRun') === 'yes'
  const append =
    formData.get('append') === '1' ||
    formData.get('append') === 'true' ||
    formData.get('append') === 'yes'

  const { data: project, error: projectErr } = await supabase
    .from('deal_desk_projects')
    .select('id, project_name, organization_id, deal_id')
    .eq('id', projectId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (projectErr || !project) {
    return NextResponse.json({ success: false, error: 'Projekt nicht gefunden.' }, { status: 404 })
  }

  let uploadedFiles = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  let forceReRunAllDocs = reRun

  await supabase
    .from('deal_desk_projects')
    .update({ analysis_status: 'processing', error_message: null })
    .eq('id', projectId)

  const fail = async (message: string, status = 500, extra?: { isScanLikely?: boolean }) => {
    await supabase
      .from('deal_desk_projects')
      .update({ analysis_status: 'failed', error_message: message })
      .eq('id', projectId)
    return NextResponse.json(
      { success: false, error: message, ...extra },
      { status }
    )
  }

  if (append) {
    if (uploadedFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'Keine Dateien zum Hinzufügen.' }, { status: 400 })
    }

    const { count: existingCount, error: countErr } = await supabase
      .from('deal_desk_documents')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('organization_id', orgId)

    if (countErr) {
      return fail(countErr.message)
    }

    const total = (existingCount ?? 0) + uploadedFiles.length
    if (total > MAX_FILES) {
      return fail(
        `Maximal ${MAX_FILES} Dokumente pro Projekt (aktuell ${existingCount ?? 0}, +${uploadedFiles.length} neu).`,
        400
      )
    }

    const sortStart = existingCount ?? 0
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]!

      const { data: docRow, error: docErr } = await supabase
        .from('deal_desk_documents')
        .insert({
          project_id: projectId,
          organization_id: orgId,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          extract_status: 'pending',
          sort_order: sortStart + i,
        })
        .select('id')
        .single()

      if (docErr || !docRow?.id) {
        return fail(docErr?.message ?? 'Dokument-Metadaten fehlgeschlagen.')
      }

      const docId = docRow.id as string
      const safeName = sanitizeFileName(file.name)
      const storagePath = `${orgId}/deal-desk/${projectId}/${docId}/${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('rfp-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        await supabase
          .from('deal_desk_documents')
          .update({ extract_status: 'failed' })
          .eq('id', docId)
        return fail(`Upload fehlgeschlagen: ${uploadError.message}`)
      }

      await supabase
        .from('deal_desk_documents')
        .update({ storage_path: storagePath })
        .eq('id', docId)
    }

    uploadedFiles = []
    forceReRunAllDocs = true
  }

  const fileNames: string[] = []
  const textParts: string[] = []
  let mergedLen = 0
  let extractionUsedOcr = false

  async function finishWithMockQuotaFallback() {
    const mock = buildDemoDealDeskAnalysis(
      fileNames.length > 0 ? fileNames : ['RFP-Paket']
    )
    const workspace = defaultWorkspaceState(mock.redFlags, { useDemoBidTeam: true })
    await persistNormalizedWorkspace(supabase, projectId, orgId, workspace)
    await supabase
      .from('deal_desk_projects')
      .update({
        analysis_status: 'completed',
        analysis_snapshot: mock,
        analysis_source: 'mock',
        win_probability: mock.winProbability,
        customer_name: mock.customerName,
        error_message: null,
      })
      .eq('id', projectId)

    return NextResponse.json({
      success: true,
      projectId,
      source: 'mock',
      quotaExceeded: true,
      warning: OPENAI_QUOTA_MOCK_WARNING,
      extractionUsedOcr,
    })
  }

  function isQuotaError(error: string, extra?: { isQuotaError?: boolean }) {
    return Boolean(extra?.isQuotaError) || isOpenAiQuotaErrorMessage(error)
  }

  async function extractFromFile(file: File, docId: string | null) {
    if (!apiKey) {
      if (docId) {
        await supabase
          .from('deal_desk_documents')
          .update({ extract_status: 'skipped' })
          .eq('id', docId)
      }
      return
    }

    const plain = await extractRfpPlainTextFromFile(file, { maxChars: 50_000 })
    if (!plain.ok) {
      if (isQuotaError(plain.error, { isQuotaError: plain.isQuotaError })) {
        return finishWithMockQuotaFallback()
      }
      if (docId) {
        await supabase
          .from('deal_desk_documents')
          .update({ extract_status: 'failed' })
          .eq('id', docId)
      }
      return fail(plain.error, 400, { isScanLikely: plain.isScanLikely })
    }

    if (plain.extractionMethod === 'ocr') {
      extractionUsedOcr = true
    }

    if (docId) {
      await supabase
        .from('deal_desk_documents')
        .update({
          extract_status: plain.extractionMethod === 'ocr' ? 'ocr' : 'completed',
        })
        .eq('id', docId)
    }

    const chunk = `--- ${file.name} ---\n${plain.text}`
    if (mergedLen + chunk.length <= MAX_MERGED_CHARS) {
      textParts.push(chunk)
      mergedLen += chunk.length
    }
  }

  if (forceReRunAllDocs && uploadedFiles.length === 0) {
    const { data: storedDocs, error: docsErr } = await supabase
      .from('deal_desk_documents')
      .select('id, file_name, storage_path, mime_type')
      .eq('project_id', projectId)
      .eq('organization_id', orgId)
      .not('storage_path', 'is', null)
      .order('sort_order', { ascending: true })

    if (docsErr) {
      return fail(docsErr.message)
    }

    const docs = (storedDocs ?? []).filter(
      (d): d is StoredDoc =>
        typeof d.storage_path === 'string' && d.storage_path.length > 0
    )

    if (docs.length === 0) {
      return fail(
        'Keine gespeicherten Dokumente — bitte Dateien erneut hochladen oder „Neues RFP“ nutzen.',
        400
      )
    }
    if (docs.length > MAX_FILES) {
      return fail(`Maximal ${MAX_FILES} Dokumente.`, 400)
    }

    for (const doc of docs) {
      fileNames.push(doc.file_name)

      await supabase
        .from('deal_desk_documents')
        .update({ extract_status: 'pending' })
        .eq('id', doc.id)

      const { data: blob, error: downloadErr } = await supabase.storage
        .from('rfp-documents')
        .download(doc.storage_path)

      if (downloadErr || !blob) {
        await supabase
          .from('deal_desk_documents')
          .update({ extract_status: 'failed' })
          .eq('id', doc.id)
        return fail(`Download fehlgeschlagen: ${doc.file_name}`)
      }

      const file = new File([await blob.arrayBuffer()], doc.file_name, {
        type: doc.mime_type || blob.type || undefined,
      })

      const extractResult = await extractFromFile(file, doc.id)
      if (extractResult) return extractResult
    }
  } else {
    if (uploadedFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'Keine Dateien.' }, { status: 400 })
    }
    if (uploadedFiles.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: `Maximal ${MAX_FILES} Dateien.` },
        { status: 400 }
      )
    }

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]!
      fileNames.push(file.name)

      const { data: docRow, error: docErr } = await supabase
        .from('deal_desk_documents')
        .insert({
          project_id: projectId,
          organization_id: orgId,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          extract_status: 'pending',
          sort_order: i,
        })
        .select('id')
        .single()

      if (docErr || !docRow?.id) {
        return fail(docErr?.message ?? 'Dokument-Metadaten fehlgeschlagen.')
      }

      const docId = docRow.id as string
      const safeName = sanitizeFileName(file.name)
      const storagePath = `${orgId}/deal-desk/${projectId}/${docId}/${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('rfp-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        await supabase
          .from('deal_desk_documents')
          .update({ extract_status: 'failed' })
          .eq('id', docId)
        return fail(`Upload fehlgeschlagen: ${uploadError.message}`)
      }

      await supabase
        .from('deal_desk_documents')
        .update({ storage_path: storagePath })
        .eq('id', docId)

      const extractResult = await extractFromFile(file, docId)
      if (extractResult) return extractResult
    }
  }

  const projectName = (project.project_name as string) || 'RFP-Projekt'

  if (!apiKey) {
    await supabase
      .from('deal_desk_projects')
      .update({
        analysis_status: 'failed',
        error_message: MISSING_OPENAI_KEY_MESSAGE,
      })
      .eq('id', projectId)

    return NextResponse.json(
      {
        success: false,
        projectId,
        error: MISSING_OPENAI_KEY_MESSAGE,
        warning: MISSING_OPENAI_KEY_MESSAGE,
      },
      { status: 503 }
    )
  }

  if (textParts.length === 0) {
    return fail(
      'Kein extrahierbarer Text — bitte PDF, Word (DOCX) oder Excel (XLS/XLSX) mit lesbarem Inhalt hochladen.',
      400,
      { isScanLikely: true }
    )
  }

  const mergedText = textParts.join('\n\n')

  const { data: projectDocs } = await supabase
    .from('deal_desk_documents')
    .select('id, file_name, storage_path, mime_type')
    .eq('project_id', projectId)
    .eq('organization_id', orgId)

  const analyzed = await analyzeRfp({
    apiKey,
    supabase,
    organizationId: orgId,
    salesVisibleOnly,
    projectName,
    fileNames,
    mergedText,
    projectDocuments: (projectDocs ?? []).map((d) => ({
      id: d.id as string,
      file_name: d.file_name as string,
      storage_path: d.storage_path as string | null,
      mime_type: d.mime_type as string | null,
    })),
  })

  if ('error' in analyzed) {
    if (isQuotaError(analyzed.error, { isQuotaError: analyzed.isQuotaError })) {
      return finishWithMockQuotaFallback()
    }
    return fail(analyzed.error, 422)
  }

  const linkedDealId = (project as { deal_id?: string | null }).deal_id
  const persistedSnapshot = await finalizeRfpAnalysis(supabase, {
    projectId,
    organizationId: orgId,
    dealId: linkedDealId,
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

  if (linkedDealId) {
    await syncRfpDeadlinesFromTimeline(supabase, {
      dealId: linkedDealId,
      organizationId: orgId,
      timelineItems: analyzed.snapshot.timelineItems ?? [],
    })
  }

  return NextResponse.json({
    success: true,
    projectId,
    source: 'api',
    extractionUsedOcr,
  })
}
