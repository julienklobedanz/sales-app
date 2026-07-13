'use client'

import { useEffect } from 'react'

/**
 * Auth-Seiten visuell immer in Light Mode — ohne localStorage-Theme zu überschreiben.
 * Beim Verlassen (Login → Dashboard) wird die gespeicherte Präferenz wieder angewendet.
 */
export function AuthThemeScope({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    let stored: string | null = null
    try {
      stored = localStorage.getItem('theme')
    } catch {
      stored = null
    }

    root.classList.remove('dark')
    root.style.colorScheme = 'light'

    return () => {
      if (stored === 'dark') {
        root.classList.add('dark')
        root.style.colorScheme = 'dark'
      }
    }
  }, [])

  return children
}
