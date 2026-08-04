'use client'

import { useEffect, useRef } from 'react'

const HEARTBEAT_MS = 15_000

export function PortfolioSessionTracker({
  slug,
  recipientToken,
}: {
  slug: string
  recipientToken?: string | null
}) {
  const sessionIdRef = useRef<string | null>(null)
  const lastTickRef = useRef(0)
  const visibleRef = useRef(true)

  useEffect(() => {
    lastTickRef.current = Date.now()
  }, [])

  useEffect(() => {
    function onVis() {
      visibleRef.current = document.visibilityState === 'visible'
      lastTickRef.current = Date.now()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    async function pulse(isFinal = false) {
      if (!visibleRef.current && !isFinal) {
        lastTickRef.current = Date.now()
        return
      }
      const now = Date.now()
      const deltaSec = Math.max(0, Math.round((now - lastTickRef.current) / 1000))
      lastTickRef.current = now
      if (deltaSec === 0 && !isFinal && sessionIdRef.current) return

      try {
        const res = await fetch('/api/public-portfolio/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            sessionId: sessionIdRef.current,
            recipientToken: recipientToken ?? null,
            activeSecondsDelta: deltaSec,
          }),
          keepalive: isFinal,
        })
        if (!res.ok) return
        const json = (await res.json()) as { sessionId?: string }
        if (json.sessionId) sessionIdRef.current = json.sessionId
      } catch {
        /* non-blocking */
      }
    }

    void pulse(true)
    const id = window.setInterval(() => void pulse(false), HEARTBEAT_MS)
    const onLeave = () => void pulse(true)
    window.addEventListener('pagehide', onLeave)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('pagehide', onLeave)
      void pulse(true)
    }
  }, [slug, recipientToken])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return
      const href = anchor.getAttribute('href') ?? ''
      if (!href || href.startsWith('#')) return
      void fetch('/api/public-portfolio/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          sessionId: sessionIdRef.current,
          recipientToken: recipientToken ?? null,
          activeSecondsDelta: 0,
          eventType: 'link_click',
          eventPayload: { href },
        }),
        keepalive: true,
      }).catch(() => {})
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [slug, recipientToken])

  return null
}
