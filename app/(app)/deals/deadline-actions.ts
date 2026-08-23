'use server'

import { revalidatePath } from 'next/cache'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import {
  createManualDealDeadline,
  suppressDealDeadline,
  updateDealDeadline,
} from '@/lib/deals/deadlines'
import type { DealDeadlineKind } from '@/lib/deals/deadline-types'
import { timelineDueToIso } from '@/lib/deals/deadline-rfp-mapper'

async function getSessionOrgAndUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  const orgId = profile?.organization_id ?? null
  if (!orgId) return null

  return { supabase, userId: user.id, orgId }
}

export async function createDealDeadlineManual(args: {
  dealId: string
  kind: DealDeadlineKind
  label: string
  dueDate?: string | null
  dueText?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getSessionOrgAndUser()
  if (!ctx) return { success: false, error: 'Nicht angemeldet.' }

  const label = args.label.trim()
  if (!label) return { success: false, error: 'Bezeichnung ist erforderlich.' }

  const dueAt = args.dueDate?.trim() ? timelineDueToIso(args.dueDate.trim(), null) : null
  const dueText = args.dueText?.trim() || null
  const isApproximate = !dueAt && Boolean(dueText)

  const res = await createManualDealDeadline(ctx.supabase, {
    dealId: args.dealId,
    organizationId: ctx.orgId,
    userId: ctx.userId,
    kind: args.kind,
    label,
    dueAt,
    dueText,
    isApproximate,
  })

  if (res.success) revalidatePath(ROUTES.deals.detail(args.dealId))
  return res
}

export async function updateDealDeadlineAction(args: {
  dealId: string
  deadlineId: string
  source: 'rfp' | 'manual'
  kind: DealDeadlineKind
  label: string
  dueDate?: string | null
  dueText?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getSessionOrgAndUser()
  if (!ctx) return { success: false, error: 'Nicht angemeldet.' }

  const label = args.label.trim()
  if (!label) return { success: false, error: 'Bezeichnung ist erforderlich.' }

  const dueAt = args.dueDate?.trim() ? timelineDueToIso(args.dueDate.trim(), null) : null
  const dueText = args.dueText?.trim() || null
  const isApproximate = !dueAt && Boolean(dueText)

  const res = await updateDealDeadline(ctx.supabase, {
    deadlineId: args.deadlineId,
    organizationId: ctx.orgId,
    kind: args.kind,
    label,
    dueAt,
    dueText,
    isApproximate,
    source: args.source,
  })

  if (res.success) revalidatePath(ROUTES.deals.detail(args.dealId))
  return res
}

export async function suppressDealDeadlineAction(args: {
  dealId: string
  deadlineId: string
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getSessionOrgAndUser()
  if (!ctx) return { success: false, error: 'Nicht angemeldet.' }

  const res = await suppressDealDeadline(ctx.supabase, {
    deadlineId: args.deadlineId,
    organizationId: ctx.orgId,
  })

  if (res.success) revalidatePath(ROUTES.deals.detail(args.dealId))
  return res
}
