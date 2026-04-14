import type { NextConfig } from 'next'
import { LEGACY_REDIRECTS } from './lib/routes'

const nextConfig: NextConfig = {
  /** In `next dev` ohne .env: Rollen-Vorschau im Profilmenü aktiv (opt-out: NEXT_PUBLIC_DEV_ROLE_SWITCHER=false). */
  env: {
    NEXT_PUBLIC_DEV_ROLE_SWITCHER:
      process.env.NEXT_PUBLIC_DEV_ROLE_SWITCHER === 'false'
        ? 'false'
        : (process.env.NEXT_PUBLIC_DEV_ROLE_SWITCHER ??
          (process.env.NODE_ENV === 'development' ? 'true' : '')),
  },
  async redirects() {
    return [...LEGACY_REDIRECTS]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.brandfetch.io', pathname: '/**' },
    ],
  },
}

export default nextConfig
