import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/companies',
        destination: '/dashboard/accounts',
        permanent: true,
      },
      {
        source: '/dashboard/companies/:path*',
        destination: '/dashboard/accounts/:path*',
        permanent: true,
      },
      {
        source: '/dashboard/new',
        destination: '/dashboard/evidence/new',
        permanent: true,
      },
      {
        source: '/dashboard/edit/:id',
        destination: '/dashboard/evidence/:id/edit',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.brandfetch.io', pathname: '/**' },
    ],
  },
};

export default nextConfig;
