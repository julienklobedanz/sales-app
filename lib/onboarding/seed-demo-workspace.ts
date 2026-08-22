import type { SupabaseClient } from '@supabase/supabase-js'

import { asJson, asTableInsert } from '@/lib/supabase/db-types'
import { log } from '@/lib/observability/logger'

const DEMO_SEED_TITLE_PREFIX = 'Beispiel · '

export type DemoSeedRecord = {
  seededAt: string
  companyIds: string[]
  referenceIds: string[]
  dealIds: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parseDemoSeed(settings: unknown): DemoSeedRecord | null {
  if (!isRecord(settings)) return null
  const raw = settings.demoSeed
  if (!isRecord(raw)) return null
  const companyIds = Array.isArray(raw.companyIds)
    ? raw.companyIds.filter((id): id is string => typeof id === 'string')
    : []
  const referenceIds = Array.isArray(raw.referenceIds)
    ? raw.referenceIds.filter((id): id is string => typeof id === 'string')
    : []
  const dealIds = Array.isArray(raw.dealIds)
    ? raw.dealIds.filter((id): id is string => typeof id === 'string')
    : []
  const seededAt = typeof raw.seededAt === 'string' ? raw.seededAt : ''
  if (!seededAt) return null
  return { seededAt, companyIds, referenceIds, dealIds }
}

export async function seedDemoWorkspaceIfEmpty(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<{ seeded: boolean }> {
  const [{ count: refCount }, { count: dealCount }] = await Promise.all([
    supabase
      .from('references')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
  ])

  if ((refCount ?? 0) > 0 || (dealCount ?? 0) > 0) {
    return { seeded: false }
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert(
      asTableInsert<'companies'>({
        organization_id: organizationId,
        name: `${DEMO_SEED_TITLE_PREFIX}Stadtwerke Nord GmbH`,
        industry: 'energy',
        headquarters: 'Hamburg, DE',
        employee_count: 1200,
        website_url: 'https://example.com',
        description: 'Beispiel-Account zum Ausprobieren. Mit einem Klick löschbar.',
      }),
    )
    .select('id')
    .single()

  if (companyError || !company?.id) {
    log.error('demoSeed.companyFailed', { organizationId }, companyError)
    return { seeded: false }
  }

  const refPayloads = [
    {
      organization_id: organizationId,
      created_by: userId,
      company_id: company.id,
      title: `${DEMO_SEED_TITLE_PREFIX}SAP-S/4-Migration Stadtwerke Nord`,
      status: 'approved',
      summary:
        'Cloud-Migration der SAP-Landschaft mit ISO-27001-Betrieb in der EU. Beispielreferenz.',
      customer_challenge:
        'Heterogene Legacy-Workloads, hoher Betriebsaufwand und fehlende Skalierung für Echtzeitdaten.',
      our_solution:
        'Phasenweise S/4HANA-Migration, Managed Cloud und definierter Servicebeginn in 14 Wochen.',
      industry: 'energy',
      volume_eur: '1800000',
      tags: 'beispiel,sap,cloud,iso27001',
    },
    {
      organization_id: organizationId,
      created_by: userId,
      company_id: company.id,
      title: `${DEMO_SEED_TITLE_PREFIX}ISO-27001-Betrieb Rechenzentrum Nord`,
      status: 'approved',
      summary: 'Zertifizierter Betrieb mit Datenhaltung in Deutschland. Beispielreferenz.',
      customer_challenge:
        'Nachweisbare Informationssicherheit und Standortbindung für eine öffentliche Ausschreibung.',
      our_solution:
        'ISO-27001-Scope Cloud/SAP, Berufshaftpflicht und zwei Enterprise-Referenzen im DACH-Raum.',
      industry: 'energy',
      volume_eur: '920000',
      tags: 'beispiel,iso27001,compliance',
    },
  ]

  const { data: refs, error: refsError } = await supabase
    .from('references')
    .insert(refPayloads.map((row) => asTableInsert<'references'>(row)))
    .select('id')

  if (refsError || !refs?.length) {
    log.error('demoSeed.referencesFailed', { organizationId }, refsError)
    await supabase.from('companies').delete().eq('id', company.id)
    return { seeded: false }
  }

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert(
      asTableInsert<'deals'>({
        organization_id: organizationId,
        created_by: userId,
        company_id: company.id,
        title: `${DEMO_SEED_TITLE_PREFIX}EU-Ausschreibung Cloud-Betrieb 2026`,
        status: 'rfp',
        is_rfp_mode: true,
        industry: 'energy',
        volume: '2400000',
        expiry_date: '2026-11-15',
        requirements_text:
          'Beispiel-Ausschreibung (DACH): ISO/IEC 27001 verpflichtend, mindestens 2 vergleichbare Referenzen, Datenhaltung EU, Mitarbeiterzahl ≥ 500. K.O. ohne gültiges Zertifikat.',
        sales_manager_id: userId,
      }),
    )
    .select('id')
    .single()

  if (dealError || !deal?.id) {
    log.error('demoSeed.dealFailed', { organizationId }, dealError)
  }

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('integration_settings')
    .eq('id', organizationId)
    .maybeSingle()

  const previous = isRecord(orgRow?.integration_settings)
    ? orgRow.integration_settings
    : {}
  const demoSeed: DemoSeedRecord = {
    seededAt: new Date().toISOString(),
    companyIds: [company.id],
    referenceIds: refs.map((row) => row.id),
    dealIds: deal?.id ? [deal.id] : [],
  }

  const { error: settingsError } = await supabase
    .from('organizations')
    .update({
      integration_settings: asJson({ ...previous, demoSeed }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (settingsError) {
    log.error('demoSeed.settingsFailed', { organizationId }, settingsError)
  }

  return { seeded: true }
}

export async function deleteDemoWorkspaceSeed(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('integration_settings')
    .eq('id', organizationId)
    .maybeSingle()

  const seed = parseDemoSeed(orgRow?.integration_settings)
  if (!seed) return { success: true }

  if (seed.dealIds.length) {
    await supabase.from('deals').delete().in('id', seed.dealIds)
  }
  if (seed.referenceIds.length) {
    await supabase.from('references').delete().in('id', seed.referenceIds)
  }
  if (seed.companyIds.length) {
    await supabase.from('companies').delete().in('id', seed.companyIds)
  }

  const previous = isRecord(orgRow?.integration_settings)
    ? { ...orgRow.integration_settings }
    : {}
  delete previous.demoSeed

  const { error } = await supabase
    .from('organizations')
    .update({
      integration_settings: asJson(previous),
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
