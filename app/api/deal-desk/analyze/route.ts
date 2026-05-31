import { NextRequest, NextResponse } from 'next/server'

import { analyzeDealDeskRisks } from '@/lib/deal-desk/deal-desk-risk-analysis'
import { enrichRedFlagsWithDocuments } from '@/lib/deal-desk/red-flag-document-match'
import { extractExecutiveBriefingFromRfp } from '@/lib/deal-desk/executive-briefing-extract'
import { mapRfpAnalysisToDealDeskSnapshot } from '@/lib/deal-desk/map-rfp-to-desk'
import { defaultWorkspaceState } from '@/lib/deal-desk/workspace-state'
import { buildDemoDealDeskAnalysis } from '@/lib/deal-desk/mock-analysis'
import { extractRfpPlainTextFromFile } from '@/lib/extract-rfp-plain-text'
import { buildRfpCoverageReport } from '@/lib/rfp-coverage'
import { extractRequirementsFromRfpText } from '@/lib/rfp-requirements'
import { isOpenAiQuotaErrorMessage } from '@/lib/openai-api-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { extractTimelineFromRfpText } from '@/lib/rfp-timeline'

const OPENAI_QUOTA_MOCK_WARNING =
  'OpenAI-Kontingent erschöpft — Demo-Analyse wurde geladen. Bitte Guthaben unter platform.openai.com/account/billing prüfen.'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    return NextResponse.json(
      { success: false, error: 'Onboarding unvollständig — keine Organisation.' },
      { status: 403 }
    )
  }

  const orgId = profile.organization_id as string
  const salesVisibleOnly = (profile.role as string) === 'sales'
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
    .select('id, project_name, organization_id')
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
    const workspace = defaultWorkspaceState(mock.redFlags)
    await supabase
      .from('deal_desk_projects')
      .update({
        analysis_status: 'completed',
        analysis_snapshot: mock,
        analysis_source: 'mock',
        workspace_state: workspace,
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
    const mock = buildDemoDealDeskAnalysis(fileNames)
    const workspace = defaultWorkspaceState(mock.redFlags)
    await supabase
      .from('deal_desk_projects')
      .update({
        analysis_status: 'completed',
        analysis_snapshot: mock,
        analysis_source: 'mock',
        workspace_state: workspace,
        win_probability: mock.winProbability,
        customer_name: mock.customerName,
        error_message: null,
      })
      .eq('id', projectId)

    return NextResponse.json({
      success: true,
      projectId,
      source: 'mock',
      extractionUsedOcr,
    })
  }

  if (textParts.length === 0) {
    return fail(
      'Kein extrahierbarer Text — bitte PDF, Word (DOCX) oder Excel (XLS/XLSX) mit lesbarem Inhalt hochladen.',
      400,
      { isScanLikely: true }
    )
  }

  const mergedText = textParts.join('\n\n')

  const timelineRes = await extractTimelineFromRfpText(apiKey, mergedText)
  const timelineItems = 'error' in timelineRes ? [] : timelineRes.timelineItems
  if ('error' in timelineRes) {
    if (isQuotaError(timelineRes.error)) {
      return finishWithMockQuotaFallback()
    }
  }

  const extracted = await extractRequirementsFromRfpText(apiKey, mergedText)
  if ('error' in extracted) {
    if (isQuotaError(extracted.error)) {
      return finishWithMockQuotaFallback()
    }
    return fail(extracted.error, 422)
  }

  const coverage = await buildRfpCoverageReport(supabase, {
    apiKey,
    organizationId: orgId,
    salesVisibleOnly,
    deal: {
      title: projectName,
      industry: null,
      volume: null,
    },
    requirements: extracted.requirements,
  })

  const [riskResult, briefingResult] = await Promise.all([
    analyzeDealDeskRisks(apiKey, mergedText, projectName, fileNames),
    extractExecutiveBriefingFromRfp(apiKey, mergedText, projectName),
  ])

  if ('error' in riskResult) {
    if (isQuotaError(riskResult.error)) {
      return finishWithMockQuotaFallback()
    }
    return fail(riskResult.error, 422)
  }

  if ('error' in briefingResult) {
    if (isQuotaError(briefingResult.error)) {
      return finishWithMockQuotaFallback()
    }
    return fail(briefingResult.error, 422)
  }

  const { data: projectDocs } = await supabase
    .from('deal_desk_documents')
    .select('id, file_name, storage_path, mime_type')
    .eq('project_id', projectId)
    .eq('organization_id', orgId)

  const linkedRedFlags = enrichRedFlagsWithDocuments(
    riskResult.redFlags,
    (projectDocs ?? []).map((d) => ({
      id: d.id as string,
      file_name: d.file_name as string,
      storage_path: d.storage_path as string | null,
      mime_type: d.mime_type as string | null,
    }))
  )

  const snapshot = await mapRfpAnalysisToDealDeskSnapshot({
    apiKey,
    projectName,
    fileNames,
    requirements: extracted.requirements,
    coverage,
    risk: { ...riskResult, redFlags: linkedRedFlags },
    executiveBriefing: briefingResult,
    timelineItems,
    organizationId: orgId,
    supabase,
  })

  const workspace = defaultWorkspaceState(snapshot.redFlags)

  const { error: doneError } = await supabase
    .from('deal_desk_projects')
    .update({
      analysis_status: 'completed',
      analysis_snapshot: snapshot,
      analysis_source: 'api',
      workspace_state: workspace,
      win_probability: snapshot.winProbability,
      customer_name: snapshot.customerName,
      error_message: null,
    })
    .eq('id', projectId)

  if (doneError) {
    return fail(doneError.message)
  }

  return NextResponse.json({
    success: true,
    projectId,
    source: 'api',
    extractionUsedOcr,
  })
}
