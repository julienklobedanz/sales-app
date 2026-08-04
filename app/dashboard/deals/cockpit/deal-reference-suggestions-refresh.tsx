'use client'

import { createContext, useContext, type ReactNode } from 'react'

const DealReferenceSuggestionsRefreshContext = createContext<(() => void) | undefined>(
  undefined,
)

export function DealReferenceSuggestionsRefreshProvider({
  refresh,
  children,
}: {
  refresh: () => void
  children: ReactNode
}) {
  return (
    <DealReferenceSuggestionsRefreshContext.Provider value={refresh}>
      {children}
    </DealReferenceSuggestionsRefreshContext.Provider>
  )
}

export function useDealReferenceSuggestionsRefresh() {
  return useContext(DealReferenceSuggestionsRefreshContext)
}
