'use server'

import { revalidatePath } from 'next/cache'

import {
  getSystemComplianceDocumentTypes,
  mergeComplianceDocumentTypeOptions,
  slugFromComplianceTypeLabel,
  type ComplianceDocumentTypeOption,
} from '@/lib/compliance/document-types'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ComplianceTypeAuth =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      orgId: string
      isAdmin: boolean
    }

async function getComplianceTypeAuth(): Promise<ComplianceTypeAuth> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return { error: 'Onboarding unvollständig.' }

  return {
    supabase,
    orgId: profile.organization_id,
    isAdmin: profile.role === 'admin',
  }
}

async function fetchCustomTypeRows(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string
) {
  const { data, error } = await supabase
    .from('organization_compliance_document_types')
    .select('id, slug, label')
    .eq('organization_id', orgId)
    .order('label', { ascending: true })

  if (error) {
    if ((error.message ?? '').includes('organization_compliance_document_types')) {
      return [] as Array<{ id: string; slug: string; label: string }>
    }
    throw new Error(error.message)
  }

  return (data ?? []) as Array<{ id: string; slug: string; label: string }>
}

export async function listComplianceDocumentTypeOptions(): Promise<
  { success: true; types: ComplianceDocumentTypeOption[] } | { success: false; error: string }
> {
  const auth = await getComplianceTypeAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  try {
    const custom = await fetchCustomTypeRows(auth.supabase, auth.orgId)
    return { success: true, types: mergeComplianceDocumentTypeOptions(custom) }
  } catch (e) {
    return {
      success: true,
      types: getSystemComplianceDocumentTypes(),
    }
  }
}

export async function createComplianceDocumentType(
  label: string
): Promise<
  { success: true; type: ComplianceDocumentTypeOption } | { success: false; error: string }
> {
  const auth = await getComplianceTypeAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.isAdmin) {
    return { success: false, error: 'Nur Admins dürfen Dokumenttypen verwalten.' }
  }

  const trimmed = label.trim()
  if (!trimmed) return { success: false, error: 'Bezeichnung ist erforderlich.' }

  let slug = slugFromComplianceTypeLabel(trimmed)
  const { data: existing } = await auth.supabase
    .from('organization_compliance_document_types')
    .select('slug')
    .eq('organization_id', auth.orgId)
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}_${Math.random().toString(36).slice(2, 7)}`
  }

  const { data, error } = await auth.supabase
    .from('organization_compliance_document_types')
    .insert({
      organization_id: auth.orgId,
      slug,
      label: trimmed,
    })
    .select('id, slug, label')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Typ konnte nicht angelegt werden.' }
  }

  revalidatePath(ROUTES.evidence.root)
  return {
    success: true,
    type: { id: data.id, slug: data.slug, label: data.label, isSystem: false },
  }
}

export async function updateComplianceDocumentType(
  id: string,
  label: string
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getComplianceTypeAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.isAdmin) {
    return { success: false, error: 'Nur Admins dürfen Dokumenttypen verwalten.' }
  }

  const trimmed = label.trim()
  if (!trimmed) return { success: false, error: 'Bezeichnung ist erforderlich.' }

  const { error } = await auth.supabase
    .from('organization_compliance_document_types')
    .update({ label: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.evidence.root)
  return { success: true }
}

export async function deleteComplianceDocumentType(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getComplianceTypeAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.isAdmin) {
    return { success: false, error: 'Nur Admins dürfen Dokumenttypen verwalten.' }
  }

  const { data: row } = await auth.supabase
    .from('organization_compliance_document_types')
    .select('slug')
    .eq('id', id)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (!row?.slug) return { success: false, error: 'Dokumenttyp nicht gefunden.' }

  const { count } = await auth.supabase
    .from('organization_compliance_documents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', auth.orgId)
    .eq('document_type', row.slug)

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: 'Typ wird noch von Zertifikaten verwendet und kann nicht gelöscht werden.',
    }
  }

  const { error } = await auth.supabase
    .from('organization_compliance_document_types')
    .delete()
    .eq('id', id)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.evidence.root)
  return { success: true }
}
