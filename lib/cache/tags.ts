/** Cache-Tags für org-scoped Daten (Tenant-Isolierung über orgId im Tag). */

export function referencesTag(orgId: string): string {
  return `references:${orgId}`
}

export function companiesTag(orgId: string): string {
  return `companies:${orgId}`
}

export function complianceTag(orgId: string): string {
  return `compliance:${orgId}`
}

export function kpisTag(orgId: string): string {
  return `kpis:${orgId}`
}

export type OrgCacheScope = 'references' | 'companies' | 'compliance' | 'kpis'

export function tagForOrgScope(scope: OrgCacheScope, orgId: string): string {
  switch (scope) {
    case 'references':
      return referencesTag(orgId)
    case 'companies':
      return companiesTag(orgId)
    case 'compliance':
      return complianceTag(orgId)
    case 'kpis':
      return kpisTag(orgId)
  }
}
