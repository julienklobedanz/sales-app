import { describe, expect, it } from 'vitest'
import { generatePortfolioSlug } from './slug'

describe('generatePortfolioSlug', () => {
  it('generiert ein google-meet-artiges Muster xxx-xxxx-xxx', () => {
    const slug = generatePortfolioSlug()
    expect(slug).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/)
  })

  it('enthält keine leicht verwechselbaren Zeichen', () => {
    const slug = generatePortfolioSlug()
    expect(slug).not.toMatch(/[ilo]/)
  })
})

