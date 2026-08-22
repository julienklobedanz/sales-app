import { parseIcpDefinition, type IcpDefinition } from '@/lib/deals/icp-rubric'

export type CapabilityProfile = {
  employeeCount?: number
  annualRevenueEur?: number
  regions?: string[]
  certifiedRoles?: Array<{ role: string; count: number }>
}

export type OrgCapabilitySettings = {
  capabilityProfile: CapabilityProfile
  icpDefinition: IcpDefinition
}

function parseCertifiedRoles(raw: unknown): CapabilityProfile['certifiedRoles'] {
  if (!Array.isArray(raw)) return undefined
  const out: NonNullable<CapabilityProfile['certifiedRoles']> = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const role = typeof o.role === 'string' ? o.role.trim() : ''
    const count =
      typeof o.count === 'number' && Number.isFinite(o.count)
        ? Math.max(0, Math.trunc(o.count))
        : 0
    if (role && count > 0) out.push({ role, count })
  }
  return out.length ? out : undefined
}

function parseCapabilityProfile(raw: unknown): CapabilityProfile {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>

  const employeeCount =
    typeof o.employeeCount === 'number' && Number.isFinite(o.employeeCount)
      ? Math.max(0, Math.trunc(o.employeeCount))
      : undefined

  const annualRevenueEur =
    typeof o.annualRevenueEur === 'number' && Number.isFinite(o.annualRevenueEur)
      ? Math.max(0, o.annualRevenueEur)
      : undefined

  const regions = Array.isArray(o.regions)
    ? o.regions
        .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
        .map((r) => r.trim())
    : undefined

  const certifiedRoles = parseCertifiedRoles(o.certifiedRoles)

  return {
    ...(employeeCount !== undefined ? { employeeCount } : {}),
    ...(annualRevenueEur !== undefined ? { annualRevenueEur } : {}),
    ...(regions?.length ? { regions } : {}),
    ...(certifiedRoles ? { certifiedRoles } : {}),
  }
}

export function parseOrgCapabilitySettings(raw: unknown): OrgCapabilitySettings {
  if (!raw || typeof raw !== 'object') {
    return { capabilityProfile: {}, icpDefinition: {} }
  }
  const o = raw as Record<string, unknown>
  return {
    capabilityProfile: parseCapabilityProfile(o.capabilityProfile),
    icpDefinition: parseIcpDefinition(o.icpDefinition),
  }
}
