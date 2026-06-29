import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  getPublicPortfolio,
  getPublicPortfolioBranding,
} from '@/app/p/actions'
import {
  ReferencePdfBundleDocument,
  ReferencePdfDocument,
} from '@/lib/references/library/pdf/template'
import { mapPublicReferenceToPdfReference } from '@/lib/public-portfolio/map-public-reference-to-pdf'
import { resolvePublicPdfExportContext } from '@/lib/public-portfolio/resolve-public-pdf-export-context'
import { resolvePdfTemplate } from '@/lib/references/pdf-export-settings'

export const runtime = 'nodejs'

function sanitizeFileName(text: string): string {
  return text
    .trim()
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  if (!slug) {
    return NextResponse.json({ error: 'slug fehlt.' }, { status: 400 })
  }

  const result = await getPublicPortfolio(slug)
  if (!result.found || result.references.length === 0) {
    return NextResponse.json({ error: 'Nicht verfügbar.' }, { status: 404 })
  }

  const branding = await getPublicPortfolioBranding(slug)
  const firstReferenceId = result.references[0]?.id ?? null
  const { branding: pdfBranding, exportSettings } = await resolvePublicPdfExportContext(
    branding,
    firstReferenceId,
    result.references.map((r) => r.id)
  )

  const template = resolvePdfTemplate(req.nextUrl.searchParams.get('template'), exportSettings)
  const references = result.references.map(mapPublicReferenceToPdfReference)
  const exportedAtLabel = new Date().toLocaleDateString('de-DE', { dateStyle: 'long' })

  const buffer =
    references.length === 1
      ? await renderToBuffer(
          ReferencePdfDocument({
            reference: references[0]!,
            org: pdfBranding,
            template,
            exportedAtLabel,
          })
        )
      : await renderToBuffer(
          ReferencePdfBundleDocument({
            references,
            org: pdfBranding,
            template,
            exportedAtLabel,
          })
        )

  const fileName =
    references.length === 1
      ? `${sanitizeFileName(references[0]!.company_name || 'Account')}_${sanitizeFileName(references[0]!.title || 'Referenz')}_RefStack.pdf`
      : `${sanitizeFileName(pdfBranding.name)}_Portfolio_${references.length}.pdf`

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
