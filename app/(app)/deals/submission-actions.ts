'use server'

import { revalidatePath } from 'next/cache'

import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import {
  canManageDealDocuments,
  canManageTenderDocuments,
} from '@/lib/deals/can-manage-deal-documents'
import { revalidateDealWorkspacePaths } from '@/lib/deals/revalidate-deal-workspace-paths'
import type { SubmissionItemReview } from '@/lib/deals/submission-item-display'
import {
  assignSubmissionItemsToDeadline,
  cycleSubmissionItemState,
  insertManualSubmissionItem,
  setDeadlineSubmissionTarget,
  setSubmissionItemDocument,
  setSubmissionItemReview,
} from '@/lib/deals/submission-item-mutations'
import {
  submissionWorkspaceHref,
  type SubmissionWorkspaceOwner,
} from '@/lib/deals/submission-workspace-href'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidateTenderSurfaces } from '@/lib/tenders/revalidate-tender-surfaces'

type SessionCtx = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  userId: string
  orgId: string
  systemRole: ReturnType<typeof parseProfileRoles>['systemRole']
  functionRole: ReturnType<typeof parseProfileRoles>['functionRole']
}

async function getSession(): Promise<SessionCtx | null> {
  const user = await getRequestUser()
  if (!user) return null

  const profile = await getRequestProfile()
  if (!profile?.organization_id) return null

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const supabase = await createServerSupabaseClient()
  return {
    supabase,
    userId: user.id,
    orgId: profile.organization_id,
    systemRole,
    functionRole,
  }
}

async function assertCanMutate(
  ctx: SessionCtx,
  owner: SubmissionWorkspaceOwner,
): Promise<{ success: true } | { success: false; error: string }> {
  if (owner.kind === 'deal') {
    const { data: deal } = await ctx.supabase
      .from('deals')
      .select('sales_manager_id, account_manager_id')
      .eq('id', owner.id)
      .eq('organization_id', ctx.orgId)
      .maybeSingle()
    if (!deal) return { success: false, error: 'Deal nicht gefunden.' }
    if (!canManageDealDocuments(deal, ctx.userId, ctx.systemRole, ctx.functionRole)) {
      return { success: false, error: 'Keine Berechtigung.' }
    }
    return { success: true }
  }

  const { data: tender } = await ctx.supabase
    .from('tenders')
    .select('id')
    .eq('id', owner.id)
    .eq('organization_id', ctx.orgId)
    .maybeSingle()
  if (!tender) return { success: false, error: 'Ausschreibung nicht gefunden.' }

  const { data: lots } = await ctx.supabase
    .from('deals')
    .select('sales_manager_id, account_manager_id')
    .eq('tender_id', owner.id)
    .eq('organization_id', ctx.orgId)
  if (
    !canManageTenderDocuments(lots ?? [], ctx.userId, ctx.systemRole, ctx.functionRole)
  ) {
    return { success: false, error: 'Keine Berechtigung.' }
  }
  return { success: true }
}

async function revalidateOwner(args: {
  supabase: SessionCtx['supabase']
  orgId: string
  owner: SubmissionWorkspaceOwner
}) {
  revalidatePath(submissionWorkspaceHref(args.owner), 'layout')
  if (args.owner.kind === 'tender') {
    await revalidateTenderSurfaces(args.supabase, {
      organizationId: args.orgId,
      tenderId: args.owner.id,
    })
    return
  }
  revalidateDealWorkspacePaths(args.owner.id)
}

async function withMutateAccess(
  ownerKind: 'tender' | 'deal',
  ownerId: string,
): Promise<
  | { success: false; error: string }
  | { success: true; ctx: SessionCtx; owner: SubmissionWorkspaceOwner }
> {
  const ctx = await getSession()
  if (!ctx) return { success: false, error: 'Nicht angemeldet.' }
  const owner: SubmissionWorkspaceOwner = { kind: ownerKind, id: ownerId }
  const access = await assertCanMutate(ctx, owner)
  if (!access.success) return access
  return { success: true, ctx, owner }
}

