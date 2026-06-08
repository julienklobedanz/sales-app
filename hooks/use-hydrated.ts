'use client'

import { useEffect, useState } from 'react'

/** True after the first client commit — avoids Radix useId mismatches during hydration. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  return hydrated
}
