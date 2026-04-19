import type { NextConfig } from 'next'
import { LEGACY_REDIRECTS } from './lib/routes'

const nextConfig: NextConfig = {
  async redirects() {
    return [...LEGACY_REDIRECTS]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.brandfetch.io', pathname: '/**' },
      // Fallbacks für Logos aus anderen Quellen (z. B. ältere Seed-/Import-Daten)
      { protocol: 'https', hostname: 'images.brandfetch.io', pathname: '/**' },
      { protocol: 'https', hostname: 'logo.clearbit.com', pathname: '/**' },
    ],
  },
}

export default nextConfig
