'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckIcon } from '@/components/ui/check-icon'
import { toast } from 'sonner'
import { completeClientApproval } from './actions'
import { Input } from '@/components/ui/input'
import { ApprovalOptionalLabel, ApprovalRequiredMark } from './approval-form-labels'
import { ApprovalScopeOptions } from './approval-scope-options'
import {
  defaultCustomerApprovalScope,
  type CustomerApprovalScopeSelection,
} from '@/lib/references/customer-approval-scope'

export function ApprovalDecisionForm({
  token,
  mode = 'pending',
  referenceTitle,
  orgName,
  companyName,
  scopeNamedAvailable,
  scopeAnonymousAvailable,
  initialApprovedQuote = '',
  initialComment = '',
  initialScope,
  initialReferenceGiverName = '',
  initialReferenceGiverTitle = '',
}: {
  token: string
  mode?: 'pending' | 'approved'
  referenceTitle: string
  orgName: string
  companyName?: string
  scopeNamedAvailable: boolean
  scopeAnonymousAvailable: boolean
  initialApprovedQuote?: string
  initialComment?: string
  initialScope?: CustomerApprovalScopeSelection
  initialReferenceGiverName?: string
  initialReferenceGiverTitle?: string
}) {
  const isApprovedMode = mode === 'approved'
  const defaultType = scopeNamedAvailable ? 'named' : 'anonymous'
  const [scope, setScope] = useState<CustomerApprovalScopeSelection>(
    () => initialScope ?? defaultCustomerApprovalScope(defaultType)
  )
  const [comment, setComment] = useState(initialComment)
  const [approvedQuote, setApprovedQuote] = useState(initialApprovedQuote)
  const [referenceGiverName, setReferenceGiverName] = useState(initialReferenceGiverName)
  const [referenceGiverTitle, setReferenceGiverTitle] = useState(initialReferenceGiverTitle)
  const [consentForwarding, setConsentForwarding] = useState(isApprovedMode)
  const [consentRelease, setConsentRelease] = useState(isApprovedMode)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'approved' | 'rejected' | 'updated' | null>(null)
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false)

  const workspaceLabel = orgName.trim() || 'unserem Partner'
  const isNamed = scope.approvalType === 'named'
  const canApprove = consentRelease && consentForwarding

  async function submit(decision: 'approved' | 'rejected') {
    if (decision === 'approved') {
      if (!consentRelease || !consentForwarding) {
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
        scope: decision === 'approved' ? scope : undefined,
      })
      if (!result.success) {
        if (result.error === 'already_decided') {
          toast.error('Diese Freigabe wurde bereits bearbeitet.')
        } else if (result.error === 'invalid_token') {
          toast.error('Dieser Link ist nicht mehr gültig.')
        } else if (result.error === 'server_config') {
          toast.error('Der Server ist nicht korrekt konfiguriert. Bitte wenden Sie sich an Ihren Ansprechpartner.')
        } else if (result.error === 'org_missing') {
          toast.error('Die Organisation zur Referenz konnte nicht ermittelt werden.')
        } else {
          toast.error('Die Entscheidung konnte nicht gespeichert werden.')
        }
        return
      }
      setConfirmationEmailSent(result.confirmationEmailSent === true)
      setDone(isApprovedMode ? 'updated' : decision)
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
          {done === 'updated'
            ? 'Ihre Änderungen wurden gespeichert.'
            : done === 'approved'
              ? 'Vielen Dank — die Referenz wurde freigegeben.'
              : 'Vielen Dank — die Referenz wurde abgelehnt.'}
        </p>
        <p className="text-sm text-muted-foreground">
          {done === 'updated' || done === 'approved'
            ? confirmationEmailSent
              ? 'Sie erhalten in Kürze eine Bestätigungs-E-Mail mit Ihrem persönlichen Freigabe- und Sperrlink.'
              : 'Der Ansprechpartner bei uns wurde informiert.'
            : 'Sie können dieses Fenster schließen. Der Ansprechpartner bei uns wurde informiert.'}
        </p>
        <p className="pt-2 text-xs text-muted-foreground">{referenceTitle}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ApprovalScopeOptions
        scope={scope}
        disabled={loading}
        scopeNamedAvailable={scopeNamedAvailable}
        scopeAnonymousAvailable={scopeAnonymousAvailable}
        companyName={companyName}
        onChange={setScope}
      />

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
            id="consent-release"
            checked={consentRelease}
            onCheckedChange={(checked) => setConsentRelease(checked === true)}
            disabled={loading}
            className="mt-0.5"
          />
          <Label
            htmlFor="consent-release"
            className="cursor-pointer text-xs leading-relaxed text-muted-foreground"
          >
            Hiermit stimme ich der Freigabe der Referenz gemäß meiner obigen Auswahl zu.
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
          {isApprovedMode ? 'Änderungen speichern' : 'Freigabe erteilen'}
        </Button>
        {!isApprovedMode ? (
          <Button
            type="button"
            variant="link"
            className="h-auto w-full text-destructive/80 hover:text-destructive"
            disabled={loading}
            onClick={() => void submit('rejected')}
          >
            Ablehnen
          </Button>
        ) : null}
      </div>
    </div>
  )
}
