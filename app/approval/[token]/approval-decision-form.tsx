'use client'

import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckIcon } from '@/components/ui/check-icon'
import { toast } from 'sonner'
import { completeClientApproval } from './actions'
import { Input } from '@/components/ui/input'
import { ApprovalOptionalLabel, ApprovalRequiredMark } from './approval-form-labels'
import { ApprovalQuickChoice } from './approval-quick-choice'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  quickChoiceGrantsApproval,
  quickChoiceToScope,
  scopeToQuickChoice,
  type QuickApprovalChoiceValue,
} from '@/lib/references/quick-approval-choice'
import type { CustomerApprovalScopeSelection } from '@/lib/references/customer-approval-scope'

export function ApprovalDecisionForm({
  token,
  mode = 'pending',
  referenceTitle,
  orgName,
  suggestedQuote,
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
  suggestedQuote: string
  initialApprovedQuote?: string
  initialComment?: string
  initialScope?: CustomerApprovalScopeSelection
  initialReferenceGiverName?: string
  initialReferenceGiverTitle?: string
}) {
  const isApprovedMode = mode === 'approved'
  const workspaceLabel = orgName.trim() || 'unserem Partner'

  const initialChoice: QuickApprovalChoiceValue = initialScope
    ? scopeToQuickChoice(
        initialScope,
        isApprovedMode ? undefined : { hasChangeRequest: Boolean(initialComment.trim()) },
      )
    : initialComment.trim()
      ? 'changes_needed'
      : 'named'

  const [choice, setChoice] = useState<QuickApprovalChoiceValue>(initialChoice)
  const choiceManuallyChangedRef = useRef(false)
  const [referenceCallsEnabled, setReferenceCallsEnabled] = useState(
    () => initialScope?.referenceCallsEnabled ?? false,
  )
  const [comment, setComment] = useState(initialComment)
  const [approvedQuote, setApprovedQuote] = useState(
    () => initialApprovedQuote.trim() || suggestedQuote,
  )
  const [referenceGiverName, setReferenceGiverName] = useState(initialReferenceGiverName)
  const [referenceGiverTitle, setReferenceGiverTitle] = useState(
    initialReferenceGiverTitle,
  )
  const [consentForwarding, setConsentForwarding] = useState(isApprovedMode)
  const [consentRelease, setConsentRelease] = useState(isApprovedMode)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<
    'approved' | 'rejected' | 'updated' | 'changes_needed' | null
  >(null)
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false)

  const grantsApproval = quickChoiceGrantsApproval(choice)
  const isChangesNeeded = choice === 'changes_needed'
  const showQuote = choice === 'named'
  const scope = useMemo(
    () => quickChoiceToScope(choice, referenceCallsEnabled),
    [choice, referenceCallsEnabled],
  )
  const canApprove = grantsApproval && consentRelease && consentForwarding
  const canReject = Boolean(comment.trim())
  const isNoneChoice = choice === 'none'

  function handleChoiceChange(next: QuickApprovalChoiceValue) {
    choiceManuallyChangedRef.current = true
    setChoice(next)
  }

  function handleCommentChange(value: string) {
    setComment(value)
    if (value.trim() && !choiceManuallyChangedRef.current && choice !== 'none') {
      setChoice('changes_needed')
    }
  }

  const hasChoice = choice !== null

  async function submit(decision: 'approved' | 'rejected' | 'changes_needed') {
    if (decision === 'changes_needed' || decision === 'rejected') {
      if (!comment.trim()) {
        toast.error(
          decision === 'rejected'
            ? 'Bitte geben Sie einen Grund für die Ablehnung in „Änderungswünsche“ an.'
            : 'Bitte beschreiben Sie Ihre Änderungswünsche.',
        )
        return
      }
    }
    if (decision === 'approved') {
      if (!scope) return
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
        approvedQuote: showQuote ? approvedQuote.trim() || undefined : undefined,
        referenceGiverName: referenceGiverName.trim() || undefined,
        referenceGiverTitle: referenceGiverTitle.trim() || undefined,
        scope: decision === 'approved' ? (scope ?? undefined) : undefined,
      })
      if (!result.success) {
        if (result.error === 'already_decided') {
          toast.error('Diese Freigabe wurde bereits bearbeitet.')
        } else if (result.error === 'invalid_token') {
          toast.error('Dieser Link ist nicht mehr gültig.')
        } else if (result.error === 'server_config') {
          toast.error(
            'Der Server ist nicht korrekt konfiguriert. Bitte wenden Sie sich an Ihren Ansprechpartner.',
          )
        } else if (result.error === 'org_missing') {
          toast.error('Die Organisation zur Referenz konnte nicht ermittelt werden.')
        } else if (result.error === 'comment_required') {
          toast.error('Bitte beschreiben Sie Ihre Änderungswünsche.')
        } else {
          toast.error('Die Entscheidung konnte nicht gespeichert werden.')
        }
        return
      }
      setConfirmationEmailSent(result.confirmationEmailSent === true)
      if (decision === 'changes_needed') {
        setDone('changes_needed')
      } else {
        setDone(isApprovedMode ? 'updated' : decision)
      }
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
            : done === 'changes_needed'
              ? 'Ihre Änderungswünsche wurden übermittelt.'
              : done === 'approved'
                ? 'Vielen Dank — die Referenz wurde freigegeben.'
                : 'Vielen Dank — die Referenz wurde abgelehnt.'}
        </p>
        <p className="text-sm text-muted-foreground">
          {done === 'changes_needed'
            ? 'Der Ansprechpartner bei uns passt die Referenz an und meldet sich bei Ihnen.'
            : done === 'updated' || done === 'approved'
              ? confirmationEmailSent
                ? 'Sie erhalten in Kürze eine Bestätigungs-E-Mail mit Ihrem persönlichen Kontroll-Link (Sperrlink).'
                : 'Der Ansprechpartner bei uns wurde informiert.'
              : 'Sie können dieses Fenster schließen. Der Ansprechpartner bei uns wurde informiert.'}
        </p>
        <p className="pt-2 text-xs text-muted-foreground">{referenceTitle}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="reference-giver-name" className="block min-h-5 leading-5">
            Name
          </Label>
          <Input
            id="reference-giver-name"
            value={referenceGiverName}
            onChange={(e) => setReferenceGiverName(e.target.value)}
            disabled={loading}
            placeholder="Vor- und Nachname"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference-giver-title" className="block min-h-5 leading-5">
            Position
          </Label>
          <Input
            id="reference-giver-title"
            value={referenceGiverTitle}
            onChange={(e) => setReferenceGiverTitle(e.target.value)}
            disabled={loading}
            placeholder="z. B. Head of IT"
          />
        </div>
      </div>

      <ApprovalQuickChoice
        value={choice}
        disabled={loading}
        onChange={handleChoiceChange}
      />

      <div className="space-y-2">
        <ApprovalOptionalLabel htmlFor="approval-comment">
          Änderungswünsche
        </ApprovalOptionalLabel>
        <Textarea
          id="approval-comment"
          value={comment}
          onChange={(e) => handleCommentChange(e.target.value)}
          rows={2}
          placeholder="Falls Sie Änderungen wünschen."
          className="min-h-[72px] resize-y"
          disabled={loading}
        />
      </div>

      {showQuote ? (
        <div className="space-y-2">
          <ApprovalOptionalLabel htmlFor="approved-quote">
            Ihr Zitat
          </ApprovalOptionalLabel>
          <p className="text-xs leading-relaxed text-muted-foreground">
            KI-Vorschlag in 1–2 Sätzen — bitte bei Bedarf anpassen.
          </p>
          <Textarea
            id="approved-quote"
            value={approvedQuote}
            onChange={(e) => setApprovedQuote(e.target.value)}
            rows={3}
            placeholder="Ihr freigegebenes Zitat …"
            disabled={loading}
          />
        </div>
      ) : null}

      {grantsApproval ? (
        <>
          <Card className="flex flex-row items-start gap-3 p-4">
            <Checkbox
              id="reference-calls"
              checked={referenceCallsEnabled}
              onCheckedChange={(checked) => setReferenceCallsEnabled(checked === true)}
              disabled={loading}
              className="mt-0.5"
            />
            <Label
              htmlFor="reference-calls"
              className="cursor-pointer text-sm leading-relaxed text-foreground"
            >
              Gerne stehe ich für Referenzanrufe anderer Kunden von {workspaceLabel} zur
              Verfügung.
            </Label>
          </Card>

          <Card className="space-y-4 p-4">
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
                Hiermit stimme ich der Freigabe der Referenz gemäß meiner obigen Auswahl
                zu.
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
                Ich habe verstanden, dass meine freigegebene Referenz an mögliche Kunden
                von {workspaceLabel} weitergeleitet werden kann.
                <ApprovalRequiredMark />
              </Label>
            </div>
          </Card>
        </>
      ) : null}

      <div className="space-y-3 border-t border-border pt-6">
        {isChangesNeeded ? (
          <Button
            type="button"
            variant="default"
            className="h-11 w-full gap-2 bg-amber-600 text-base font-semibold hover:bg-amber-600/90"
            disabled={loading || !comment.trim()}
            onClick={() => void submit('changes_needed')}
          >
            Änderungswünsche senden
          </Button>
        ) : grantsApproval ? (
          <Button
            type="button"
            variant="default"
            className="h-11 w-full gap-2 text-base font-semibold"
            disabled={loading || !canApprove}
            onClick={() => void submit('approved')}
          >
            <CheckIcon className="size-[18px]" />
            {isApprovedMode ? 'Änderungen speichern' : 'Freigabe rechtssicher erteilen'}
          </Button>
        ) : isNoneChoice ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-red-200 text-base font-medium text-red-700 hover:bg-red-50 disabled:pointer-events-auto"
                    disabled={loading || !canReject}
                    onClick={() => void submit('rejected')}
                  >
                    Freigabe ablehnen
                  </Button>
                </span>
              </TooltipTrigger>
              {!canReject ? (
                <TooltipContent side="top" className="max-w-xs text-center">
                  Bitte geben Sie in „Änderungswünsche“ einen Grund für die Ablehnung an.
                </TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        ) : null}

        {!isApprovedMode && hasChoice ? (
          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
            Mit dem Klick bestätigen Sie die Nutzung gemäß des oben gewählten
            Freigabe-Typs.{' '}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Datenschutz- und Nutzungsbedingungen einsehen
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="center" side="top">
                <PopoverHeader>
                  <PopoverTitle>Datenschutz & Nutzung</PopoverTitle>
                  <PopoverDescription className="text-xs leading-relaxed">
                    Diese Freigabe betrifft ausschließlich die von Ihnen gewählte
                    Nutzungsart. Inhalte und Ansprechpartner stammen von {workspaceLabel}.
                    Vertragliche oder datenschutzrechtliche Details erhalten Sie auf
                    Anfrage direkt bei Ihrem Ansprechpartner.
                  </PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
            .
          </p>
        ) : null}
      </div>
    </div>
  )
}
