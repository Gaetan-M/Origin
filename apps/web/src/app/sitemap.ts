import type { MetadataRoute } from 'next';

const SITE_URL = 'https://my-origin-tree.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          fr: `${SITE_URL}/`,
          en: `${SITE_URL}/`,
        },
      },
    },
    {
      url: `${SITE_URL}/auth/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
