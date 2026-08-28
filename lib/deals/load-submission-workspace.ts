import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { loadDealProofSummary } from '@/lib/deals/load-deal-proof-summary'
import {
  countSubmissionItems,
  formatSubmissionItemCounts,
  isVisibleSubmissionItem,
  shouldAutoAssignUnassignedSubmissionItems,
  type SubmissionItemReview,
  type SubmissionItemState,
} from '@/lib/deals/submission-item-display'
import { assignSubmissionItemsToDeadline } from '@/lib/deals/submission-item-mutations'
import type { SubmissionWorkspaceOwner } from '@/lib/deals/submission-workspace-href'

type Client = SupabaseClient<Database>

export type SubmissionItemView = {
  id: string
  identifier: string | null
  title: string
  state: SubmissionItemState
  source: 'extracted' | 'manual'
  documentId: string | null
  sourceDocumentId: string | null
  proofFileName: string | null
  confidence: 'high' | 'low'
  review: SubmissionItemReview | null
  deadlineId: string | null
}

type SubmissionWorkspaceDeadlineView = {
  id: string
  label: string
  countLabel: string
  items: SubmissionItemView[]
}

export type SubmissionWorkspaceLotProof = {
  id: string
  title: string
  count: number
}

export type SubmissionWorkspaceData = {
  ownerTitle: string
  markedDeadlines: SubmissionWorkspaceDeadlineView[]
  selectedDeadline: SubmissionWorkspaceDeadlineView | null
  assignedItems: SubmissionItemView[]
  unassignedItems: SubmissionItemView[]
  ownerDocuments: Array<{ id: string; fileName: string }>
  lotProofs: SubmissionWorkspaceLotProof[]
}

const ITEM_SELECT =
  'id, identifier, title, state, source, document_id, source_document_id, confidence, review, deadline_id, sort_order'

type ItemRow = {
  id: string
  identifier: string | null
  title: string
  state: string
  source: string
  document_id: string | null
  source_document_id: string | null
  confidence: string
  review: string | null
  deadline_id: string | null
  sort_order: number
}

function asItem(row: {
  id: string
  identifier: string | null
  title: string
  state: string
  source: string
  document_id: string | null
  source_document_id: string | null
  confidence: string
  review: string | null
  deadline_id: string | null
  proofFileName?: string | null
}): SubmissionItemView {
  return {
    id: row.id,
    identifier: row.identifier,
    title: row.title,
    state: row.state as SubmissionItemState,
    source: row.source === 'manual' ? 'manual' : 'extracted',
    documentId: row.document_id,
    sourceDocumentId: row.source_document_id,
    proofFileName: row.proofFileName ?? null,
    confidence: row.confidence === 'low' ? 'low' : 'high',
    review: row.review === 'confirmed' || row.review === 'dismissed' ? row.review : null,
    deadlineId: row.deadline_id,
  }
}

async function ownerDocumentIds(
  supabase: Client,
  args: { organizationId: string; owner: SubmissionWorkspaceOwner },
): Promise<{ docIds: string[]; lotIds: string[]; lotTitles: Record<string, string> }> {
  if (args.owner.kind === 'deal') {
    const { data } = await supabase
      .from('deal_documents')
      .select('id')
      .eq('organization_id', args.organizationId)
      .eq('deal_id', args.owner.id)
    return {
      docIds: (data ?? []).map((row) => row.id),
      lotIds: [args.owner.id],
      lotTitles: {},
    }
  }

  const { data: lots } = await supabase
    .from('deals')
    .select('id, title')
    .eq('organization_id', args.organizationId)
    .eq('tender_id', args.owner.id)
  const lotIds = (lots ?? []).map((row) => row.id)
  const lotTitles = Object.fromEntries((lots ?? []).map((row) => [row.id, row.title]))

  const { data: tenderDocs } = await supabase
    .from('deal_documents')
    .select('id')
    .eq('organization_id', args.organizationId)
    .eq('tender_id', args.owner.id)
  const { data: lotDocs } =
    lotIds.length > 0
      ? await supabase
          .from('deal_documents')
          .select('id')
          .eq('organization_id', args.organizationId)
          .in('deal_id', lotIds)
      : { data: [] }

  return {
    docIds: [...(tenderDocs ?? []), ...(lotDocs ?? [])].map((row) => row.id),
    lotIds,
    lotTitles,
  }
}

