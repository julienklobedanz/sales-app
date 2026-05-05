import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  getPublicPortfolio,
  getPublicPortfolioBranding,
  getPublicPortfolioShareOwner,
} from '@/app/p/actions'
import { PublicPortfolioOnePagerDocument } from '@/app/p/pdf/public-portfolio-one-pager'

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
  if (!result.found) {
    return NextResponse.json({ error: 'Nicht verfügbar.' }, { status: 404 })
  }

  const branding = await getPublicPortfolioBranding(slug)
  const shareOwner = await getPublicPortfolioShareOwner(slug)

  const workspaceName = branding.found ? branding.name : 'RefStack Workspace'
  const primaryColor = branding.found ? branding.primary_color : '#2563EB'

  const singleTitle =
    result.references.length === 1 ? (result.references[0]?.title ?? null) : null
  const headerCountry =
    result.references.length === 1
      ? (result.references[0]?.country?.trim() ? result.references[0].country.trim() : null)
      : null
  const countrySuffix = headerCountry ? ` - (${headerCountry})` : ''
  const headerSubtitle = singleTitle
    ? `Projektdetails ${workspaceName} - ${singleTitle}${countrySuffix}`
    : `Projektdetails ${workspaceName}${countrySuffix}`

  const contactName = shareOwner.found ? shareOwner.name : 'RefStack Team'
  const contactRole = shareOwner.found ? shareOwner.position : 'Ansprechpartner'
  const contactEmail = shareOwner.found ? shareOwner.email : null
  const contactPhone = shareOwner.found ? shareOwner.phone : null
  const contactBits = [contactName, contactRole, contactEmail, contactPhone].filter(Boolean)
  const contactLine = `Kontakt: ${contactBits.join(' · ')}`

  const buffer = await renderToBuffer(
    <PublicPortfolioOnePagerDocument
      workspaceName={workspaceName}
      headerSubtitle={headerSubtitle}
      primaryColor={primaryColor}
      references={result.references}
      contactLine={contactLine}
    />
  )

  const titlePart = singleTitle ? sanitizeFileName(singleTitle) : 'referenzportfolio'
  const filename = `${titlePart}_RefStack.pdf`

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
