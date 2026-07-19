import { describe, expect, it } from 'vitest'
import {
  brandfetchLogoUrlLooksLightTheme,
  ensureBrandfetchDarkLogoUrl,
  rewriteBrandfetchLogoUrlForLightBackground,
} from './logo-theme-url'

describe('ensureBrandfetchDarkLogoUrl', () => {
  it('tauscht theme/light gegen theme/dark', () => {
    const input =
      'https://cdn.brandfetch.io/idnrCPuv87/theme/light/logo.svg?c=abc'
    expect(ensureBrandfetchDarkLogoUrl(input)).toBe(
      'https://cdn.brandfetch.io/idnrCPuv87/theme/dark/logo.svg?c=abc'
    )
  })

  it('lässt theme/dark unverändert', () => {
    const input =
      'https://cdn.brandfetch.io/idnrCPuv87/theme/dark/logo.svg?c=abc'
    expect(ensureBrandfetchDarkLogoUrl(input)).toBe(input)
  })

  it('fügt theme/dark ein, wenn Theme fehlt', () => {
    const input = 'https://cdn.brandfetch.io/idnrCPuv87/logo.svg?c=abc'
    expect(ensureBrandfetchDarkLogoUrl(input)).toBe(
      'https://cdn.brandfetch.io/idnrCPuv87/theme/dark/logo.svg?c=abc'
    )
  })

  it('Alias rewriteBrandfetchLogoUrlForLightBackground bleibt kompatibel', () => {
    expect(
      rewriteBrandfetchLogoUrlForLightBackground(
        'https://cdn.brandfetch.io/id1SLeDvgF/theme/light/logo.svg?c=x'
      )
    ).toContain('/theme/dark/')
  })

  it('erkennt light-Theme in der URL', () => {
    expect(
      brandfetchLogoUrlLooksLightTheme(
        'https://cdn.brandfetch.io/id1SLeDvgF/theme/light/logo.svg?c=x'
      )
    ).toBe(true)
    expect(
      brandfetchLogoUrlLooksLightTheme(
        'https://cdn.brandfetch.io/id1SLeDvgF/theme/dark/logo.svg?c=x'
      )
    ).toBe(false)
  })
})
