import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { AuthProvider } from '@/app/context/AuthContext';
import { LanguageProvider } from '@/app/context/LanguageContext';
import { BRAND } from '@/lib/constants';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kalanden.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: `${BRAND.name} — Trouvez le prof idéal`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    'La plateforme de mise en relation entre enseignants et parents. Trouvez un prof vérifié, à domicile ou en ligne.',

  keywords: [
    'prof particulier',
    'cours à domicile',
    'soutien scolaire',
    'professeur en ligne',
    'cours particuliers',
    'prof vérifié',
    'tutorat',
    BRAND.name,
  ],

  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,

  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: BRAND.name,
    title: `${BRAND.name} — Trouvez le prof idéal`,
    description:
      'Trouvez un prof vérifié, à domicile ou en ligne, pour votre enfant.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: BRAND.name,
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — Trouvez le prof idéal`,
    description:
      'Trouvez un prof vérifié, à domicile ou en ligne, pour votre enfant.',
    images: ['/og-image.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },

  alternates: {
    canonical: SITE_URL,
  },

  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/logo-icon.png',
    shortcut: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased bg-[#fffafa] text-slate-900">
        <Providers>
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}