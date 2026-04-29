/** Workspace-level rules for customer share links (Security & Compliance + Workflow defaults). */
export type OrgPublicLinkPolicy = {
  defaultTtlDays: number
  maxTtlDays: number
  requirePasswordForNew: boolean
}

export function parseOrgPublicLinkPolicy(
  workflowSettings: unknown,
  linkExpiryDaysFallback: number
): OrgPublicLinkPolicy {
  const obj =
    workflowSettings && typeof workflowSettings === 'object'
      ? (workflowSettings as Record<string, unknown>)
      : {}

  const maxRaw = obj.public_link_max_ttl_days
  const maxTtlDays =
    typeof maxRaw === 'number' && Number.isFinite(maxRaw)
      ? Math.max(7, Math.min(3650, Math.trunc(maxRaw)))
      : 365

  const defRaw = obj.public_link_default_ttl_days
  const fromExplicit =
    typeof defRaw === 'number' && Number.isFinite(defRaw) ? Math.trunc(defRaw) : null
  const fromLegacy =
    typeof obj.link_expiry_days === 'number' && Number.isFinite(obj.link_expiry_days)
      ? Math.trunc(obj.link_expiry_days as number)
      : linkExpiryDaysFallback
  const defaultTtlDays = Math.max(1, Math.min(maxTtlDays, fromExplicit ?? fromLegacy))

  const requirePasswordForNew = obj.public_link_require_password_for_new === true

  return { defaultTtlDays, maxTtlDays, requirePasswordForNew }
}
