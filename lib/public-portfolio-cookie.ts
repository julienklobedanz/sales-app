/** HttpOnly cookie stores opaque unlock token per share slug (set after successful password entry). */
export function publicPortfolioUnlockCookieName(slug: string): string {
  const safe = slug.replace(/[^a-z0-9-]/gi, '').slice(0, 64)
  return `pf_unlock_${safe || 'x'}`
}
