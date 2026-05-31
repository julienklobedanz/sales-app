'use client'

import { useSyncExternalStore } from 'react'

import type { AccountsListView } from '@/lib/accounts/accounts-list-view'

let current: AccountsListView = 'account'
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  listeners.forEach((l) => l())
}

/** Sofortige UI-Aktualisierung (Header, Toggle) vor Abschluss von router.replace. */
export function setAccountsListViewOptimistic(view: AccountsListView) {
  if (current === view) return
  current = view
  emit()
}

/** Nach Navigation / URL-Änderung mit Router-State abgleichen. */
export function syncAccountsListViewFromUrl(view: AccountsListView) {
  if (current === view) return
  current = view
  emit()
}

export function useAccountsListView(): AccountsListView {
  return useSyncExternalStore(subscribe, () => current, () => current)
}
