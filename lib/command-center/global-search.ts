import type { SupabaseClient } from '@supabase/supabase-js'

import {
  isMissingNdaFileStorageColumn,
  isMissingNdaTitleColumn,
} from '@/lib/accounts/nda-schema'
import { formatNdaExpiryDateDe, ndaDaysUntilExpiry } from '@/lib/accounts/nda-expiry'
import {
  complianceSearchTitle,
  formatComplianceValidUntilLine,
} from '@/lib/compliance/format'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { legacyAppRoleFrom } from '@/lib/roles/legacy-mapping'
import { parseProfileRoles } from '@/lib/roles/profile-roles'

export type CommandSearchResult =
  | { kind: 'account'; id: string; title: string; logoUrl: string | null }
  | { kind: 'partner'; id: string; title: string; logoUrl: string | null }
  | {
      kind: 'rfp'
      id: string
      title: string
      customerName: string | null
      statusLabel: string
    }
  | {
      kind: 'nda'
      id: string
      companyId: string
      title: string
      companyName: string
      statusLine: string
      hasFile: boolean
    }
  | {
      kind: 'reference'
      id: string
      title: string
      accountName: string | null
      industry: string | null
      /** Cosinus-Ähnlichkeit 0–1 (semantische Suche). */
      similarity?: number
    }
  | {
      kind: 'market_signal'
      id: string
      signalKind: 'exec' | 'news'
      title: string
      companyId: string
      companyName: string
    }
  | {
      kind: 'contact_external'
      id: string
      name: string
      role: string | null
      companyName: string
      companyId: string | null
    }
  | {
      kind: 'contact_internal'
      id: string
      name: string
      roleLabel: string
    }
  | {
      kind: 'certificate'
      id: string
      title: string
      documentType: string
      validUntilLine: string
      hasFile: boolean
    }
  | {
      kind: 'reference_document'
      id: string
      fileName: string
      referenceId: string
      referenceTitle: string
      companyName: string | null
      hasFile: boolean
    }

export type CommandSearchGroups = {
  accounts: CommandSearchResult[]
  partners: CommandSearchResult[]
  rfps: CommandSearchResult[]
  ndas: CommandSearchResult[]
  references: CommandSearchResult[]
  marketSignals: CommandSearchResult[]
  contacts: CommandSearchResult[]
  certificates: CommandSearchResult[]
}

export const COMMAND_SEARCH_GROUP_ORDER: (keyof CommandSearchGroups)[] = [
  'references',
  'accounts',
  'partners',
  'rfps',
  'ndas',
  'marketSignals',
  'contacts',
  'certificates',
]

export const COMMAND_SEARCH_GROUP_LABELS: Record<keyof CommandSearchGroups, string> = {
  accounts: 'Accounts',
  partners: 'Partner',
  rfps: 'Offene RFPs & Ausschreibungen',
  ndas: 'NDA & Vertragsdokumente',
  references: 'Referenzen (Case Studies)',
  marketSignals: 'Marktsignale',
  contacts: 'Ansprechpartner',
  certificates: 'Zertifikate & Security',
}

export function sanitizeIlikeUserInput(q: string): string {
  return q.trim().replace(/[%_\\]/g, '')
}

export function buildIlikeOrFilter(columns: string[], raw: string): string | null {
  const safe = sanitizeIlikeUserInput(raw)
  if (!safe) return null
  const pat = `%${safe}%`
  return columns.map((col) => `${col}.ilike.${pat}`).join(',')
}

export function companyFromJoin(raw: unknown): { name: string; logoUrl: string | null } | null {
  const c = Array.isArray(raw) ? raw[0] : raw
  if (!c || typeof c !== 'object') return null
  const name = String((c as { name?: string }).name ?? '').trim()
  if (!name) return null
  const logoUrl = (c as { logo_url?: string | null }).logo_url
  return { name, logoUrl: typeof logoUrl === 'string' ? logoUrl : null }
}

function rfpStatusLabel(status: string): string {
  if (status === 'processing') return 'In Bearbeitung'
  if (status === 'completed') return 'Abgeschlossen'
  if (status === 'failed') return 'Fehlgeschlagen'
  return 'Ausstehend'
}

function ndaStatusLine(status: string, validUntil: string | null): string {
  const s = String(status ?? '').toLowerCase()
  if (s === 'expired') return 'Abgelaufen'
  if (s === 'pending') return 'Ausstehend'
  if (!validUntil) return 'Aktiv (unbefristet)'
  const days = ndaDaysUntilExpiry(validUntil)
  if (days < 0) return `Abgelaufen (seit ${formatNdaExpiryDateDe(validUntil)})`
  return `Aktiv (bis ${formatNdaExpiryDateDe(validUntil)})`
}

