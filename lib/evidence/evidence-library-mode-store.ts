'use client'

import { useSyncExternalStore } from 'react'

import {
  type EvidenceLibraryMode,
  loadEvidenceLibraryModeFromStorage,
} from '@/lib/evidence/evidence-library-mode'

let current: EvidenceLibraryMode = 'references'
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  listeners.forEach((l) => l())
}

export function setEvidenceLibraryModeOptimistic(mode: EvidenceLibraryMode) {
  if (current === mode) return
  current = mode
  emit()
}

export function syncEvidenceLibraryModeFromStorage(mode?: EvidenceLibraryMode) {
  const next = mode ?? loadEvidenceLibraryModeFromStorage()
  if (current === next) return
  current = next
  emit()
}

export function useEvidenceLibraryMode(): EvidenceLibraryMode {
  return useSyncExternalStore(subscribe, () => current, () => current)
}
