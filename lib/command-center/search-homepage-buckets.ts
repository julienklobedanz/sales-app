import type { SupabaseClient } from '@supabase/supabase-js'

import { formatNdaExpiryDateDe, ndaDaysUntilExpiry } from '@/lib/accounts/nda-expiry'
import {
  complianceSearchTitle,
  formatComplianceValidUntilLine,
} from '@/lib/compliance/format'
import {
  buildIlikeOrFilter,
  fetchNdaSearchRows,
  sanitizeIlikeUserInput,
  type CommandSearchResult,
} from '@/lib/command-center/global-search'
import { companyFromJoin } from '@/lib/accounts/company-from-join'
import {
  emptyHomepageSearchGroups,
  type HomepageSearchGroups,
} from '@/lib/command-center/homepage-universal-types'

function ndaStatusLine(status: string, validUntil: string | null): string {
  const s = String(status ?? '').toLowerCase()
  if (s === 'expired') return 'Abgelaufen'
  if (s === 'pending') return 'Ausstehend'
  if (!validUntil) return 'Aktiv (unbefristet)'
  const days = ndaDaysUntilExpiry(validUntil)
  if (days < 0) return `Abgelaufen (seit ${formatNdaExpiryDateDe(validUntil)})`
  return `Aktiv (bis ${formatNdaExpiryDateDe(validUntil)})`
}

function referenceFromJoin(
  raw: unknown,
): { title: string; companyName: string | null } | null {
  const ref = Array.isArray(raw) ? raw[0] : raw
  if (!ref || typeof ref !== 'object') return null
  const title = String((ref as { title?: string }).title ?? '').trim()
  if (!title) return null
  const co = companyFromJoin((ref as { companies?: unknown }).companies)
  return { title, companyName: co?.name ?? null }
}

export function mapReferenceAssetRow(row: {
  id: string
  file_name?: string | null
  file_path?: string | null
  reference_id: string
  references?: unknown
}): Extract<CommandSearchResult, { kind: 'reference_document' }> {
  const ref = referenceFromJoin(row.references)
  const fileName = String(row.file_name ?? '').trim() || 'Dokument'
  return {
    kind: 'reference_document',
    id: String(row.id),
    fileName,
    referenceId: String(row.reference_id),
    referenceTitle: ref?.title ?? 'Referenz',
    companyName: ref?.companyName ?? null,
    hasFile: Boolean(row.file_path?.trim()),
  }
}

export async function searchHomepageBuckets(
  supabase: SupabaseClient,
  rawQuery: string,
): Promise<HomepageSearchGroups> {
  const q = rawQuery.trim()
  if (!q) return emptyHomepageSearchGroups()

  const likePat = `%${sanitizeIlikeUserInput(q)}%`
  if (!sanitizeIlikeUserInput(q)) return emptyHomepageSearchGroups()

  const ndaOr = buildIlikeOrFilter(['title', 'notes'], q)
  const certOr = buildIlikeOrFilter(['title', 'document_type'], q)

  const [execRes, newsRes, ndaRows, certsRes, assetsRes] = await Promise.all([
    supabase
      .from('market_signal_executive_events')
      .select('id,person_name,change_summary,company_id,companies(name)')
      .or(`person_name.ilike.${likePat},change_summary.ilike.${likePat}`)
      .limit(5),
    supabase
      .from('market_signal_account_news')
      .select('id,body,company_id,companies(name)')
      .ilike('body', likePat)
      .limit(5),
    fetchNdaSearchRows(supabase, ndaOr, likePat),
    certOr
      ? supabase
          .from('organization_compliance_documents')
          .select('id,title,document_type,valid_until,file_storage_path')
          .eq('is_current', true)
          .or(certOr)
          .limit(6)
      : supabase
          .from('organization_compliance_documents')
          .select('id,title,document_type,valid_until,file_storage_path')
          .eq('is_current', true)
          .limit(0),
    supabase
      .from('reference_assets')
      .select('id,file_name,file_path,reference_id,references(title,companies(name))')
      .ilike('file_name', likePat)
      .limit(6),
  ])

  const groups = emptyHomepageSearchGroups()

  for (const row of execRes.data ?? []) {
    const co = companyFromJoin(row.companies)
    const person = String(row.person_name ?? '').trim()
    const summary = String(row.change_summary ?? '').trim()
    groups.marketSignals.push({
      kind: 'market_signal',
      id: String(row.id),
      signalKind: 'exec',
      title: person
        ? `${person}${summary ? ` — ${summary.slice(0, 80)}` : ''}`
        : summary.slice(0, 120),
      companyId: String(row.company_id),
      companyName: co?.name ?? 'Account',
    })
  }

  for (const row of newsRes.data ?? []) {
    const co = companyFromJoin(row.companies)
    const body = String(row.body ?? '').trim()
    groups.marketSignals.push({
      kind: 'market_signal',
      id: String(row.id),
      signalKind: 'news',
      title: body.slice(0, 120) || `News bei ${co?.name ?? 'Account'}`,
      companyId: String(row.company_id),
      companyName: co?.name ?? 'Account',
    })
  }

  if (!certsRes.error) {
    for (const row of certsRes.data ?? []) {
      const docType = String(row.document_type ?? '')
      groups.certificates.push({
        kind: 'certificate',
        id: String(row.id),
        title: complianceSearchTitle({
          title: String(row.title ?? ''),
          document_type: docType,
        }),
        documentType: docType,
        validUntilLine: formatComplianceValidUntilLine(
          (row.valid_until as string | null) ?? null,
        ),
        hasFile: Boolean(row.file_storage_path),
      })
    }
  }

  for (const row of ndaRows) {
    const co = companyFromJoin(row.companies)
    const docTitle = String(row.title ?? '').trim() || 'NDA'
    groups.documents.push({
      kind: 'nda',
      id: String(row.id),
      companyId: String(row.company_id),
      title: docTitle,
      companyName: co?.name ?? 'Account',
      statusLine: ndaStatusLine(String(row.status), row.valid_until),
      hasFile: Boolean(row.file_storage_path),
    })
  }

  for (const row of assetsRes.data ?? []) {
    groups.documents.push(
      mapReferenceAssetRow({
        id: String(row.id),
        file_name: row.file_name as string | null,
        file_path: row.file_path as string | null,
        reference_id: String(row.reference_id),
        references: row.references,
      }),
    )
  }

  return groups
}
