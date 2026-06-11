import { describe, expect, it } from 'vitest'

import {
  formatShowcaseNarrativeForDisplay,
  parseShowcaseBulletItems,
} from '@/lib/references/narrative-normalize'

describe('formatShowcaseNarrativeForDisplay', () => {
  it('führt Fortsetzungszeilen innerhalb eines Bullets zusammen', () => {
    const input = `• Modernize infrastructure to enable Open
RAN and Cloud RAN implementation
• Expand network capacity with 5G`

    expect(formatShowcaseNarrativeForDisplay(input)).toBe(
      '• Modernize infrastructure to enable Open RAN and Cloud RAN implementation\n• Expand network capacity with 5G'
    )
  })

  it('führt Absatz-Umbrüche in Fließtext zusammen', () => {
    const input = `Modernizing network infrastructure
and operations to meet rising data demands.`

    expect(formatShowcaseNarrativeForDisplay(input)).toBe(
      'Modernizing network infrastructure and operations to meet rising data demands.'
    )
  })
})

describe('parseShowcaseBulletItems', () => {
  it('liefert Bullet-Items für Listen', () => {
    expect(
      parseShowcaseBulletItems(
        '• Modernize infrastructure to enable Open RAN\n• Expand network capacity with 5G'
      )
    ).toEqual([
      'Modernize infrastructure to enable Open RAN',
      'Expand network capacity with 5G',
    ])
  })
})
