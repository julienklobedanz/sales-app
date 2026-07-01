import { NextRequest, NextResponse } from 'next/server'

import { extractPlainTextFromFile } from '@/lib/extract-document-plain-text'
import { extractRequirementsFromRfpText } from '@/lib/rfp-requirements'
import { buildRfpCoverageReport } from '@/lib/rfp-coverage'
import { judgeRfpRelevance } from '@/lib/rfp-relevance'
import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Smart Match / RFP (Stufe D) — upload-first, OHNE Deal-Zwang und ohne Persistenz.
 * Datei → Klartext → Anforderungen (LLM) → je Anforderung `match_references`
 * (org-/rollensicher) → Coverage. Wiederverwendung der bestehenden Bausteine;
 * anders als `/api/rfp/analyze` (deal-desk-gekoppelt) wird hier nichts gespeichert.
 */
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
      { success: false, error: 'Keine Organisation zugeordnet.' },
      { status: 403 }
    )
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'RFP-Analyse ist deaktiviert: OPENAI_API_KEY fehlt.' },
      { status: 501 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ success: false, error: 'Keine gültige Datei.' }, { status: 400 })
  }

  const plain = await extractPlainTextFromFile(file, { maxChars: 120_000 })
  if (!plain.ok) {
    return NextResponse.json({ success: false, error: plain.error }, { status: 400 })
  }

  const extracted = await extractRequirementsFromRfpText(apiKey, plain.text)
  if ('error' in extracted) {
    return NextResponse.json({ success: false, error: extracted.error }, { status: 422 })
  }
  if (!extracted.requirements.length) {
    return NextResponse.json(
      { success: false, error: 'Keine Anforderungen im Dokument erkannt.' },
      { status: 422 }
    )
  }

  const coverage = await buildRfpCoverageReport(supabase, {
    apiKey,
    organizationId: visibility.organizationId,
    salesVisibleOnly: visibility.salesVisibleOnly,
    deal: null,
    requirements: extracted.requirements,
  })

  // Ehrlichkeitsschicht: LLM beurteilt echte Abdeckung je Anforderung (nicht nur Cosinus).
  const verdicts = await judgeRfpRelevance(
    apiKey,
    coverage.map((r) => ({
      requirementId: r.requirementId,
      requirementText: r.requirementText,
      candidates: r.matches.slice(0, 3).map((m) => ({
        id: m.id,
        title: m.title,
        summary: m.summary,
      })),
    }))
  )

  return NextResponse.json({
    success: true,
    fileName: file.name || 'Dokument',
    requirements: extracted.requirements,
    coverage,
    verdicts,
  })
}
