/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  swcMinify: true,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: false,
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
