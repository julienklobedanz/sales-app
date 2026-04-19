import type { NextConfig } from 'next'
import { LEGACY_REDIRECTS } from './lib/routes'

const nextConfig: NextConfig = {
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
