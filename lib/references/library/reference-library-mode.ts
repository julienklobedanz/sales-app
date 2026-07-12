export type ReferenceLibraryMode = 'references' | 'certificates'

export const REFERENCE_LIBRARY_MODE_STORAGE_KEY = 'evidence-library-mode-v1'

/** Kurzlabels für Top-Bar, Segment-Switch und CTAs. */
export const REFERENCE_PROOF_SEGMENT_LABELS: Record<ReferenceLibraryMode, string> = {
  references: 'Referenzen',
  certificates: 'Nachweise',
}

export const REFERENCE_PROOF_SEGMENT_DESCRIPTIONS: Record<ReferenceLibraryMode, string> = {
  references: 'Projekt- und Kundenreferenzen für Sales und Matching',
  certificates: 'Compliance-Dokumente, Zertifikate und Unternehmensnachweise',
}

export function referenceLibraryTitle(mode: ReferenceLibraryMode): string {
  return REFERENCE_PROOF_SEGMENT_LABELS[mode]
}

export function loadReferenceLibraryModeFromStorage(): ReferenceLibraryMode {
  if (typeof window === 'undefined') return 'references'
  try {
    const raw = localStorage.getItem(REFERENCE_LIBRARY_MODE_STORAGE_KEY)
    return raw === 'certificates' ? 'certificates' : 'references'
  } catch {
    return 'references'
  }
}
