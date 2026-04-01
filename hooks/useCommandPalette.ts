"use client"

import * as React from "react"

type Listener = () => void

let openState = false
const listeners = new Set<Listener>()

function setOpenState(next: boolean | ((prev: boolean) => boolean)) {
  const value = typeof next === "function" ? (next as (prev: boolean) => boolean)(openState) : next
  openState = value
  for (const l of listeners) l()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return openState
}

export function useCommandPalette() {
  const open = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const setOpen = React.useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => setOpenState(next),
    []
  )

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isK = event.key.toLowerCase() === "k"
      if (!isK) return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      setOpenState((v) => !v)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return { open, setOpen }
}

