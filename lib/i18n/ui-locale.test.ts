import { describe, expect, it } from 'vitest'
import { normalizeUiLocale, uiLocaleFromApiSettings } from './ui-locale'

describe('normalizeUiLocale', () => {
  it('defaults to de', () => {
    expect(normalizeUiLocale(null)).toBe('de')
    expect(normalizeUiLocale('')).toBe('de')
    expect(normalizeUiLocale('fr')).toBe('de')
  })

  it('accepts en variants', () => {
    expect(normalizeUiLocale('en')).toBe('en')
    expect(normalizeUiLocale('EN-US')).toBe('en')
  })
})

describe('uiLocaleFromApiSettings', () => {
  it('reads ui_locale', () => {
    expect(uiLocaleFromApiSettings({ ui_locale: 'en' })).toBe('en')
    expect(uiLocaleFromApiSettings({})).toBe('de')
  })
})
