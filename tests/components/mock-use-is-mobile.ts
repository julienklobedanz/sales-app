import { vi } from 'vitest'

const state = vi.hoisted(() => ({ isMobile: false }))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => state.isMobile,
}))

export function setIsMobile(value: boolean) {
  state.isMobile = value
}
