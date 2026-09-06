import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Security headers applied to every response
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // HSTS: 2-year max-age as specified
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline'",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            "img-src 'self' data: https:",
                            "connect-src 'self' http://localhost:3001",
                            "frame-ancestors 'none'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },

    experimental: { typedRoutes: true },
};

export default nextConfig;
