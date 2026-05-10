import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from './components/CookieConsent';

export const metadata: Metadata = {
  title: 'ACTOOS - Empowering Action. Delivering Progress.',
  description: 'Multi-Continental Software Factory. Nous bâtissons les infrastructures logicielles qui redéfinissent l\'efficacité des entreprises en Europe et la souveraineté financière des citoyens en Afrique.',
  keywords: ['ACTOOS', 'software', 'SaaS', 'Africa', 'Europe', 'fintech', 'field service management'],
  authors: [{ name: 'ACTOOS Group' }],
  creator: 'ACTOOS Group',
  publisher: 'ACTOOS Group',
  metadataBase: new URL('https://actoos.com'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://actoos.com',
    siteName: 'ACTOOS',
    title: 'ACTOOS - Empowering Action. Delivering Progress.',
    description: 'Multi-Continental Software Factory building digital infrastructure for Europe and Africa.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ACTOOS - Software Factory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ACTOOS - Empowering Action. Delivering Progress.',
    description: 'Multi-Continental Software Factory',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
    icons: {
    icon: [
      { url: '/favicon.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/logo-icon.png',
    shortcut: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
