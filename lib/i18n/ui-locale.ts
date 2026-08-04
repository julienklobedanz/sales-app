export const UI_LOCALES = ['de', 'en'] as const

export type UiLocale = (typeof UI_LOCALES)[number]

export const UI_LOCALE_COOKIE = 'refstack_ui_locale'

export function normalizeUiLocale(raw: string | null | undefined): UiLocale {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'en' || s === 'en-us' || s === 'en-gb' || s === 'english') return 'en'
  return 'de'
}

export function uiLocaleFromApiSettings(raw: unknown): UiLocale {
  if (!raw || typeof raw !== 'object') return 'de'
  const obj = raw as Record<string, unknown>
  return normalizeUiLocale(typeof obj.ui_locale === 'string' ? obj.ui_locale : null)
}

export function uiLocaleLabel(locale: UiLocale): string {
  return locale === 'en' ? 'Englisch' : 'Deutsch'
}
