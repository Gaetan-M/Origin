import type { MetadataRoute } from 'next';

const SITE_URL = 'https://my-origin-tree.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/login'],
        disallow: [
          '/api/',
          '/dashboard',
          '/persons',
          '/tree',
          '/search',
          '/connect',
          '/family-codes',
          '/invitations',
          '/kinship-probe',
          '/notifications',
          '/profile',
          '/onboarding',
          '/join',
          '/auth/otp',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
