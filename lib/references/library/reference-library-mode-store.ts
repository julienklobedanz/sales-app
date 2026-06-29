'use client'

import { useSyncExternalStore } from 'react'

import {
  type ReferenceLibraryMode,
  loadReferenceLibraryModeFromStorage,
} from '@/lib/references/library/reference-library-mode'

let current: ReferenceLibraryMode = 'references'
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  listeners.forEach((l) => l())
}

export function setReferenceLibraryModeOptimistic(mode: ReferenceLibraryMode) {
  if (current === mode) return
  current = mode
  emit()
}

export function syncReferenceLibraryModeFromStorage(mode?: ReferenceLibraryMode) {
  const next = mode ?? loadReferenceLibraryModeFromStorage()
  if (current === next) return
  current = next
  emit()
}

export function useReferenceLibraryMode(): ReferenceLibraryMode {
  return useSyncExternalStore(subscribe, () => current, () => current)
}
