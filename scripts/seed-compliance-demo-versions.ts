/**
 * Legt eine archivierte ISO-27001-Demo-Version für Tests der Versionshistorie an.
 *
 * Voraussetzungen:
 * - SUPABASE_URL (oder NEXT_PUBLIC_SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 * - ORGANIZATION_ID — Ziel-Organisation (sonst erste Organisation)
 *
 * Ausführung:
 *   npx tsx --env-file=.env.local scripts/seed-compliance-demo-versions.ts
 *
 * Demo-PDFs liegen unter public/demo/compliance/ und können auch manuell
 * über „Zertifikat hochladen“ getestet werden.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROUTES } from '../lib/routes'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ORGANIZATION_ID = process.env.ORGANIZATION_ID?.trim()

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden benötigt.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const BUCKET = 'compliance-documents'
const DOC_TYPE = 'iso_27001'

async function resolveOrgId(): Promise<string> {
  if (ORGANIZATION_ID) return ORGANIZATION_ID
  const { data, error } = await supabase.from('organizations').select('id').limit(1).maybeSingle()
  if (error || !data?.id) throw new Error('Keine Organisation gefunden — ORGANIZATION_ID setzen.')
  return String(data.id)
}

async function uploadPdf(orgId: string, docId: string, fileName: string, bytes: Buffer) {
  const path = `${orgId}/${docId}/${fileName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) throw new Error(`Upload ${fileName}: ${error.message}`)
  return path
}

async function main() {
  const orgId = await resolveOrgId()
  console.log(`Organisation: ${orgId}`)

  const archivePdf = readFileSync(
    join(process.cwd(), 'public/demo/compliance/iso27001-archiv-2024.pdf')
  )
  const currentPdf = readFileSync(
    join(process.cwd(), 'public/demo/compliance/iso27001-aktuell-2026.pdf')
  )

  const { data: existing } = await supabase
    .from('organization_compliance_documents')
    .select('id,title,is_current,valid_until')
    .eq('organization_id', orgId)
    .eq('document_type', DOC_TYPE)
    .order('is_current', { ascending: false })

  const rows = existing ?? []
  const current = rows.find((r) => r.is_current) ?? null
  const hasArchive = rows.some((r) => !r.is_current)

  if (hasArchive) {
    console.log('Archiv-Version existiert bereits — überspringe Anlage.')
    return
  }

  const { data: inserted, error: insertError } = await supabase
    .from('organization_compliance_documents')
    .insert({
      organization_id: orgId,
      document_type: DOC_TYPE,
      title: 'ISO 27001 — Archiv 2024',
      valid_until: '2024-12-31',
      is_current: false,
      uploaded_by: null,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? 'Archiv-Insert fehlgeschlagen')
  }

  const archiveId = String(inserted.id)
  const archivePath = await uploadPdf(
    orgId,
    archiveId,
    'iso27001-archiv-2024.pdf',
    archivePdf
  )

  const { error: archiveUpdateError } = await supabase
    .from('organization_compliance_documents')
    .update({
      file_storage_path: archivePath,
      file_name: 'iso27001-archiv-2024.pdf',
    })
    .eq('id', archiveId)

  if (archiveUpdateError) throw new Error(archiveUpdateError.message)

  if (!current) {
    const { data: currentInserted, error: currentInsertError } = await supabase
      .from('organization_compliance_documents')
      .insert({
        organization_id: orgId,
        document_type: DOC_TYPE,
        title: 'ISO27001',
        valid_until: '2027-12-12',
        is_current: true,
        uploaded_by: null,
      })
      .select('id')
      .single()

    if (currentInsertError || !currentInserted) {
      throw new Error(currentInsertError?.message ?? 'Aktuelle Version Insert fehlgeschlagen')
    }

    const currentId = String(currentInserted.id)
    const currentPath = await uploadPdf(
      orgId,
      currentId,
      'iso27001-aktuell-2026.pdf',
      currentPdf
    )

    const { error: currentUpdateError } = await supabase
      .from('organization_compliance_documents')
      .update({
        file_storage_path: currentPath,
        file_name: 'iso27001-aktuell-2026.pdf',
      })
      .eq('id', currentId)

    if (currentUpdateError) throw new Error(currentUpdateError.message)
    console.log('Aktuelle Demo-Version angelegt.')
  } else if (!current.valid_until) {
    console.log('Bestehende aktuelle Version bleibt unverändert (ohne PDF-Update).')
  }

  console.log('Archiv-Version ISO 27001 (abgelaufen 31.12.2024) angelegt.')
  console.log(`Öffne ${ROUTES.evidence.root} → Zertifikate und klicke auf eine Zeile für die Versionshistorie.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
