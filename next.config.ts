import type { NextConfig } from 'next'
import { LEGACY_REDIRECTS } from './lib/routes'

const nextConfig: NextConfig = {
  // pdf-parse/pdfjs nativ laden — verhindert fehlgeschlagene Textextraktion nach Webpack-Bundle.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  // Referenz-KI-Import (PDF/DOCX/PPTX) per Server Action + FormData; Standard-Limit ist 1 MB.
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
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