export async function loadSubmissionWorkspace(
  supabase: Client,
  args: {
    organizationId: string
    owner: SubmissionWorkspaceOwner
    selectedDeadlineId: string | null
    canMutate: boolean
  },
): Promise<SubmissionWorkspaceData | null> {
  const ownerColumn = args.owner.kind === 'tender' ? 'tender_id' : 'deal_id'
  const ownerTitleQuery =
    args.owner.kind === 'tender'
      ? await supabase
          .from('tenders')
          .select('title')
          .eq('id', args.owner.id)
          .eq('organization_id', args.organizationId)
          .maybeSingle()
      : await supabase
          .from('deals')
          .select('title')
          .eq('id', args.owner.id)
          .eq('organization_id', args.organizationId)
          .maybeSingle()
  if (!ownerTitleQuery.data) return null

  const { data: deadlineRows } = await supabase
    .from('deal_deadlines')
    .select('id, label, is_submission_target')
    .eq('organization_id', args.organizationId)
    .eq(ownerColumn, args.owner.id)
    .is('suppressed_at', null)

  const marked = (deadlineRows ?? []).filter((row) => row.is_submission_target)
  const ownerDeadlineIds = (deadlineRows ?? []).map((row) => row.id)
  const { docIds, lotIds, lotTitles } = await ownerDocumentIds(supabase, args)

  const deadlineItems =
    ownerDeadlineIds.length > 0
      ? await supabase
          .from('submission_items')
          .select(ITEM_SELECT)
          .eq('organization_id', args.organizationId)
          .in('deadline_id', ownerDeadlineIds)
          .order('sort_order', { ascending: true })
      : { data: [] as ItemRow[] }
  const unassignedRows =
    docIds.length > 0
      ? await supabase
          .from('submission_items')
          .select(ITEM_SELECT)
          .eq('organization_id', args.organizationId)
          .is('deadline_id', null)
          .in('source_document_id', docIds)
          .order('sort_order', { ascending: true })
      : { data: [] as ItemRow[] }

  const itemRows = [
    ...(deadlineItems.data ?? []),
    ...(unassignedRows.data ?? []),
  ] as ItemRow[]
  const seen = new Set<string>()
  const uniqueRows = itemRows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
  const proofIds = [
    ...new Set(
      uniqueRows.map((row) => row.document_id).filter((id): id is string => Boolean(id)),
    ),
  ]
  const { data: proofDocs } =
    proofIds.length > 0
      ? await supabase.from('deal_documents').select('id, file_name').in('id', proofIds)
      : { data: [] }
  const proofName = new Map((proofDocs ?? []).map((row) => [row.id, row.file_name]))

  const items = uniqueRows.map((row) =>
    asItem({
      ...row,
      proofFileName: row.document_id ? (proofName.get(row.document_id) ?? null) : null,
    }),
  )

  if (
    shouldAutoAssignUnassignedSubmissionItems({
      canMutate: args.canMutate,
      markedCount: marked.length,
    })
  ) {
    const unassignedIds = items
      .filter((item) => item.deadlineId == null && isVisibleSubmissionItem(item))
      .map((item) => item.id)
    if (unassignedIds.length > 0) {
      await assignSubmissionItemsToDeadline(supabase, {
        organizationId: args.organizationId,
        owner: args.owner,
        itemIds: unassignedIds,
        deadlineId: marked[0]!.id,
      })
      return loadSubmissionWorkspace(supabase, {
        ...args,
        canMutate: false,
      })
    }
  }

  const { data: ownerDocs } =
    docIds.length > 0
      ? await supabase
          .from('deal_documents')
          .select('id, file_name')
          .in('id', docIds)
          .order('file_name')
      : { data: [] }

  const proofSummary = await loadDealProofSummary(supabase, lotIds)
  const lotProofs: SubmissionWorkspaceLotProof[] = lotIds.map((id) => ({
    id,
    title: lotTitles[id] ?? '',
    count: proofSummary[id]?.count ?? 0,
  }))
  if (args.owner.kind === 'deal' && lotProofs.length === 1) {
    lotProofs[0]!.title = ownerTitleQuery.data.title
  }

  const markedViews: SubmissionWorkspaceDeadlineView[] = marked.map((row) => {
    const assigned = items.filter(
      (item) => item.deadlineId === row.id && isVisibleSubmissionItem(item),
    )
    return {
      id: row.id,
      label: row.label,
      countLabel: formatSubmissionItemCounts(countSubmissionItems(assigned)),
      items: assigned,
    }
  })
  const selected =
    markedViews.find((row) => row.id === args.selectedDeadlineId) ??
    markedViews[0] ??
    null

  return {
    ownerTitle: ownerTitleQuery.data.title,
    markedDeadlines: markedViews,
    selectedDeadline: selected,
    assignedItems: selected?.items ?? [],
    unassignedItems: items.filter(
      (item) => item.deadlineId == null && isVisibleSubmissionItem(item),
    ),
    ownerDocuments: (ownerDocs ?? []).map((row) => ({
      id: row.id,
      fileName: row.file_name,
    })),
    lotProofs,
  }
}
