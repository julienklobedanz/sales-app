import 'server-only'

import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import { embedTextWithOpenAI } from '@/lib/embeddings-openai'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import type { Database } from '@/lib/database.types'
import { rpcMatchReferences } from '@/lib/match-references-rpc'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type DbClient = SupabaseClient<Database>

export function accountReferenceFitTag(companyId: string): string {
  return `account-reference-fit:${companyId}`
}

function buildAccountMatchQuery(company: {
  name: string
  industry: string | null
  headquarters: string | null
  description: string | null
  companyGoals: string | null
}): string {
  return [
    `Account: ${company.name}`,
    company.industry ? `Branche: ${formatIndustryDisplay(company.industry)}` : null,
    company.headquarters ? `Region: ${company.headquarters}` : null,
    company.description?.trim() ? `Profil:\n${company.description.trim()}` : null,
    company.companyGoals?.trim() ? `Ziele:\n${company.companyGoals.trim()}` : null,
    'Passende Referenzbeweise für diesen Account.',
  ]
    .filter(Boolean)
    .join('\n')
}

async function computeAccountReferenceFitScores(
  supabase: DbClient,
  params: {
    organizationId: string
    salesVisibleOnly: boolean
    company: {
      name: string
      industry: string | null
      headquarters: string | null
      description: string | null
      companyGoals: string | null
    }
    referenceIds: string[]
    apiKey: string
  }
): Promise<Record<string, number>> {
  const { organizationId, salesVisibleOnly, company, referenceIds, apiKey } = params
  if (!referenceIds.length) return {}

  const queryText = buildAccountMatchQuery(company)
  const embed = await embedTextWithOpenAI(apiKey, queryText)
  if ('error' in embed) return {}

  const { rows, error } = await rpcMatchReferences(supabase, {
    queryEmbedding: embed.embedding,
    matchThreshold: 0.2,
    matchCount: Math.max(referenceIds.length, 20),
    organizationId,
    salesVisibleOnly,
  })
  if (error) return {}

  const linked = new Set(referenceIds)
  const scores: Record<string, number> = {}
  for (const row of rows) {
    if (linked.has(row.id)) {
      scores[row.id] = Math.round(row.similarity * 100)
    }
  }
  return scores
}

export async function getCachedAccountReferenceFitScores(params: {
  organizationId: string
  salesVisibleOnly: boolean
  companyId: string
  company: {
    name: string
    industry: string | null
    headquarters: string | null
    description: string | null
    companyGoals: string | null
  }
  referenceIds: string[]
  apiKey: string
}): Promise<Record<string, number>> {
  const { organizationId, salesVisibleOnly, companyId, referenceIds, apiKey, company } = params
  const visibilityKey = salesVisibleOnly ? 'sales' : 'all'
  const cacheKey = `account-reference-fit:${organizationId}:${companyId}:${visibilityKey}:${referenceIds.join(',')}`

  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    const client = await createServerSupabaseClient()
    return computeAccountReferenceFitScores(client, params)
  }

  return unstable_cache(
    () => computeAccountReferenceFitScores(admin, params),
    [cacheKey],
    { tags: [accountReferenceFitTag(companyId)], revalidate: 300 }
  )()
}
