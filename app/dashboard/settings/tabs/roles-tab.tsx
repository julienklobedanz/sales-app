'use client'

import { TabsContent } from '@/components/ui/tabs'
import type { RolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import { SettingsRolesPermissionsCard } from '../settings-roles-permissions-card'
import { SETTINGS_CARD_CLASS } from './settings-tab-shared'

type RolesTabProps = {
  isServerAdmin: boolean
  rolesPermissions: RolesPermissionsSettings
}

export function RolesTab({ isServerAdmin, rolesPermissions }: RolesTabProps) {
  if (!isServerAdmin) return null

  return (
    <TabsContent value="roles">
      <div className={SETTINGS_CARD_CLASS}>
        <SettingsRolesPermissionsCard initialSettings={rolesPermissions} />
      </div>
    </TabsContent>
  )
}
