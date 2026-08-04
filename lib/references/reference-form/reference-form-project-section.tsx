'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CONTRACT_TYPE_GROUPS,
  CONTRACT_TYPE_VALUES,
  formatContractTypeDisplay,
} from '@/lib/references/contract-type'
import {
  PROJECT_STATUS_OPTIONS,
  VOLUME_CURRENCY_OPTIONS,
} from '@/lib/references/reference-form/reference-form-constants'
import {
  RequiredLabel,
  OptionalLabel,
} from '@/lib/references/reference-form/reference-form-labels'
import type { ReferenceFormViewModel } from '@/lib/references/reference-form/use-reference-form'

export type ReferenceFormProjectSectionProps = Pick<
  ReferenceFormViewModel,
  | 'submitting'
  | 'volumeEur'
  | 'setVolumeEur'
  | 'volumeCurrency'
  | 'setVolumeCurrency'
  | 'contractType'
  | 'setContractType'
  | 'projectStatus'
  | 'setProjectStatus'
  | 'projectStart'
  | 'setProjectStart'
  | 'projectEnd'
  | 'setProjectEnd'
>

export function ReferenceFormProjectSection({
  submitting,
  volumeEur,
  setVolumeEur,
  volumeCurrency,
  setVolumeCurrency,
  contractType,
  setContractType,
  projectStatus,
  setProjectStatus,
  projectStart,
  setProjectStart,
  projectEnd,
  setProjectEnd,
}: ReferenceFormProjectSectionProps) {
  const volumeBlock = (
    <div className="space-y-2">
      <OptionalLabel htmlFor="volume_eur">Volumen</OptionalLabel>
      <div className="flex min-w-0 max-w-full items-center gap-2">
        <Input
          id="volume_eur"
          name="volume_eur"
          type="text"
          inputMode="numeric"
          placeholder="z. B. 5.000.000"
          disabled={submitting}
          className="min-w-0 flex-1 sm:max-w-none"
          value={volumeEur}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '')
            if (!digits) {
              setVolumeEur('')
              return
            }
            const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
            setVolumeEur(withSeparators)
          }}
        />
        <Select
          value={volumeCurrency}
          onValueChange={setVolumeCurrency}
          disabled={submitting}
        >
          <SelectTrigger
            className="h-10 w-[104px] shrink-0 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
            aria-label="Währung wählen"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOLUME_CURRENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                {opt.symbol} ({opt.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const contractBlock = (
    <div className="space-y-2">
      <OptionalLabel htmlFor="contract_type">Vertragsart</OptionalLabel>
      <input type="hidden" name="contract_type" value={contractType} />
      <Select
        value={contractType || undefined}
        onValueChange={setContractType}
        disabled={submitting}
      >
        <SelectTrigger id="contract_type" className="w-full">
          <SelectValue placeholder="Auswählen …" />
        </SelectTrigger>
        <SelectContent>
          {CONTRACT_TYPE_GROUPS.map((group, groupIndex) => (
            <div key={group.label}>
              <SelectGroup>
                <SelectLabel>{group.label}</SelectLabel>
                {group.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectGroup>
              {groupIndex < CONTRACT_TYPE_GROUPS.length - 1 ? <SelectSeparator /> : null}
            </div>
          ))}
          {contractType && !CONTRACT_TYPE_VALUES.includes(contractType) ? (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Bestehender Wert</SelectLabel>
                <SelectItem value={contractType}>
                  {formatContractTypeDisplay(contractType)}
                </SelectItem>
              </SelectGroup>
            </>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <>
      <div className="space-y-2">
        <RequiredLabel htmlFor="project_status">Projektstatus</RequiredLabel>
        <input
          type="hidden"
          name="project_status"
          value={projectStatus === '__none__' ? '' : projectStatus}
        />
        <Select
          value={projectStatus || '__none__'}
          onValueChange={(val) => {
            setProjectStatus(val)
            if (val === 'active') setProjectEnd('')
          }}
          disabled={submitting}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auswählen …" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <RequiredLabel htmlFor="project_start">Projektstart</RequiredLabel>
          <Input
            id="project_start"
            name="project_start"
            type="date"
            disabled={submitting}
            value={projectStart}
            onChange={(e) => setProjectStart(e.target.value)}
          />
        </div>
        {projectStatus === 'active' ? (
          volumeBlock
        ) : (
          <div className="space-y-2">
            {projectStatus === 'completed' ? (
              <RequiredLabel htmlFor="project_end">Projektende</RequiredLabel>
            ) : (
              <OptionalLabel htmlFor="project_end">Projektende</OptionalLabel>
            )}
            <Input
              id="project_end"
              name="project_end"
              type="date"
              disabled={submitting}
              value={projectEnd}
              onChange={(e) => setProjectEnd(e.target.value)}
              required={projectStatus === 'completed'}
            />
            {projectStatus === 'completed' ? (
              <p className="text-muted-foreground text-[10px] italic">
                Erforderlich bei abgeschlossenem Projekt.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {projectStatus === 'active' ? (
        <div className="space-y-2">{contractBlock}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {volumeBlock}
          {contractBlock}
        </div>
      )}
    </>
  )
}
