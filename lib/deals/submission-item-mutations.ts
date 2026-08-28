import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import {
  cycleSubmissionItemStateFields,
  type SubmissionItemReview,
  type SubmissionItemState,
} from '@/lib/deals/submission-item-display'
import { buildManualSubmissionItemSourceKey } from '@/lib/deals/submission-item-source-key'
import type { SubmissionWorkspaceOwner } from '@/lib/deals/submission-workspace-href'

type Client = SupabaseClient<Database>

function ownerFilter(owner: SubmissionWorkspaceOwner): {
  column: 'tender_id' | 'deal_id'
  id: string
} {
  return owner.kind === 'tender'
    ? { column: 'tender_id', id: owner.id }
    : { column: 'deal_id', id: owner.id }
}

async function loadOwnedDeadline(
  supabase: Client,
  args: {
    organizationId: string
    owner: SubmissionWorkspaceOwner
    deadlineId: string
  },
): Promise<{ id: string } | { error: string }> {
  const filter = ownerFilter(args.owner)
  const { data, error } = await supabase
    .from('deal_deadlines')
    .select('id')
    .eq('id', args.deadlineId)
    .eq('organization_id', args.organizationId)
    .eq(filter.column, filter.id)
    .is('suppressed_at', null)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Abgabe nicht gefunden.' }
  return { id: data.id }
}

export async function setDeadlineSubmissionTarget(
  supabase: Client,
  args: {
    organizationId: string
    owner: SubmissionWorkspaceOwner
    deadlineId: string
    isSubmissionTarget: boolean
  },
): Promise<{ success: boolean; error?: string }> {
  const filter = ownerFilter(args.owner)
  const { error } = await supabase
    .from('deal_deadlines')
    .update({
      is_submission_target: args.isSubmissionTarget,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.deadlineId)
    .eq('organization_id', args.organizationId)
    .eq(filter.column, filter.id)
    .is('suppressed_at', null)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function cycleSubmissionItemState(
  supabase: Client,
  args: {
    organizationId: string
    itemId: string
    userId: string
  },
): Promise<{ success: boolean; error?: string }> {
  const { data, error: loadError } = await supabase
    .from('submission_items')
    .select('id, state')
    .eq('id', args.itemId)
    .eq('organization_id', args.organizationId)
    .maybeSingle()
  if (loadError) return { success: false, error: loadError.message }
  if (!data) return { success: false, error: 'Position nicht gefunden.' }

  const patch = cycleSubmissionItemStateFields(
    data.state as SubmissionItemState,
    args.userId,
    new Date().toISOString(),
  )
  const { error } = await supabase
    .from('submission_items')
    .update(patch)
    .eq('id', args.itemId)
    .eq('organization_id', args.organizationId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function setSubmissionItemReview(
  supabase: Client,
  args: {
    organizationId: string
    itemId: string
    userId: string
    review: SubmissionItemReview
  },
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('submission_items')
    .update({
      review: args.review,
      reviewed_at: new Date().toISOString(),
      reviewed_by: args.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.itemId)
    .eq('organization_id', args.organizationId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function setSubmissionItemDocument(
  supabase: Client,
  args: {
    organizationId: string
    itemId: string
    documentId: string
  },
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('submission_items')
    .update({
      document_id: args.documentId,
      state: 'provided',
      not_applicable_at: null,
      not_applicable_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.itemId)
    .eq('organization_id', args.organizationId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function insertManualSubmissionItem(
  supabase: Client,
  args: {
    organizationId: string
    owner: SubmissionWorkspaceOwner
    deadlineId: string
    identifier?: string | null
    title: string
  },
): Promise<{ success: boolean; error?: string }> {
  const title = args.title.trim()
  if (!title) return { success: false, error: 'Titel ist erforderlich.' }

  const deadline = await loadOwnedDeadline(supabase, args)
  if ('error' in deadline) return { success: false, error: deadline.error }

  const { error } = await supabase.from('submission_items').insert({
    organization_id: args.organizationId,
    deadline_id: deadline.id,
    identifier: args.identifier?.trim() || null,
    title,
    state: 'open',
    source: 'manual',
    source_key: buildManualSubmissionItemSourceKey(),
    confidence: 'high',
    source_document_id: null,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function assignSubmissionItemsToDeadline(
  supabase: Client,
  args: {
    organizationId: string
    owner: SubmissionWorkspaceOwner
    itemIds: string[]
    deadlineId: string
  },
): Promise<{ success: boolean; error?: string }> {
  if (args.itemIds.length === 0) return { success: true }
  const deadline = await loadOwnedDeadline(supabase, args)
  if ('error' in deadline) return { success: false, error: deadline.error }

  const { error } = await supabase
    .from('submission_items')
    .update({
      deadline_id: deadline.id,
      updated_at: new Date().toISOString(),
    })
    .in('id', args.itemIds)
    .eq('organization_id', args.organizationId)
    .is('deadline_id', null)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
