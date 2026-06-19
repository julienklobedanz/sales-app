export type EvidenceLibraryMode = 'references' | 'certificates'

export const EVIDENCE_LIBRARY_MODE_STORAGE_KEY = 'evidence-library-mode-v1'

/** Gleichrangige Proof-Segmente im Evidence-Hub (C6). */
export const EVIDENCE_PROOF_SEGMENT_LABELS: Record<EvidenceLibraryMode, string> = {
  references: 'Kundenreferenz',
  certificates: 'Unternehmensnachweis',
}

export const EVIDENCE_PROOF_SEGMENT_DESCRIPTIONS: Record<EvidenceLibraryMode, string> = {
  references: 'Projekt- und Kundenreferenzen für Sales und Matching',
  certificates: 'Compliance-Dokumente, Zertifikate und Unternehmensnachweise',
}

export function evidenceLibraryTitle(mode: EvidenceLibraryMode): string {
  return EVIDENCE_PROOF_SEGMENT_LABELS[mode]
}

export function loadEvidenceLibraryModeFromStorage(): EvidenceLibraryMode {
  if (typeof window === 'undefined') return 'references'
  try {
    const raw = localStorage.getItem(EVIDENCE_LIBRARY_MODE_STORAGE_KEY)
    return raw === 'certificates' ? 'certificates' : 'references'
  } catch {
    return 'references'
  }
}