function internalRoleLabel(role: string | null | undefined): string {
  const r = String(role ?? '').toLowerCase()
  if (r === 'admin') return 'Admin'
  if (r === 'account_manager') return 'Account Team'
  if (r === 'sales') return 'Sales'
  return 'Kollege'
}

export function formatReferenceListLabel(
  title: string,
  accountName: string | null | undefined
): string {
  const acc = accountName?.trim()
  if (acc) return `${title} — ${acc}`
  return `${title} (${COPY.commandPalette.referenceNoAccountLabel})`
}

/** Legacy flache Trefferliste (Command Palette). */
export type GlobalSearchResult =
  | { kind: 'reference'; id: string; title: string; accountName: string | null }
  | { kind: 'account'; id: string; title: string }
  | { kind: 'deal'; id: string; title: string }

/** Legacy flache Navigation (Command Palette, Recents). */
export function hrefForGlobalSearchResult(result: {
  kind: 'reference' | 'account' | 'deal'
  id: string
}): string {
  if (result.kind === 'account') return ROUTES.accountsDetail(result.id)
  if (result.kind === 'deal') return ROUTES.deals.detail(result.id)
  return ROUTES.references.detail(result.id)
}

export function emptyCommandSearchGroups(): CommandSearchGroups {
  return {
    accounts: [],
    partners: [],
    rfps: [],
    ndas: [],
    references: [],
    marketSignals: [],
    contacts: [],
    certificates: [],
  }
}

export function hasAnyCommandSearchHit(groups: CommandSearchGroups): boolean {
  return COMMAND_SEARCH_GROUP_ORDER.some((key) => groups[key].length > 0)
}

/** Accounts/Partner-Gruppe: keine Doppelten (gleiche ID oder gleicher Name). */
export function dedupeCompanySearchResults<
  T extends { id: string; title: string },
>(items: T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item)
  }
  const byName = new Map<string, T>()
  for (const item of byId.values()) {
    const key = item.title.trim().toLowerCase()
    if (!key) {
      byName.set(item.id, item)
      continue
    }
    if (!byName.has(key)) byName.set(key, item)
  }
  return [...byName.values()]
}

/** @deprecated Prefer dedupeCompanySearchResults */
export function dedupeAccountSearchResults(
  items: Extract<CommandSearchResult, { kind: 'account' }>[]
): Extract<CommandSearchResult, { kind: 'account' }>[] {
  return dedupeCompanySearchResults(items)
}

export type SearchCommandCenterOptions = {
  /** Semantische Referenz-Treffer; wenn gesetzt, entfällt ILIKE auf references. */
  referenceHits?: Extract<CommandSearchResult, { kind: 'reference' }>[]
}

