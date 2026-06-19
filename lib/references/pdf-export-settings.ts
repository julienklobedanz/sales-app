import type { PdfTemplate } from '@/lib/evidence/pdf/types'

export type PdfExportSettings = {
  pdf_layout?: PdfTemplate
  pdf_logo_enabled?: boolean
}

export function parsePdfTemplateParam(raw: string | null): PdfTemplate | null {
  if (raw === 'detail' || raw === 'anonymized' || raw === 'one_pager') return raw
  return null
}

export function parsePdfExportSettings(raw: unknown): PdfExportSettings {
  if (!raw || typeof raw !== 'object') return {}
  const obj = raw as Record<string, unknown>
  const layout = obj.pdf_layout
  const logo = obj.pdf_logo_enabled
  return {
    pdf_layout:
      layout === 'detail' || layout === 'anonymized' || layout === 'one_pager'
        ? (layout as PdfTemplate)
        : undefined,
    pdf_logo_enabled: typeof logo === 'boolean' ? logo : undefined,
  }
}

export function resolvePdfTemplate(
  templateParam: string | null,
  exportSettings: PdfExportSettings
): PdfTemplate {
  const fromParam = parsePdfTemplateParam(templateParam)
  if (fromParam) return fromParam
  return exportSettings.pdf_layout ?? 'one_pager'
}
