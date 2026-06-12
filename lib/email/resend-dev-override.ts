export type ResendRecipientResolution = {
  to: string
  devRedirected: boolean
  originalTo: string
}

/** Entwicklung: E-Mail-Versand überspringen, Freigabe-Flow trotzdem abschließen. */
export function shouldMockResendSend(): boolean {
  return (
    process.env.NODE_ENV === 'development' && process.env.RESEND_MOCK_SUCCESS === 'true'
  )
}

export function isResendSandboxRecipientError(message: string): boolean {
  return /only send testing emails to your own email/i.test(message)
}

/**
 * In Entwicklung optional alle Resend-Mails an eine verifizierte Test-Adresse leiten
 * (RESEND_DEV_OVERRIDE_TO in .env.local).
 */
export function resolveResendRecipient(intendedTo: string): ResendRecipientResolution {
  const originalTo = intendedTo.trim()
  const override = process.env.RESEND_DEV_OVERRIDE_TO?.trim()
  if (process.env.NODE_ENV === 'development' && override?.includes('@')) {
    return { to: override, devRedirected: true, originalTo }
  }
  return { to: originalTo, devRedirected: false, originalTo }
}