export async function searchCommandCenter(
  supabase: SupabaseClient,
  rawQuery: string,
  options?: SearchCommandCenterOptions
): Promise<CommandSearchGroups> {
  const q = rawQuery.trim()
  if (!q) return emptyCommandSearchGroups()

  const likePat = `%${sanitizeIlikeUserInput(q)}%`
  if (!sanitizeIlikeUserInput(q)) return emptyCommandSearchGroups()

  const useSemanticReferences = options?.referenceHits !== undefined
  const refOr = useSemanticReferences ? null : buildIlikeOrFilter(['title', 'summary', 'industry'], q)
  const deskOr = buildIlikeOrFilter(['project_name', 'customer_name'], q)
  const ndaOr = buildIlikeOrFilter(['title', 'notes'], q)
  const contactOr = buildIlikeOrFilter(['first_name', 'last_name', 'role'], q)
  const certOr = buildIlikeOrFilter(['title', 'document_type'], q)

  const accountsRes = await fetchAccountSearchRows(supabase, likePat)

  const [
    refsRes,
    deskRes,
    ndaRes,
    execRes,
    newsRes,
    contactsRes,
    profilesRes,
    certsRes,
  ] = await Promise.all([
    refOr
      ? supabase
          .from('references')
          .select('id,title,industry,companies(name)')
          .or(refOr)
          .limit(6)
      : supabase.from('references').select('id,title,industry,companies(name)').limit(0),
    deskOr
      ? supabase
          .from('deal_desk_projects')
          .select('id,project_name,customer_name,analysis_status')
          .or(deskOr)
          .limit(6)
      : supabase.from('deal_desk_projects').select('id,project_name,customer_name,analysis_status').limit(0),
    fetchNdaSearchRows(supabase, ndaOr, likePat),
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
    contactOr
      ? supabase
          .from('contact_persons')
          .select('id,first_name,last_name,role,company_id,companies(name)')
          .or(contactOr)
          .limit(8)
      : supabase.from('contact_persons').select('id,first_name,last_name,role,company_id,companies(name)').limit(0),
    supabase.from('profiles').select('id,full_name,system_role,function_role').ilike('full_name', likePat).limit(5),
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
  ])

  const groups = emptyCommandSearchGroups()

  const accountCandidates: Extract<CommandSearchResult, { kind: 'account' }>[] = []
  const partnerCandidates: Extract<CommandSearchResult, { kind: 'partner' }>[] = []
  for (const row of accountsRes.data ?? []) {
    const entityKind = String((row as { entity_kind?: string }).entity_kind ?? 'account')
    const base = {
      id: String(row.id),
      title: String(row.name ?? ''),
      logoUrl: (row.logo_url as string | null) ?? null,
    }
    if (entityKind === 'partner') {
      partnerCandidates.push({ kind: 'partner', ...base })
    } else {
      accountCandidates.push({ kind: 'account', ...base })
    }
  }
  groups.accounts.push(...dedupeCompanySearchResults(accountCandidates))
  groups.partners.push(...dedupeCompanySearchResults(partnerCandidates))

  for (const row of deskRes.data ?? []) {
    const title = String(row.project_name ?? 'Projekt')
    groups.rfps.push({
      kind: 'rfp',
      id: String(row.id),
      title,
      customerName: (row.customer_name as string | null) ?? null,
      statusLabel: rfpStatusLabel(String(row.analysis_status ?? 'pending')),
    })
  }

  for (const row of ndaRes) {
    const co = companyFromJoin(row.companies)
    const docTitle = String(row.title ?? '').trim() || 'NDA'
    groups.ndas.push({
      kind: 'nda',
      id: String(row.id),
      companyId: String(row.company_id),
      title: docTitle,
      companyName: co?.name ?? 'Account',
      statusLine: ndaStatusLine(String(row.status), row.valid_until as string | null),
      hasFile: Boolean(row.file_storage_path),
    })
  }

  if (useSemanticReferences) {
    groups.references.push(...(options!.referenceHits ?? []))
  } else {
    for (const row of refsRes.data ?? []) {
      const co = companyFromJoin(row.companies)
      groups.references.push({
        kind: 'reference',
        id: String(row.id),
        title: String(row.title ?? ''),
        accountName: co?.name ?? null,
        industry: (row.industry as string | null) ?? null,
      })
    }
  }

  for (const row of execRes.data ?? []) {
    const co = companyFromJoin(row.companies)
    const person = String(row.person_name ?? '').trim()
    const summary = String(row.change_summary ?? '').trim()
    groups.marketSignals.push({
      kind: 'market_signal',
      id: String(row.id),
      signalKind: 'exec',
      title: person ? `${person}${summary ? ` — ${summary.slice(0, 80)}` : ''}` : summary.slice(0, 120),
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

  for (const row of contactsRes.data ?? []) {
    const co = companyFromJoin(row.companies)
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Kontakt'
    groups.contacts.push({
      kind: 'contact_external',
      id: String(row.id),
      name,
      role: (row.role as string | null) ?? null,
      companyName: co?.name ?? '—',
      companyId: row.company_id ? String(row.company_id) : null,
    })
  }

  for (const row of profilesRes.data ?? []) {
    const name = String(row.full_name ?? '').trim()
    if (!name) continue
    const { systemRole, functionRole } = parseProfileRoles(row)
    groups.contacts.push({
      kind: 'contact_internal',
      id: String(row.id),
      name,
      roleLabel: internalRoleLabel(legacyAppRoleFrom(systemRole, functionRole)),
    })
  }

  if (!certsRes.error) {
    for (const row of certsRes.data ?? []) {
      const docType = String(row.document_type ?? '')
      const title = complianceSearchTitle({
        title: String(row.title ?? ''),
        document_type: docType,
      })
      groups.certificates.push({
        kind: 'certificate',
        id: String(row.id),
        title,
        documentType: docType,
        validUntilLine: formatComplianceValidUntilLine((row.valid_until as string | null) ?? null),
        hasFile: Boolean(row.file_storage_path),
      })
    }
  } else {
    const msg = certsRes.error.message ?? ''
    const missingTable =
      msg.includes('organization_compliance_documents') || msg.includes('does not exist')
    if (!missingTable) {
      console.warn('[searchCommandCenter] compliance documents:', msg)
    }
  }

  return groups
}

async function fetchAccountSearchRows(supabase: SupabaseClient, likePat: string) {
  const withKind = await supabase
    .from('companies')
    .select('id,name,logo_url,entity_kind')
    .in('entity_kind', ['account', 'partner'])
    .ilike('name', likePat)
    .limit(10)

  if (!withKind.error || !(withKind.error.message ?? '').includes('entity_kind')) {
    return withKind
  }

  return supabase.from('companies').select('id,name,logo_url').ilike('name', likePat).limit(10)
}

type NdaSearchRow = {
  id: string
  company_id: string
  title?: string | null
  status: string
  valid_until: string | null
  file_storage_path: string | null
  companies: unknown
}

export async function fetchNdaSearchRows(
  supabase: SupabaseClient,
  ndaOr: string | null,
  likePat: string
): Promise<NdaSearchRow[]> {
  const baseSelect =
    'id,company_id,status,valid_until,file_storage_path,companies(name,logo_url)'
  const withTitle =
    'id,company_id,title,status,valid_until,file_storage_path,companies(name,logo_url)'
  const legacyBase = 'id,company_id,status,valid_until,companies(name,logo_url)'
  const legacyWithTitle =
    'id,company_id,title,status,valid_until,companies(name,logo_url)'

  const run = (select: string, filter: { or?: string; ilikeNotes?: boolean }) => {
    let q = supabase.from('nda_agreements').select(select).limit(6)
    if (filter.or) q = q.or(filter.or)
    else if (filter.ilikeNotes) q = q.ilike('notes', likePat)
    return q
  }

  let res = ndaOr
    ? await run(withTitle, { or: ndaOr })
    : await run(withTitle, { ilikeNotes: true })

  if (res.error && isMissingNdaTitleColumn(res.error.message)) {
    if (ndaOr) {
      const notesOnly = ndaOr.replace(/title\.ilike/g, 'notes.ilike')
      res = await run(baseSelect, { or: notesOnly })
    } else {
      res = await run(baseSelect, { ilikeNotes: true })
    }
  }

  if (res.error && isMissingNdaFileStorageColumn(res.error.message)) {
    if (ndaOr) {
      const notesOnly = ndaOr.replace(/title\.ilike/g, 'notes.ilike')
      res = await run(legacyWithTitle, { or: notesOnly })
      if (res.error && isMissingNdaTitleColumn(res.error.message)) {
        res = await run(legacyBase, { or: notesOnly })
      }
    } else {
      res = await run(legacyWithTitle, { ilikeNotes: true })
      if (res.error && isMissingNdaTitleColumn(res.error.message)) {
        res = await run(legacyBase, { ilikeNotes: true })
      }
    }
  }

  if (res.error) return []

  const rawRows = Array.isArray(res.data) ? res.data : []
  return rawRows.map((row) => {
    const typed = row as unknown as NdaSearchRow
    return {
      ...typed,
      file_storage_path: typed.file_storage_path ?? null,
    }
  })
}

/** Legacy flache Liste für Command Palette (cmdk). */
export async function searchGlobalEntities(
  supabase: SupabaseClient,
  rawQuery: string
): Promise<GlobalSearchResult[]> {
  const groups = await searchCommandCenter(supabase, rawQuery)
  const dealsRes = await supabase
    .from('deals')
    .select('id,title')
    .ilike('title', `%${sanitizeIlikeUserInput(rawQuery)}%`)
    .limit(8)

  const flat: GlobalSearchResult[] = []

  for (const r of groups.references) {
    if (r.kind !== 'reference') continue
    flat.push({
      kind: 'reference',
      id: r.id,
      title: r.title,
      accountName: r.accountName,
    })
  }
  for (const a of groups.accounts) {
    if (a.kind !== 'account') continue
    flat.push({ kind: 'account', id: a.id, title: a.title })
  }
  for (const p of groups.partners) {
    if (p.kind !== 'partner') continue
    flat.push({ kind: 'account', id: p.id, title: p.title })
  }
  for (const d of dealsRes.data ?? []) {
    flat.push({ kind: 'deal', id: String(d.id), title: String(d.title) })
  }
  return flat
}
