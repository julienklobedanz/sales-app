'use client'

import { TabsContent } from '@/components/ui/tabs'
import { SettingsTeamCard } from '../settings-team-card'
import { SETTINGS_CARD_CLASS } from './settings-tab-shared'

type TeamTabProps = {
  teamMembers: Parameters<typeof SettingsTeamCard>[0]['initialMembers']
}

export function TeamTab({ teamMembers }: TeamTabProps) {
  return (
    <TabsContent value="team">
      <div className={SETTINGS_CARD_CLASS}>
        <SettingsTeamCard initialMembers={teamMembers} />
      </div>
    </TabsContent>
  )
}
