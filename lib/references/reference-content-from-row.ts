import { formatUsabilityStatement } from '@/lib/references/reference-approval-display'
import type { ReferenceContentFile } from '@/lib/references/reference-content-fields'
import type { ReferenceAssetRow } from '@/lib/references/library/assets'

function publicReferenceFileUrl(publicBase: string, path: string) {
  return `${publicBase}/storage/v1/object/public/references/${path}`
}

export function usabilityFromReference(ref: {
  status: string
  customer_approval_status?: string | null
  approval_internal_status?: string | null
  approval_requested_at?: string | null
  approval_scope_named_mention?: boolean | null
  approval_scope_anonymous_mention?: boolean | null
  is_nda_deal?: boolean | null
  approval_competitor_blacklist?: readonly string[] | null
}) {
  return formatUsabilityStatement({
    referenceStatus: ref.status,
    customerApprovalStatus: ref.customer_approval_status,
    internalApprovalStatus: ref.approval_internal_status,
    approvalRequestedAt: ref.approval_requested_at,
    approvalScopeNamedMention: ref.approval_scope_named_mention,
    approvalScopeAnonymousMention: ref.approval_scope_anonymous_mention,
    isNdaDeal: ref.is_nda_deal,
    competitorBlacklist: ref.approval_competitor_blacklist,
  })
}

export function contentFilesFromAssets(input: {
  assets: ReferenceAssetRow[]
  legacyFilePath?: string | null
  publicBase?: string
}): ReferenceContentFile[] {
  const publicBase =
    input.publicBase ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
  const files: ReferenceContentFile[] = input.assets.map((asset) => ({
    key: asset.id,
    assetId: asset.id,
    name: asset.file_name || asset.file_path.split('/').pop() || 'Dokument',
    href: publicBase ? publicReferenceFileUrl(publicBase, asset.file_path) : null,
    category: asset.category,
    createdAt: asset.created_at,
  }))
  const legacy = (input.legacyFilePath ?? '').trim()
  if (legacy && !input.assets.some((asset) => asset.file_path === legacy)) {
    files.unshift({
      key: `legacy-${legacy}`,
      name: legacy.split('/').pop() || 'Dokument',
      href: publicBase ? publicReferenceFileUrl(publicBase, legacy) : null,
      category: 'other',
      createdAt: null,
    })
  }
  return files
}
