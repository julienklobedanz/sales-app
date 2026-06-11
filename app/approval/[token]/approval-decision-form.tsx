'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  quickChoiceToScope,
  scopeToQuickChoice,
  type QuickApprovalChoice,
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

  const initialChoice: QuickApprovalChoice = initialScope
    ? scopeToQuickChoice(initialScope)
    : 'named'

  const [choice, setChoice] = useState<QuickApprovalChoice>(initialChoice)
  const [referenceCallsEnabled, setReferenceCallsEnabled] = useState(
    () => initialScope?.referenceCallsEnabled ?? false
  )
  const [comment, setComment] = useState(initialComment)
  const [approvedQuote, setApprovedQuote] = useState(
    () => initialApprovedQuote.trim() || suggestedQuote
  )
  const [referenceGiverName, setReferenceGiverName] = useState(initialReferenceGiverName)
  const [referenceGiverTitle, setReferenceGiverTitle] = useState(initialReferenceGiverTitle)
  const [consentForwarding, setConsentForwarding] = useState(isApprovedMode)
  const [consentRelease, setConsentRelease] = useState(isApprovedMode)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'approved' | 'rejected' | 'updated' | null>(null)
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false)

  const grantsApproval = choice !== 'none'
  const showQuote = choice === 'named'
  const scope = useMemo(
    () => quickChoiceToScope(choice, referenceCallsEnabled),
    [choice, referenceCallsEnabled]
  )
  const canApprove = grantsApproval && consentRelease && consentForwarding

  async function submit(decision: 'approved' | 'rejected') {
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
        scope: decision === 'approved' ? scope ?? undefined : undefined,
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reference-giver-name">Name des Referenzgebers</Label>
          <Input
            id="reference-giver-name"
            value={referenceGiverName}
            onChange={(e) => setReferenceGiverName(e.target.value)}
            disabled={loading}
            placeholder="Vor- und Nachname"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference-giver-title">Ihre Position</Label>
          <Input
            id="reference-giver-title"
            value={referenceGiverTitle}
            onChange={(e) => setReferenceGiverTitle(e.target.value)}
            disabled={loading}
            placeholder="z. B. Head of IT"
          />
        </div>
      </div>

      <ApprovalQuickChoice value={choice} disabled={loading} onChange={setChoice} />

      <div className="space-y-2">
        <ApprovalOptionalLabel htmlFor="approval-comment">
          Ihre Änderungswünsche und Kommentare
        </ApprovalOptionalLabel>
        <Textarea
          id="approval-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Optional — nur wenn Sie etwas anpassen möchten …"
          className="min-h-[72px] resize-y"
          disabled={loading}
        />
      </div>

      {showQuote ? (
        <div className="space-y-2">
          <ApprovalOptionalLabel htmlFor="approved-quote">Ihr Zitat</ApprovalOptionalLabel>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Vorschlag aus Ihrer Referenz — bitte bei Bedarf anpassen oder übernehmen.
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
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <Checkbox
              id="reference-calls"
              checked={referenceCallsEnabled}
              onCheckedChange={(checked) => setReferenceCallsEnabled(checked === true)}
              disabled={loading}
              className="mt-0.5"
            />
            <Label htmlFor="reference-calls" className="cursor-pointer text-sm leading-relaxed text-foreground">
              Gerne stehe ich für Referenzanrufe anderer Kunden von {workspaceLabel} zur Verfügung.
            </Label>
          </div>

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
                weitergeleitet werden kann.
                <ApprovalRequiredMark />
              </Label>
            </div>
          </div>
        </>
      ) : null}

      <div className="space-y-3 border-t border-border pt-6">
        {grantsApproval ? (
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
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full text-base font-medium"
            disabled={loading}
            onClick={() => void submit('rejected')}
          >
            Keine Freigabe bestätigen
          </Button>
        )}

        {!isApprovedMode && grantsApproval ? (
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

        {!isApprovedMode ? (
          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
            Mit dem Klick bestätigen Sie die Nutzung gemäß des oben gewählten Freigabe-Typs.{' '}
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
                    Diese Freigabe betrifft ausschließlich die von Ihnen gewählte Nutzungsart. Inhalte
                    und Ansprechpartner stammen von {workspaceLabel}. Vertragliche oder datenschutzrechtliche
                    Details erhalten Sie auf Anfrage direkt bei Ihrem Ansprechpartner.
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
