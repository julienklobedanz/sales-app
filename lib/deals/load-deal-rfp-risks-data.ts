import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import type { PersistedDealDeskAnalysisSnapshot } from '@/lib/deal-desk/analysis-snapshot'
import type {
  DealDeskRedFlag,
  DealDeskSmeTask,
} from '@/lib/deal-desk/deal-analysis-types'
import { groupSmeTasksByTopic, type SmeTopicGroup } from '@/lib/deals/group-sme-by-topic'

export type DealRfpRisksData = {
  redFlags: DealDeskRedFlag[]
  smeGroups: SmeTopicGroup[]
  smeOpenCount: number
}

function mapDbRedFlag(row: {
  id: string
  flag_key: string | null
  label: string
  severity: string | null
}): DealDeskRedFlag {
  const severityRaw = (row.severity ?? 'medium').toLowerCase()
  const severity: DealDeskRedFlag['severity'] =
    severityRaw === 'critical' || severityRaw === 'high' || severityRaw === 'medium'
      ? severityRaw
      : 'medium'
  return {
    id: row.flag_key?.trim() || row.id,
    severity,
    title: row.label,
    excerpt: '',
  }
}

export async function loadDealRfpRisksData(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  projectId: string,
  snapshotFallback: PersistedDealDeskAnalysisSnapshot | null,
): Promise<DealRfpRisksData> {
  const [flagsRes, smeRes] = await Promise.all([
    supabase
      .from('deal_desk_red_flags')
      .select('id, flag_key, label, severity')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true }),
    supabase
      .from('deal_desk_sme_routes')
      .select('requirement_key')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId),
  ])

  let redFlags: DealDeskRedFlag[] = []
  if (flagsRes.data?.length) {
    redFlags = flagsRes.data.map((row) => mapDbRedFlag(row))
  } else if (snapshotFallback?.redFlags?.length) {
    redFlags = snapshotFallback.redFlags.map((f) => ({ ...f, markedForLegal: undefined }))
  }

  const snapshotTasks: DealDeskSmeTask[] = snapshotFallback?.smeTasks ?? []
  const dbKeys = new Set((smeRes.data ?? []).map((r) => r.requirement_key))

  let smeTasks = snapshotTasks
  if (dbKeys.size > 0) {
    const fromSnapshot = snapshotTasks.filter((t) => dbKeys.has(t.id))
    if (fromSnapshot.length > 0) {
      smeTasks = fromSnapshot
    } else {
      smeTasks = [...dbKeys].map((key) => ({
        id: key,
        question: key.replace(/^sme-/, 'Offener Klärungspunkt: '),
        category: 'Allgemein',
      }))
    }
  }

  const smeGroups = groupSmeTasksByTopic(smeTasks)

  return {
    redFlags,
    smeGroups,
    smeOpenCount: smeTasks.length,
  }
}
