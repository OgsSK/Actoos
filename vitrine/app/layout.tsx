import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from './components/CookieConsent';
import { ProjectProvider } from './context/ProjectContext';
import { LanguageProvider } from './context/LanguageContext';

export const metadata: Metadata = {
  title: 'Actoos — Digital infrastructure for professional activities',
  description: 'Actoos conçoit les outils, services et connexions numériques qui permettent aux organisations de fonctionner, se développer et interagir avec leur environnement.',
  keywords: ['Actoos', 'infrastructure numérique', 'outils professionnels', 'logiciels', 'Actoos Jobs'],
  authors: [{ name: 'Actoos Group' }],
  creator: 'Actoos Group',
  publisher: 'Actoos Group',
  metadataBase: new URL('https://actoos.com'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://actoos.com',
    siteName: 'Actoos',
    title: 'Actoos — Digital infrastructure for professional activities',
    description: 'Actoos conçoit les outils, services et connexions numériques pour les organisations.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Actoos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Actoos — Digital infrastructure for professional activities',
    description: 'Actoos conçoit les outils, services et connexions numériques pour les organisations.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="canonical" href="https://actoos.com/" />
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <ProjectProvider>
            {children}
            <CookieConsent />
          </ProjectProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}