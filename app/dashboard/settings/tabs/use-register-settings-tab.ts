'use client'

import { useEffect } from 'react'

import type { RegisterSettingsTab, SettingsTabHandlers, SettingsTabId } from './settings-tab-shared'

export function useRegisterSettingsTab(
  tabId: SettingsTabId,
  handlers: SettingsTabHandlers,
  register: RegisterSettingsTab,
  partKey = 'default'
) {
  const { dirty, pending, save } = handlers

  useEffect(() => {
    register(tabId, { dirty, pending, save }, partKey)
    return () => register(tabId, null, partKey)
  }, [tabId, dirty, pending, save, register, partKey])
}
