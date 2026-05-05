/** Mindestanzahl Ziffern, damit eine Telefonnummer für Sales akzeptiert wird (inkl. Vorwahl). */
const SALES_PHONE_MIN_DIGITS = 8

export function countPhoneDigits(value: string): number {
  return String(value ?? '').replace(/\D/g, '').length
}

export function isValidSalesPhone(value: string | null | undefined): boolean {
  return countPhoneDigits(value ?? '') >= SALES_PHONE_MIN_DIGITS
}

export function salesContactValidationMessage(): {
  phone: string
  email: string
} {
  return {
    phone: `Als Sales-Nutzer ist eine Telefonnummer mit mindestens ${SALES_PHONE_MIN_DIGITS} Ziffern erforderlich (Kundenansicht).`,
    email:
      'Als Sales-Nutzer ist eine gültige Anmelde-E-Mail erforderlich. Bitte Support kontaktieren, falls keine E-Mail hinterlegt ist.',
  }
}
