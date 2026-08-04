'use client'

import { useEffect, useState } from 'react'

/** True after the first client commit — avoids Radix useId mismatches during hydration. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    // Intentional hydration gate: flip after first client commit.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration gate
    setHydrated(true)
  }, [])
  return hydrated
}
