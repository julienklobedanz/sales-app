import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // pdf-parse/pdfjs nativ laden — verhindert fehlgeschlagene Textextraktion nach Webpack-Bundle.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  // Referenz-KI-Import (PDF/DOCX/PPTX) per Server Action + FormData; Standard-Limit ist 1 MB.
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.brandfetch.io', pathname: '/**' },
      { protocol: 'https', hostname: 'asset.brandfetch.io', pathname: '/**' },
      { protocol: 'https', hostname: 'images.brandfetch.io', pathname: '/**' },
    ],
  },
}

export default withBundleAnalyzer(nextConfig)
