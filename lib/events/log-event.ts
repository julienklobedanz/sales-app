'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type LogEventParams = {
  organizationId: string
  eventType: string
  payload?: Record<string, unknown>
  referenceId?: string | null
  dealId?: string | null
  createdBy?: string | null
}

/**
 * Schreibt ein `evidence_events`-Eintrag. Fehler werden geloggt, nicht geworfen
 * (Tracking darf Business-Flows nicht brechen).
 */
export async function logEvent(params: LogEventParams): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const createdBy = params.createdBy !== undefined ? params.createdBy : user?.id ?? null

    const { error } = await supabase.from('evidence_events').insert({
      organization_id: params.organizationId,
      event_type: params.eventType,
      payload: params.payload ?? {},
      reference_id: params.referenceId ?? null,
      deal_id: params.dealId ?? null,
      created_by: createdBy,
    })
    if (error) console.error('[logEvent]', params.eventType, error.message)
  } catch (e) {
    console.error('[logEvent]', params.eventType, e)
  }
}

type LogEventForOrgParams = Omit<LogEventParams, 'organizationId'>

/**
 * Wie `logEvent`, löst `organization_id` aus der Session (Profil) auf.
 */
export async function logEventForCurrentOrg(params: LogEventForOrgParams): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const organizationId = profile?.organization_id as string | undefined
    if (!organizationId) return

    await logEvent({
      ...params,
      organizationId,
      createdBy: params.createdBy ?? user.id,
    })
  } catch (e) {
    console.error('[logEventForCurrentOrg]', params.eventType, e)
  }
}
