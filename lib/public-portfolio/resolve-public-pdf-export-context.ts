import 'server-only'

import type { PdfOrgBranding } from '@/lib/evidence/pdf/types'
import type { PublicPortfolioBranding } from '@/app/p/actions'
import {
  parsePdfExportSettings,
  type PdfExportSettings,
} from '@/lib/references/pdf-export-settings'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export type PublicPdfExportContext = {
  branding: PdfOrgBranding
  exportSettings: PdfExportSettings
}

const DEFAULT_BRANDING: PdfOrgBranding = {
  name: 'RefStack',
  logo_url: null,
  primary_color: '#2563EB',
  secondary_color: '#1D4ED8',
}

export async function resolvePublicPdfExportContext(
  branding: PublicPortfolioBranding,
  referenceId: string | null,
  allowedReferenceIds: string[]
): Promise<PublicPdfExportContext> {
  const baseBranding: PdfOrgBranding = branding.found
    ? {
        name: branding.name,
        logo_url: branding.logo_url,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
      }
    : DEFAULT_BRANDING

  if (!referenceId || !allowedReferenceIds.includes(referenceId)) {
    return { branding: baseBranding, exportSettings: {} }
  }

  // Service-Role weil: öffentlicher PDF-Export ohne Login; RLS blockiert Org-Branding.
  // Grenze: referenceId muss in der freigeschalteten Portfolio-Liste (Token-RPC) enthalten sein.
  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return { branding: baseBranding, exportSettings: {} }
  }

  const { data: row } = await admin
    .from('references')
    .select('organization_id, organizations ( export_settings, logo_url, name, primary_color, secondary_color )')
    .eq('id', referenceId)
    .maybeSingle()

  const org = Array.isArray(row?.organizations) ? row.organizations[0] : row?.organizations
  const exportSettings = parsePdfExportSettings(org?.export_settings)

  const resolvedBranding: PdfOrgBranding = {
    name: org?.name ?? baseBranding.name,
    logo_url: baseBranding.logo_url ?? org?.logo_url ?? null,
    primary_color: org?.primary_color ?? baseBranding.primary_color,
    secondary_color: org?.secondary_color ?? baseBranding.secondary_color,
  }

  if (exportSettings.pdf_logo_enabled === false) {
    resolvedBranding.logo_url = null
  }

  return {
    branding: resolvedBranding,
    exportSettings,
  }
}
