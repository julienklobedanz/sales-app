export type ResendRecipientResolution = {
  to: string
  devRedirected: boolean
  originalTo: string
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
