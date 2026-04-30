export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; error: string }

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'letmein',
  'admin123',
  'welcome123',
  'refstack',
  'changeme',
])

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const value = String(password ?? '')
  if (value.length < 12) {
    return { ok: false, error: 'Das Passwort muss mindestens 12 Zeichen lang sein.' }
  }
  if (!/[A-Z]/.test(value)) {
    return { ok: false, error: 'Das Passwort muss mindestens einen Großbuchstaben enthalten.' }
  }
  if (!/[a-z]/.test(value)) {
    return { ok: false, error: 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.' }
  }
  if (!/[0-9]/.test(value)) {
    return { ok: false, error: 'Das Passwort muss mindestens eine Zahl enthalten.' }
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return { ok: false, error: 'Das Passwort muss mindestens ein Sonderzeichen enthalten.' }
  }
  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    return { ok: false, error: 'Dieses Passwort ist zu häufig. Bitte wähle ein stärkeres Passwort.' }
  }
  return { ok: true }
}
