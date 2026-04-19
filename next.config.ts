import type { NextConfig } from 'next'
import { LEGACY_REDIRECTS } from './lib/routes'

const nextConfig: NextConfig = {
  /** Default für NEXT_PUBLIC_DEV_ROLE_SWITCHER in next dev (Logik: `lib/dev-role-preview.ts`). */
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
