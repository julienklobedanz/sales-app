import { describe, expect, it } from 'vitest'
import { resolveSettingsTabId } from './settings-tab-shared'

describe('resolveSettingsTabId', () => {
  it('maps legacy tabs onto the 3-tab IA', () => {
    expect(resolveSettingsTabId('team')).toBe('workspace')
    expect(resolveSettingsTabId('roles')).toBe('workspace')
    expect(resolveSettingsTabId('admin')).toBe('process')
    expect(resolveSettingsTabId('workflow')).toBe('process')
    expect(resolveSettingsTabId('integrations')).toBe('workspace')
    expect(resolveSettingsTabId('profile')).toBe('profile')
  })

  it('returns null for unknown', () => {
    expect(resolveSettingsTabId('nope')).toBeNull()
    expect(resolveSettingsTabId(null)).toBeNull()
  })
})
