'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  REFERENCE_CALL_FREQUENCY_OPTIONS,
  type CustomerApprovalScopeSelection,
  type CustomerApprovalType,
  type ReferenceCallFrequency,
} from '@/lib/references/customer-approval-scope'

function ScopeCard({
  active,
  disabled,
  onClick,
  title,
  description,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative flex-1 rounded-xl border-2 p-4 text-left transition-all duration-200',
        active
          ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/10'
          : 'border-border bg-background hover:border-muted-foreground/30'
      )}
    >
      {active ? (
        <span className="absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
      <p className="pr-6 font-semibold text-sm text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  )
}

function ScopeSubOption({
  id,
  checked,
  disabled,
  title,
  description,
  onCheckedChange,
  children,
}: {
  id: string
  checked: boolean
  disabled: boolean
  title: string
  description: string
  onCheckedChange: (checked: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label htmlFor={id} className="cursor-pointer text-sm font-medium leading-snug text-foreground">
            {title}
          </Label>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export function ApprovalScopeOptions({
  scope,
  disabled,
  scopeNamedAvailable,
  scopeAnonymousAvailable,
  companyName,
  onChange,
}: {
  scope: CustomerApprovalScopeSelection
  disabled: boolean
  scopeNamedAvailable: boolean
  scopeAnonymousAvailable: boolean
  companyName?: string
  onChange: (next: CustomerApprovalScopeSelection) => void
}) {
  const showScopeCards = scopeNamedAvailable || scopeAnonymousAvailable
  const isNamed = scope.approvalType === 'named'

  function setApprovalType(type: CustomerApprovalType) {
    if (type === 'anonymous') {
      onChange({
        approvalType: 'anonymous',
        namentlichPublic: false,
        namentlichConfidential: false,
        referenceCallsEnabled: false,
        referenceCallFrequency: 'yearly',
      })
      return
    }
    onChange({ ...scope, approvalType: 'named' })
  }

  if (!showScopeCards) return null

  const namedSubtitle = companyName?.trim()
    ? `Firmenname (${companyName.trim()}) & Logo dürfen verwendet werden.`
    : 'Firmenname & Logo dürfen verwendet werden.'

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">Freigabe-Typ</p>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        {scopeNamedAvailable ? (
          <ScopeCard
            active={isNamed}
            disabled={disabled}
            onClick={() => setApprovalType('named')}
            title="Namentliche Freigabe"
            description={namedSubtitle}
          />
        ) : null}
        {scopeAnonymousAvailable ? (
          <ScopeCard
            active={!isNamed}
            disabled={disabled}
            onClick={() => setApprovalType('anonymous')}
            title="Anonymisierte Freigabe"
            description="Nur Branche & grobe Metriken werden gezeigt."
          />
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {isNamed ? (
          <motion.div
            key="named-sub-options"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 rounded-xl border border-border/50 bg-muted/40 p-4">
              <ScopeSubOption
                id="scope-public-marketing"
                checked={scope.namentlichPublic}
                disabled={disabled}
                title="Öffentliche Nutzung"
                description="Erlaubt die Nutzung des Logos meiner Firma, sowie der Case Study und meiner hier angegebenen Zitate auf Websites, in Präsentationen, auf Social Media, sowie Pressemitteilungen."
                onCheckedChange={(checked) => onChange({ ...scope, namentlichPublic: checked })}
              />
              <ScopeSubOption
                id="scope-confidential-sales"
                checked={scope.namentlichConfidential}
                disabled={disabled}
                title="Nicht-öffentliche Nutzung"
                description="Die Referenz darf ausschließlich in Gesprächen oder virtueller Kommunikation mit anderen Interessenten bzw. Neukunden unter NDA genutzt werden."
                onCheckedChange={(checked) => onChange({ ...scope, namentlichConfidential: checked })}
              />
              <ScopeSubOption
                id="scope-reference-calls"
                checked={scope.referenceCallsEnabled}
                disabled={disabled}
                title="Bereitschaft für Reference Calls"
                description="Wären Sie bereit, gelegentlich (z. B. 10–15 Min.) für einen kurzen Erfahrungsaustausch mit anderen Entscheidern zur Verfügung zu stehen?"
                onCheckedChange={(checked) =>
                  onChange({
                    ...scope,
                    referenceCallsEnabled: checked,
                    referenceCallFrequency: checked ? scope.referenceCallFrequency : 'yearly',
                  })
                }
              >
                <AnimatePresence initial={false}>
                  {scope.referenceCallsEnabled ? (
                    <motion.div
                      key="call-frequency"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden pl-7"
                    >
                      <Label
                        htmlFor="reference-call-frequency"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Maximale Häufigkeit:
                      </Label>
                      <Select
                        value={scope.referenceCallFrequency}
                        onValueChange={(value) =>
                          onChange({
                            ...scope,
                            referenceCallFrequency: value as ReferenceCallFrequency,
                          })
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger
                          id="reference-call-frequency"
                          size="sm"
                          className="mt-2 w-full max-w-[200px] text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REFERENCE_CALL_FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </ScopeSubOption>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
