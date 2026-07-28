/** Kundenlink wie von Sales geteilt — ohne Manage/Sperr-Parameter. */
export function buildPublicProspectPreviewUrl(slug: string, recipientToken?: string | null): string {
  const params = new URLSearchParams()
  const r = recipientToken?.trim()
  if (r) params.set('r', r)
  const qs = params.toString()
  return qs ? `/p/${encodeURIComponent(slug)}?${qs}` : `/p/${encodeURIComponent(slug)}`
}
