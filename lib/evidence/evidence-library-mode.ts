export type EvidenceLibraryMode = 'references' | 'certificates'

export const EVIDENCE_LIBRARY_MODE_STORAGE_KEY = 'evidence-library-mode-v1'

export function evidenceLibraryTitle(mode: EvidenceLibraryMode): string {
  return mode === 'certificates' ? 'Zertifikate & Dokumente' : 'Referenzen'
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
