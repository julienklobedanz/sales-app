'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Hinweis } from '@/components/ui/hinweis'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { COPY } from '@/lib/copy'
import type { CapabilityProfile } from '@/lib/organizations/capability-profile-types'
import type { IcpDefinition } from '@/lib/deals/icp-rubric'

import { updateOrgCapabilitySettings } from './settings-consolidation-actions'

function rolesToText(roles: CapabilityProfile['certifiedRoles']): string {
  if (!roles?.length) return ''
  return roles.map((r) => `${r.role}:${r.count}`).join('\n')
}

function textToRoles(raw: string): CapabilityProfile['certifiedRoles'] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const out: NonNullable<CapabilityProfile['certifiedRoles']> = []
  for (const line of lines) {
    const [role, countRaw] = line.split(':')
    const count = Number(countRaw)
    if (role?.trim() && Number.isFinite(count) && count > 0) {
      out.push({ role: role.trim(), count: Math.trunc(count) })
    }
  }
  return out.length ? out : undefined
}

type SettingsCapabilityProfileProps = {
  initialProfile: CapabilityProfile
  initialIcp: IcpDefinition
  canEdit: boolean
  compact?: boolean
}

export function SettingsCapabilityProfile({
  initialProfile,
  initialIcp,
  canEdit,
  compact = false,
}: SettingsCapabilityProfileProps) {
  const [employeeCount, setEmployeeCount] = useState(
    initialProfile.employeeCount != null ? String(initialProfile.employeeCount) : '',
  )
  const [annualRevenueMio, setAnnualRevenueMio] = useState(
    initialProfile.annualRevenueEur != null
      ? String(Math.round(initialProfile.annualRevenueEur / 1_000_000))
      : '',
  )
  const [regions, setRegions] = useState(initialProfile.regions?.join(', ') ?? '')
  const [certifiedRoles, setCertifiedRoles] = useState(
    rolesToText(initialProfile.certifiedRoles),
  )
  const [icpIndustry, setIcpIndustry] = useState(initialIcp.industry ?? '')
  const [icpVolume, setIcpVolume] = useState(initialIcp.volumeBand ?? '')
  const [icpRegion, setIcpRegion] = useState(initialIcp.region ?? '')
  const [icpAccountSize, setIcpAccountSize] = useState(initialIcp.accountSize ?? '')
  const [icpSegment, setIcpSegment] = useState(initialIcp.segment ?? '')
  const [pending, startTransition] = useTransition()

  function buildPayload() {
    const profile: CapabilityProfile = {}
    const emp = Number(employeeCount)
    if (Number.isFinite(emp) && emp > 0) profile.employeeCount = Math.trunc(emp)
    const revMio = Number(annualRevenueMio)
    if (Number.isFinite(revMio) && revMio > 0) {
      profile.annualRevenueEur = Math.round(revMio * 1_000_000)
    }
    const regionList = regions
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
    if (regionList.length) profile.regions = regionList
    const roles = textToRoles(certifiedRoles)
    if (roles) profile.certifiedRoles = roles

    const icpDefinition: IcpDefinition = {}
    if (icpIndustry.trim()) icpDefinition.industry = icpIndustry.trim()
    if (icpVolume.trim()) icpDefinition.volumeBand = icpVolume.trim()
    if (icpRegion.trim()) icpDefinition.region = icpRegion.trim()
    if (icpAccountSize.trim()) icpDefinition.accountSize = icpAccountSize.trim()
    if (icpSegment.trim()) icpDefinition.segment = icpSegment.trim()

    return { capabilityProfile: profile, icpDefinition }
  }

  function save() {
    startTransition(async () => {
      const result = await updateOrgCapabilitySettings(buildPayload())
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(COPY.settings.capabilityProfile.saved)
    })
  }

  const emptyProfile =
    !employeeCount.trim() &&
    !annualRevenueMio.trim() &&
    !regions.trim() &&
    !certifiedRoles.trim()

  return (
    <Card className={compact ? undefined : 'p-6'}>
      <CardHeader
        className={compact ? 'space-y-1 px-0 pt-0 pb-0' : 'space-y-2 px-0 pt-0'}
      >
        <CardTitle className={compact ? 'text-sm font-semibold' : 'text-base'}>
          {COPY.settings.capabilityProfile.title}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {COPY.settings.capabilityProfile.description}
        </CardDescription>
      </CardHeader>
      <CardContent
        className={compact ? 'space-y-3 px-0 pb-0 pt-2' : 'space-y-6 px-0 pb-0 pt-1'}
      >
        {emptyProfile ? (
          <Hinweis tone="warning" className="px-3 py-2 text-sm">
            {COPY.settings.capabilityProfile.emptyHint}
          </Hinweis>
        ) : null}

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cap-employee-count" className="text-xs">
              {COPY.settings.capabilityProfile.employeeCount}
            </Label>
            <Input
              id="cap-employee-count"
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
              inputMode="numeric"
              disabled={!canEdit}
              placeholder="z. B. 500"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cap-revenue" className="text-xs">
              {COPY.settings.capabilityProfile.annualRevenue}
            </Label>
            <Input
              id="cap-revenue"
              value={annualRevenueMio}
              onChange={(e) => setAnnualRevenueMio(e.target.value)}
              inputMode="decimal"
              disabled={!canEdit}
              placeholder="z. B. 50"
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="cap-regions" className="text-xs">
            {COPY.settings.capabilityProfile.regions}
          </Label>
          <Input
            id="cap-regions"
            value={regions}
            onChange={(e) => setRegions(e.target.value)}
            disabled={!canEdit}
            placeholder="DACH, Benelux"
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="cap-roles" className="text-xs">
            {COPY.settings.capabilityProfile.certifiedRoles}
          </Label>
          <Textarea
            id="cap-roles"
            value={certifiedRoles}
            onChange={(e) => setCertifiedRoles(e.target.value)}
            disabled={!canEdit}
            placeholder={'ISO 27001 Berater:12\nPRINCE2:5'}
            rows={compact ? 2 : 3}
          />
        </div>

        <div className="border-t border-border pt-3">
          <h3 className="mb-2 text-sm font-medium">
            {COPY.settings.capabilityProfile.icpTitle}
          </h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="icp-industry" className="text-xs">
                {COPY.settings.capabilityProfile.icpIndustry}
              </Label>
              <Input
                id="icp-industry"
                value={icpIndustry}
                onChange={(e) => setIcpIndustry(e.target.value)}
                disabled={!canEdit}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="icp-volume" className="text-xs">
                {COPY.settings.capabilityProfile.icpVolume}
              </Label>
              <Input
                id="icp-volume"
                value={icpVolume}
                onChange={(e) => setIcpVolume(e.target.value)}
                disabled={!canEdit}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="icp-region" className="text-xs">
                {COPY.settings.capabilityProfile.icpRegion}
              </Label>
              <Input
                id="icp-region"
                value={icpRegion}
                onChange={(e) => setIcpRegion(e.target.value)}
                disabled={!canEdit}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="icp-account" className="text-xs">
                {COPY.settings.capabilityProfile.icpAccountSize}
              </Label>
              <Input
                id="icp-account"
                value={icpAccountSize}
                onChange={(e) => setIcpAccountSize(e.target.value)}
                disabled={!canEdit}
                className="h-9"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="icp-segment" className="text-xs">
                {COPY.settings.capabilityProfile.icpSegment}
              </Label>
              <Input
                id="icp-segment"
                value={icpSegment}
                onChange={(e) => setIcpSegment(e.target.value)}
                disabled={!canEdit}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {canEdit ? (
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending
              ? COPY.settings.capabilityProfile.saving
              : COPY.settings.capabilityProfile.save}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            {COPY.settings.capabilityProfile.readOnly}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