export async function setDeadlineSubmissionTargetAction(args: {
  ownerKind: 'tender' | 'deal'
  ownerId: string
  deadlineId: string
  isSubmissionTarget: boolean
}): Promise<{ success: boolean; error?: string }> {
  const gate = await withMutateAccess(args.ownerKind, args.ownerId)
  if (!gate.success) return gate
  const res = await setDeadlineSubmissionTarget(gate.ctx.supabase, {
    organizationId: gate.ctx.orgId,
    owner: gate.owner,
    deadlineId: args.deadlineId,
    isSubmissionTarget: args.isSubmissionTarget,
  })
  if (res.success) {
    await revalidateOwner({
      supabase: gate.ctx.supabase,
      orgId: gate.ctx.orgId,
      owner: gate.owner,
    })
  }
  return res
}

export async function cycleSubmissionItemStateAction(args: {
  ownerKind: 'tender' | 'deal'
  ownerId: string
  itemId: string
}): Promise<{ success: boolean; error?: string }> {
  const gate = await withMutateAccess(args.ownerKind, args.ownerId)
  if (!gate.success) return gate
  const res = await cycleSubmissionItemState(gate.ctx.supabase, {
    organizationId: gate.ctx.orgId,
    itemId: args.itemId,
    userId: gate.ctx.userId,
  })
  if (res.success) {
    await revalidateOwner({
      supabase: gate.ctx.supabase,
      orgId: gate.ctx.orgId,
      owner: gate.owner,
    })
  }
  return res
}

export async function reviewSubmissionItemAction(args: {
  ownerKind: 'tender' | 'deal'
  ownerId: string
  itemId: string
  review: SubmissionItemReview
}): Promise<{ success: boolean; error?: string }> {
  const gate = await withMutateAccess(args.ownerKind, args.ownerId)
  if (!gate.success) return gate
  const res = await setSubmissionItemReview(gate.ctx.supabase, {
    organizationId: gate.ctx.orgId,
    itemId: args.itemId,
    userId: gate.ctx.userId,
    review: args.review,
  })
  if (res.success) {
    await revalidateOwner({
      supabase: gate.ctx.supabase,
      orgId: gate.ctx.orgId,
      owner: gate.owner,
    })
  }
  return res
}

export async function attachSubmissionItemDocumentAction(args: {
  ownerKind: 'tender' | 'deal'
  ownerId: string
  itemId: string
  documentId: string
}): Promise<{ success: boolean; error?: string }> {
  const gate = await withMutateAccess(args.ownerKind, args.ownerId)
  if (!gate.success) return gate
  const res = await setSubmissionItemDocument(gate.ctx.supabase, {
    organizationId: gate.ctx.orgId,
    itemId: args.itemId,
    documentId: args.documentId,
  })
  if (res.success) {
    await revalidateOwner({
      supabase: gate.ctx.supabase,
      orgId: gate.ctx.orgId,
      owner: gate.owner,
    })
  }
  return res
}

export async function createManualSubmissionItemAction(args: {
  ownerKind: 'tender' | 'deal'
  ownerId: string
  deadlineId: string
  identifier?: string
  title: string
}): Promise<{ success: boolean; error?: string }> {
  const gate = await withMutateAccess(args.ownerKind, args.ownerId)
  if (!gate.success) return gate
  const res = await insertManualSubmissionItem(gate.ctx.supabase, {
    organizationId: gate.ctx.orgId,
    owner: gate.owner,
    deadlineId: args.deadlineId,
    identifier: args.identifier,
    title: args.title,
  })
  if (res.success) {
    await revalidateOwner({
      supabase: gate.ctx.supabase,
      orgId: gate.ctx.orgId,
      owner: gate.owner,
    })
  }
  return res
}

export async function assignSubmissionItemAction(args: {
  ownerKind: 'tender' | 'deal'
  ownerId: string
  itemId: string
  deadlineId: string
}): Promise<{ success: boolean; error?: string }> {
  const gate = await withMutateAccess(args.ownerKind, args.ownerId)
  if (!gate.success) return gate
  const res = await assignSubmissionItemsToDeadline(gate.ctx.supabase, {
    organizationId: gate.ctx.orgId,
    owner: gate.owner,
    itemIds: [args.itemId],
    deadlineId: args.deadlineId,
  })
  if (res.success) {
    await revalidateOwner({
      supabase: gate.ctx.supabase,
      orgId: gate.ctx.orgId,
      owner: gate.owner,
    })
  }
  return res
}
