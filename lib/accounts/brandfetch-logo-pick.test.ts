import { describe, expect, it } from 'vitest'
import {
  listLogoUrlsFromBrandfetchJson,
  pickBestLogoUrlFromBrandfetchJson,
  scoreBrandfetchLogoCandidate,
} from './brandfetch-accounts-refresh'

describe('scoreBrandfetchLogoCandidate', () => {
  it('bevorzugt dark theme vor light theme', () => {
    expect(
      scoreBrandfetchLogoCandidate({ theme: 'dark', type: 'logo', format: 'svg' })
    ).toBeGreaterThan(
      scoreBrandfetchLogoCandidate({ theme: 'light', type: 'logo', format: 'svg' })
    )
  })
})

describe('pickBestLogoUrlFromBrandfetchJson', () => {
  const appleLike = {
    logos: [
      {
        type: 'logo',
        theme: 'light',
        formats: [{ src: 'https://cdn.example/apple-white.svg', format: 'svg' }],
      },
      {
        type: 'logo',
        theme: 'dark',
        formats: [{ src: 'https://cdn.example/apple-black.svg', format: 'svg' }],
      },
      {
        type: 'icon',
        theme: 'dark',
        formats: [
          {
            src: 'https://cdn.example/apple-icon.png',
            format: 'png',
            background: '#ffffff',
          },
        ],
      },
    ],
  }

  it('wählt dunkles Logo statt weißem Wortmarken-Logo', () => {
    const url = pickBestLogoUrlFromBrandfetchJson(appleLike)
    expect(url).not.toBe('https://cdn.example/apple-white.svg')
    expect(url === 'https://cdn.example/apple-black.svg' || url === 'https://cdn.example/apple-icon.png').toBe(
      true
    )
  })

  it('überspringt ausgeschlossene (helle) URL und nimmt dunkle Alternative', () => {
    const url = pickBestLogoUrlFromBrandfetchJson(appleLike, 'https://cdn.example/apple-white.svg')
    expect(url).not.toBe('https://cdn.example/apple-white.svg')
  })

  it('schließt light-Theme aus, wenn dark verfügbar ist', () => {
    const urls = listLogoUrlsFromBrandfetchJson(appleLike)
    expect(urls).not.toContain('https://cdn.example/apple-white.svg')
    expect(urls.length).toBe(2)
  })
})
