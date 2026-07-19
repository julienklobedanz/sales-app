/**
 * Brandfetch CDN-URLs: für unsere hellen UI-Zellen immer `theme/dark` nutzen.
 * `theme/light` = helles Logo (für dunkle Hintergründe) — unsichtbar auf Weiß.
 */
export function ensureBrandfetchDarkLogoUrl(
  logoUrl: string | null | undefined
): string | null {
  const raw = String(logoUrl ?? '').trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (!url.hostname.endsWith('brandfetch.io')) return raw

    // Explizit light → dark
    if (url.pathname.includes('/theme/light')) {
      url.pathname = url.pathname.replace(/\/theme\/light\b/g, '/theme/dark')
      return url.toString()
    }

    // Bereits dark
    if (url.pathname.includes('/theme/dark')) return url.toString()

    // Brand-ID-Pfad ohne Theme: /idXXXX/logo.svg → /idXXXX/theme/dark/logo.svg
    const idMatch = url.pathname.match(/^\/(id[A-Za-z0-9_-]+)\/(.+)$/)
    if (idMatch && !url.pathname.includes('/theme/')) {
      url.pathname = `/${idMatch[1]}/theme/dark/${idMatch[2]}`
      return url.toString()
    }

    return raw
  } catch {
    return raw
  }
}

/** @deprecated Alias — nutze ensureBrandfetchDarkLogoUrl. */
export function rewriteBrandfetchLogoUrlForLightBackground(
  logoUrl: string | null | undefined
): string | null {
  return ensureBrandfetchDarkLogoUrl(logoUrl)
}

export function brandfetchLogoUrlLooksLightTheme(logoUrl: string | null | undefined): boolean {
  const raw = String(logoUrl ?? '').trim().toLowerCase()
  return raw.includes('/theme/light')
}
