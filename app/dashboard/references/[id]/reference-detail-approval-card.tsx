import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Hinweis } from '@/components/ui/hinweis'
import { ReferenceReadinessValue } from './reference-readiness-value'

export type ReferenceDetailApprovalCardProps = {
  isSalesView: boolean
  requestedByDisplay: string | null
  coordinatorDisplay: string | null
  approvingCustomerDisplay: string | null
  delegatedRecipientDisplay: string | null
  customerAccessRevoked: boolean
  approvalQuoteApproved: string | null
  approvalQuoteProposed: string | null
  approvalConsentFileUrl: string | null
}

export function ReferenceDetailApprovalCard(props: ReferenceDetailApprovalCardProps) {
  const {
    isSalesView,
    requestedByDisplay,
    coordinatorDisplay,
    approvingCustomerDisplay,
    delegatedRecipientDisplay,
    customerAccessRevoked,
    approvalQuoteApproved,
    approvalQuoteProposed,
    approvalConsentFileUrl,
  } = props

  if (isSalesView) return null

  const quote =
    !customerAccessRevoked && (approvalQuoteApproved || approvalQuoteProposed)
      ? (approvalQuoteApproved ?? approvalQuoteProposed)
      : null

  const hasMeta = Boolean(
    requestedByDisplay ||
      coordinatorDisplay ||
      approvingCustomerDisplay ||
      delegatedRecipientDisplay ||
      quote ||
      approvalConsentFileUrl,
  )
  if (!hasMeta) return null

  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Freigabe</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3 text-sm">
        <div className="min-w-0 space-y-2">
          {requestedByDisplay ? (
            <div className="flex min-w-0 items-start justify-between gap-3">
              <span className="shrink-0 pt-0.5 text-muted-foreground">Angefragt von</span>
              <ReferenceReadinessValue value={requestedByDisplay} />
            </div>
          ) : null}
          {coordinatorDisplay ? (
            <div className="flex min-w-0 items-start justify-between gap-3">
              <span className="shrink-0 pt-0.5 text-muted-foreground">
                Accountverantw.
              </span>
              <ReferenceReadinessValue value={coordinatorDisplay} />
            </div>
          ) : null}
          {approvingCustomerDisplay ? (
            <div className="flex min-w-0 items-start justify-between gap-3">
              <span className="shrink-0 pt-0.5 text-muted-foreground">Kunde</span>
              <ReferenceReadinessValue value={approvingCustomerDisplay} />
            </div>
          ) : null}
          {delegatedRecipientDisplay ? (
            <div className="flex min-w-0 items-start justify-between gap-3">
              <span className="shrink-0 pt-0.5 text-muted-foreground">
                Aktueller Empfänger
              </span>
              <ReferenceReadinessValue value={delegatedRecipientDisplay} />
            </div>
          ) : null}
        </div>
        {quote ? (
          <div className="space-y-1.5">
            <p className="text-muted-foreground">Zitat</p>
            <Hinweis>{quote}</Hinweis>
          </div>
        ) : null}
        {approvalConsentFileUrl ? (
          <a
            className="text-xs text-primary underline"
            href={approvalConsentFileUrl}
            target="_blank"
            rel="noreferrer"
          >
            Consent-Dokument ansehen
          </a>
        ) : null}
      </CardContent>
    </Card>
  )
}
