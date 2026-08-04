'use client'

import { useEffect, useRef } from 'react'

import type { RegisterSettingsTab, SettingsTabHandlers, SettingsTabId } from './settings-tab-shared'

export function useRegisterSettingsTab(
  tabId: SettingsTabId,
  handlers: SettingsTabHandlers,
  register: RegisterSettingsTab,
  partKey = 'default'
) {
  const { dirty, pending, save } = handlers
  const saveRef = useRef(save)

  useEffect(() => {
    saveRef.current = save
  }, [save])

  useEffect(() => {
    register(
      tabId,
      {
        dirty,
        pending,
        save: () => saveRef.current(),
      },
      partKey
    )
    return () => register(tabId, null, partKey)
  }, [tabId, dirty, pending, register, partKey])
}
