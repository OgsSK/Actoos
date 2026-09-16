import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kalanden.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // API + admin (jamais indexés)
          '/api/',
          '/admin/',

          // Espaces privés
          '/dashboard/',
          '/parent/',
          '/teacher/',
          '/parents/',
          '/onboarding',
          '/suspended',

          // Pages d'auth
          '/login',
          '/register',
          '/reset-password',
          '/mot-de-passe-oublie',
        ],
      },
      {
        // Bots agressifs inutiles → bloqués
        userAgent: ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot'],
        disallow: '/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}