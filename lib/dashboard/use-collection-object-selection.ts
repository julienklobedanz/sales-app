'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function buildCollectionObjectUrl(
  pathname: string,
  searchParams: URLSearchParams,
  patch: Record<string, string | null>,
): string {
  const next = new URLSearchParams(searchParams)
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) next.delete(key)
    else next.set(key, value)
  }
  const qs = next.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function resolveCollectionObjectSelection<T extends { id: string }>(
  items: readonly T[],
  selectedId: string | null,
): { selected: T | null; invalidId: boolean } {
  if (!selectedId) return { selected: null, invalidId: false }
  const selected = items.find((item) => item.id === selectedId) ?? null
  return {
    selected,
    invalidId: selected == null && items.length > 0,
  }
}

export function useCollectionObjectSelection<T extends { id: string }>(args: {
  items: readonly T[]
  autoSelect?: boolean
  paramKey?: string
}) {
  const paramKey = args.paramKey ?? 'id'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get(paramKey)
  const { selected, invalidId } = resolveCollectionObjectSelection(
    args.items,
    selectedId,
  )

  useEffect(() => {
    if (!invalidId) return
    router.replace(
      buildCollectionObjectUrl(pathname, searchParams, { [paramKey]: null }),
    )
  }, [invalidId, router, pathname, searchParams, paramKey])

  useEffect(() => {
    if (!args.autoSelect) return
    if (selectedId) return
    if (args.items.length === 0) return
    const first = args.items[0]
    if (!first?.id) return
    router.replace(
      buildCollectionObjectUrl(pathname, searchParams, { [paramKey]: first.id }),
    )
  }, [args.autoSelect, args.items, selectedId, router, pathname, searchParams, paramKey])

  return {
    selectedId,
    selected,
    hrefFor(id: string) {
      return buildCollectionObjectUrl(pathname, searchParams, { [paramKey]: id })
    },
    clearSelection() {
      router.push(
        buildCollectionObjectUrl(pathname, searchParams, { [paramKey]: null }),
      )
    },
  }
}
