'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckIcon } from '@/components/ui/check-icon'
import { toast } from 'sonner'
import { completeClientApproval } from './actions'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ApprovalOptionalLabel, ApprovalRequiredMark } from './approval-form-labels'

type ApprovalType = 'named' | 'anonymous'

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
      <p className="pr-6 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  )
}

export function ApprovalDecisionForm({
  token,
  referenceTitle,
  orgName,
  companyName,
  scopeNamedAvailable,
  scopeAnonymousAvailable,
  initialApprovedQuote = '',
  initialReferenceGiverName = '',
  initialReferenceGiverTitle = '',
}: {
  token: string
  referenceTitle: string
  orgName: string
  companyName?: string
  scopeNamedAvailable: boolean
  scopeAnonymousAvailable: boolean
  initialApprovedQuote?: string
  initialReferenceGiverName?: string
  initialReferenceGiverTitle?: string
}) {
  const defaultType: ApprovalType = scopeNamedAvailable ? 'named' : 'anonymous'
  const [approvalType, setApprovalType] = useState<ApprovalType>(defaultType)
  const [comment, setComment] = useState('')
  const [approvedQuote, setApprovedQuote] = useState(initialApprovedQuote)
  const [referenceGiverName, setReferenceGiverName] = useState(initialReferenceGiverName)
  const [referenceGiverTitle, setReferenceGiverTitle] = useState(initialReferenceGiverTitle)
  const [consentReferenceCalls, setConsentReferenceCalls] = useState(false)
  const [consentForwarding, setConsentForwarding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  const showScopeCards = scopeNamedAvailable || scopeAnonymousAvailable
  const workspaceLabel = orgName.trim() || 'unserem Partner'
  const canApprove = consentReferenceCalls && consentForwarding
  const isNamed = approvalType === 'named'

  async function submit(decision: 'approved' | 'rejected') {
    if (decision === 'approved') {
      if (!consentReferenceCalls || !consentForwarding) {
        toast.error('Bitte bestätigen Sie beide Einwilligungen vor der Freigabe.')
        return
      }
    }

    setLoading(true)
    try {
      const result = await completeClientApproval({
        token,
        decision,
        comment: comment.trim() || undefined,
        approvedQuote: isNamed ? approvedQuote.trim() || undefined : undefined,
        referenceGiverName: isNamed ? referenceGiverName.trim() || undefined : undefined,
        referenceGiverTitle: isNamed ? referenceGiverTitle.trim() || undefined : undefined,
      })
      if (!result.success) {
        if (result.error === 'already_decided') {
          toast.error('Diese Freigabe wurde bereits bearbeitet.')
        } else if (result.error === 'invalid_token') {
          toast.error('Dieser Link ist nicht mehr gültig.')
        } else {
          toast.error('Die Entscheidung konnte nicht gespeichert werden.')
        }
        return
      }
      setDone(decision)
    } catch {
      toast.error('Die Entscheidung konnte nicht gespeichert werden.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-lg font-semibold text-foreground">
          {done === 'approved'
            ? 'Vielen Dank — die Referenz wurde freigegeben.'
            : 'Vielen Dank — die Referenz wurde abgelehnt.'}
        </p>
        <p className="text-sm text-muted-foreground">
          Sie können dieses Fenster schließen. Der Ansprechpartner bei uns wurde informiert.
        </p>
        <p className="pt-2 text-xs text-muted-foreground">{referenceTitle}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showScopeCards ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Freigabe-Typ</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            {scopeNamedAvailable ? (
              <ScopeCard
                active={isNamed}
                disabled={loading}
                onClick={() => setApprovalType('named')}
                title="Namentliche Freigabe"
                description={`Inkl. Firmenname${companyName ? ` (${companyName})` : ''}`}
              />
            ) : null}
            {scopeAnonymousAvailable ? (
              <ScopeCard
                active={!isNamed}
                disabled={loading}
                onClick={() => setApprovalType('anonymous')}
                title="Anonymisierte Freigabe"
                description="Vollständig anonymisiert"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <ApprovalOptionalLabel htmlFor="approval-comment">
          Ihr Kommentar bzw. Ihre Änderungswünsche
        </ApprovalOptionalLabel>
        <Textarea
          id="approval-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Anmerkungen zur Freigabe …"
          className="min-h-[88px] resize-y"
          disabled={loading}
        />
      </div>

      <AnimatePresence initial={false}>
        {isNamed ? (
          <motion.div
            key="named-fields"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reference-giver-name">Name des Referenzgebers</Label>
                  <Input
                    id="reference-giver-name"
                    value={referenceGiverName}
                    onChange={(e) => setReferenceGiverName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference-giver-title">Ihre Position</Label>
                  <Input
                    id="reference-giver-title"
                    value={referenceGiverTitle}
                    onChange={(e) => setReferenceGiverTitle(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <ApprovalOptionalLabel htmlFor="approved-quote">Ihr Zitat</ApprovalOptionalLabel>
                <Textarea
                  id="approved-quote"
                  value={approvedQuote}
                  onChange={(e) => setApprovedQuote(e.target.value)}
                  rows={3}
                  placeholder="Zitat freigeben oder anpassen …"
                  disabled={loading}
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-reference-calls"
            checked={consentReferenceCalls}
            onCheckedChange={(checked) => setConsentReferenceCalls(checked === true)}
            disabled={loading}
            className="mt-0.5"
          />
          <Label
            htmlFor="consent-reference-calls"
            className="cursor-pointer text-xs leading-relaxed text-muted-foreground"
          >
            Hiermit stimme ich der Freigabe der Referenz zu und stehe für diese Referenz jederzeit für
            kurze Rückfragen anderer Kunden, die zukünftig ggf. mit {workspaceLabel} zusammenarbeiten.
            <ApprovalRequiredMark />
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-forwarding"
            checked={consentForwarding}
            onCheckedChange={(checked) => setConsentForwarding(checked === true)}
            disabled={loading}
            className="mt-0.5"
          />
          <Label
            htmlFor="consent-forwarding"
            className="cursor-pointer text-xs leading-relaxed text-muted-foreground"
          >
            Ich habe verstanden, dass meine freigegebene Referenz an mögliche Kunden von {workspaceLabel}{' '}
            weitergeleitet werden kann, es aber höchstwahrscheinlich nicht der Fall sein wird, dass jeder
            auch tatsächlich anruft.
            <ApprovalRequiredMark />
          </Label>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="default"
          className="h-11 w-full gap-2 text-base font-semibold"
          disabled={loading || !canApprove}
          onClick={() => void submit('approved')}
        >
          <CheckIcon className="size-[18px]" />
          Freigabe erteilen
        </Button>
        <Button
          type="button"
          variant="link"
          className="h-auto w-full text-destructive/80 hover:text-destructive"
          disabled={loading}
          onClick={() => void submit('rejected')}
        >
          Ablehnen
        </Button>
      </div>
    </div>
  )
}
