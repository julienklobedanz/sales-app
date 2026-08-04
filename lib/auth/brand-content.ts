import type { AuthBrandContent } from '@/components/auth-brand-panel'

const defaultAuthBrand: AuthBrandContent = {
  title: 'Stop searching, start closing.',
  description: 'Your space for references, company signals and executive insights.',
}

export const AUTH_BRAND_CONTENT = {
  login: defaultAuthBrand,
  register: defaultAuthBrand,
  forgotPassword: defaultAuthBrand,
  updatePassword: defaultAuthBrand,
} as const satisfies Record<string, AuthBrandContent>
